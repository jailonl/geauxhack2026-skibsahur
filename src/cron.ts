/**
 * Cron task definitions — registered into the AppCronRoom DO at construction
 * time (worker.ts). The DO alarm fires `runTask(name, env)` on the schedule
 * declared here.
 *
 * Each task declares EITHER `intervalMinutes` (run every N minutes) OR
 * `schedule` + `timezone` (5-field cron expression).
 */

import type { CronTask } from 'deepspace/worker'
import { buildCronContext } from 'deepspace/worker'
import type { Env } from '../worker'
import {
  describeError, generateBotPost, generateBotReply, generateForumComment, generateForumThread, generateOperatorReply,
  type ChatLine,
} from './features/comms/ai'
import { pickPersona, toBotPost } from './features/comms/bots'
import { colonistFor } from './features/forums/colonists'
import { FORUMS } from './features/forums/forums'
import { addPoiThreads, type Poi } from './features/forums/poiThreads'
import { botImageFor } from './features/comms/botImages'
import { findOperator, type Operator } from './features/social/operators'
import { lightDelaySeconds, type Place } from './lib/space'

// How often a colony bot posts to the feed. Each post is one DeepSpace AI call (uses credits).
const BOT_INTERVAL_MINUTES = 10
// Bot posts older than this are deleted so the feed and database stay fast (people's posts are never touched).
const BOT_POST_LIFETIME_MS = 24 * 60 * 60_000
const MAX_DELETES_PER_RUN = 25

// AI operators answer direct messages. Capped per run so a spammer can't drain AI credits:
// at most 3 replies a minute, and messages that waited more than 15 minutes are skipped.
const MAX_REPLIES_PER_RUN = 3
const GIVE_UP_AFTER_MS = 15 * 60_000
// How many earlier messages the operator sees, so it can follow the conversation.
const HISTORY_SIZE = 8
// What the operator says if the AI call fails, so a colonist is never left without an answer.
const FALLBACK_REPLY = 'Signal garbled on our end. Please repeat your last transmission.'

// Bot colonists post a new forum thread or comment this often (one AI call each).
const FORUM_CHATTER_MINUTES = 20
// Chance that a bot run also replies to a recent post by a person (one more AI call).
const BOT_REPLY_CHANCE = 0.5

export const tasks: CronTask[] = [
  { name: 'colony-bots', intervalMinutes: BOT_INTERVAL_MINUTES },
  { name: 'operator-replies', intervalMinutes: 1 },
  { name: 'forum-chatter', intervalMinutes: FORUM_CHATTER_MINUTES },
]

type Dm = {
  toId: string
  content: string
  fromBody?: Place
  deliverAt: number
  speed?: number
  isOperator?: number | boolean
  fromId?: string
}
type StoredRecord<T> = { recordId: string; data: T; createdBy: string; createdAt: string }
type Ctx = ReturnType<typeof buildCronContext>

// `deepspace dev start` sets this; the live app never does. Used to keep feed bots off local dev servers,
// so teammates' laptops don't each post AI bots on the owner's credits. "Summon a bot" still works locally.
function isLocalDev(env: Env): boolean {
  return env.ALLOW_DEBUG_ROUTES === 'true'
}

export async function runTask(name: string, env: Env): Promise<void> {
  const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.DEEPSPACE_APP_ID}`)

  if (name === 'colony-bots') {
    if (isLocalDev(env)) return
    try {
      await ctx.records.create('posts', await generateBotPost(env))
    } catch (err) {
      console.error(`[colony-bots] could not post: ${describeError(err)}`)
    }
    if (Math.random() < BOT_REPLY_CHANCE) await replyToAPerson(env, ctx)
    await deleteOldBotPosts(ctx)
    return
  }

  if (name === 'forum-chatter') {
    // New map POIs get a forum thread (no AI, so this also runs in local dev).
    try {
      await threadsForNewPois(ctx)
    } catch (err) {
      console.error(`[forum-chatter] POI threads failed: ${describeError(err)}`)
    }
    if (isLocalDev(env)) return
    try {
      await forumChatter(env, ctx)
    } catch (err) {
      console.error(`[forum-chatter] failed: ${describeError(err)}`)
    }
    return
  }

  if (name === 'operator-replies') {
    try {
      await answerOperatorDms(env, ctx)
    } catch (err) {
      console.error(`[operator-replies] failed: ${describeError(err)}`)
    }
  }
}

/** Find DMs to AI operators that have arrived, and have the operator answer them. */
async function answerOperatorDms(env: Env, ctx: Ctx): Promise<void> {
  const now = Date.now()
  const waiting = (await ctx.records.query('dms', { where: { wantsReply: 1 }, limit: 50 })) as StoredRecord<Dm>[]

  // An operator can only answer once the signal has actually arrived. Oldest arrivals first.
  const arrived = waiting.filter((r) => r.data.deliverAt <= now).sort((a, b) => a.data.deliverAt - b.data.deliverAt)
  if (arrived.length > 0) console.log(`[operator-replies] ${arrived.length} message(s) waiting for an answer`)

  let replies = 0
  for (const record of arrived) {
    const msg = record.data
    const stale = now - msg.deliverAt > GIVE_UP_AFTER_MS
    if (!stale && replies >= MAX_REPLIES_PER_RUN) break // the rest wait for next minute

    // Each message is handled on its own, so one failure never blocks the others.
    try {
      // Mark it handled first, so a slow AI call or a crash never makes the operator answer twice.
      await ctx.records.update('dms', record.recordId, { wantsReply: 0 })
      if (stale) {
        console.log(`[operator-replies] skipped ${record.recordId}: waited too long`)
        continue
      }

      const operator = findOperator(msg.toId)
      if (!operator) continue

      replies++
      const senderId = record.createdBy
      const senderBody: Place = msg.fromBody ?? 'earth'
      const senderName = await usernameOf(ctx, senderId)
      const aiReply = await generateOperatorReply(
        env,
        operator,
        { content: msg.content, authorName: senderName, fromBody: senderBody },
        await recentHistory(ctx, operator, senderId, senderName, record.recordId),
        now,
      )

      // The reply travels back to the sender at the same speed-up they used.
      const speed = Math.min(60, Math.max(1, Number(msg.speed) || 1))
      const returnMs = (lightDelaySeconds(operator.body, senderBody, now) * 1000) / speed
      const picture = botImageFor(operator.body) // sometimes one of the team's pictures (src/features/comms/botImages.ts)
      await ctx.records.create('dms', {
        toId: senderId,
        participants: [senderId], // only the colonist can read the reply
        content: aiReply ?? FALLBACK_REPLY,
        fromBody: operator.body,
        toBody: senderBody,
        deliverAt: Math.round(now + returnMs),
        speed,
        wantsReply: 0,
        isOperator: 1,
        fromId: operator.id,
        ...(picture ? { mediaKey: picture.mediaKey, mediaAlt: picture.mediaAlt } : {}),
      })
      console.log(
        `[operator-replies] ${operator.name} answered ${record.recordId}` + (aiReply ? '' : ' with the fallback (AI gave no answer)'),
      )
    } catch (err) {
      console.error(`[operator-replies] could not answer ${record.recordId}: ${describeError(err)}`)
    }
  }
}

async function usernameOf(ctx: Ctx, userId: string): Promise<string> {
  try {
    const found = (await ctx.records.query('profiles', { where: { userId }, limit: 1 })) as StoredRecord<{ username: string }>[]
    return found[0]?.data.username ?? 'Colonist'
  } catch {
    return 'Colonist'
  }
}

/**
 * The last few messages between this colonist and the operator, oldest first. Two small queries (their
 * messages to the operator, and the operator's replies to them); the database returns newest first, so a
 * limit gets exactly the latest ones.
 */
async function recentHistory(ctx: Ctx, operator: Operator, userId: string, userName: string, excludeId: string): Promise<ChatLine[]> {
  try {
    const [sent, received] = (await Promise.all([
      ctx.records.query('dms', { where: { toId: operator.id, createdBy: userId }, limit: HISTORY_SIZE + 1 }),
      ctx.records.query('dms', { where: { toId: userId, fromId: operator.id }, limit: HISTORY_SIZE }),
    ])) as [StoredRecord<Dm>[], StoredRecord<Dm>[]]

    return [...sent.filter((r) => r.recordId !== excludeId), ...received]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-HISTORY_SIZE)
      .map((r) => ({
        authorName: r.data.isOperator ? operator.name : userName,
        content: r.data.content,
        fromBody: r.data.fromBody ?? 'earth',
      }))
  } catch (err) {
    console.error(`[operator-replies] could not load history: ${describeError(err)}`)
    return [] // answer without context rather than not at all
  }
}

/** Remove bot posts older than a day, a few per run, so they never pile up. Only posts with a botKind. */
async function deleteOldBotPosts(ctx: Ctx): Promise<void> {
  try {
    const cutoff = Date.now() - BOT_POST_LIFETIME_MS
    const [system, alien] = (await Promise.all([
      ctx.records.query('posts', { where: { botKind: 'system' }, limit: 300 }),
      ctx.records.query('posts', { where: { botKind: 'alien' }, limit: 300 }),
    ])) as [StoredRecord<unknown>[], StoredRecord<unknown>[]]
    const old = [...system, ...alien]
      .filter((r) => new Date(r.createdAt).getTime() < cutoff)
      .slice(0, MAX_DELETES_PER_RUN)
    for (const r of old) await ctx.records.delete('posts', r.recordId)
    if (old.length > 0) console.log(`[colony-bots] cleaned up ${old.length} old bot post(s)`)
  } catch (err) {
    console.error(`[colony-bots] cleanup failed: ${describeError(err)}`)
  }
}

type FeedPost = { text: string; authorName?: string; botKind?: string; replyToId?: string }

/** Reply, in character, to one recent post by a person that no bot has answered yet. */
async function replyToAPerson(env: Env, ctx: Ctx): Promise<void> {
  try {
    const recent = (await ctx.records.query('posts', { limit: 60 })) as StoredRecord<FeedPost>[] // newest first
    const sixHoursAgo = Date.now() - 6 * 60 * 60_000
    const answered = new Set(recent.filter((r) => r.data.botKind && r.data.replyToId).map((r) => r.data.replyToId))
    const candidates = recent.filter(
      (r) =>
        !r.data.botKind && !r.data.replyToId && !answered.has(r.recordId) &&
        new Date(r.createdAt).getTime() > sixHoursAgo,
    )
    const target = candidates[Math.floor(Math.random() * candidates.length)]
    if (!target) return

    const persona = pickPersona()
    const reply = await generateBotReply(env, persona, { authorName: target.data.authorName ?? 'colonist', text: target.data.text })
    if (!reply) return
    await ctx.records.create('posts', { ...toBotPost(persona, reply), replyToId: target.recordId })
    console.log(`[colony-bots] ${persona.name} replied to ${target.recordId}`)
  } catch (err) {
    console.error(`[colony-bots] reply failed: ${describeError(err)}`)
  }
}

type ThreadData = { forum: string; title: string; text?: string }
type CommentData = { threadId: string; text: string; authorName?: string; botName?: string }

/** One bot colonist either starts a new thread or joins a recent one, in a random forum. */
/** Start a forum thread for up to 3 map POIs that don't have one yet (src/features/forums/poiThreads.ts). */
async function threadsForNewPois(ctx: Ctx): Promise<void> {
  const added = await addPoiThreads(
    {
      pois: async () => ((await ctx.records.query('pois', { limit: 500 })) as StoredRecord<Poi>[]).map((r) => r.data),
      threadTitles: async () => ((await ctx.records.query('threads', { limit: 2000 })) as StoredRecord<ThreadData>[]).map((r) => r.data.title),
      create: async (collection, data) => ((await ctx.records.create(collection, data)) as { recordId?: string } | null)?.recordId ?? null,
    },
    FORUMS.map((f) => f.slug),
    3,
  )
  if (added.threads > 0) console.log(`[forum-chatter] started ${added.threads} thread(s) for map POIs`)
}

async function forumChatter(env: Env, ctx: Ctx): Promise<void> {
  const forum = FORUMS[Math.floor(Math.random() * FORUMS.length)]
  const threads = (await ctx.records.query('threads', { where: { forum: forum.slug }, limit: 8 })) as StoredRecord<ThreadData>[]

  // Mostly join existing conversations; start a new thread sometimes, or when the board is empty.
  if (threads.length === 0 || Math.random() < 0.35) {
    const colonist = colonistFor(forum.slug)
    const thread = await generateForumThread(env, colonist, forum)
    if (!thread) return
    await ctx.records.create('threads', { forum: forum.slug, title: thread.title, text: thread.text, authorName: colonist.handle, botName: colonist.handle })
    console.log(`[forum-chatter] @${colonist.handle} started a thread in ${forum.name}`)
    return
  }

  const thread = threads[Math.floor(Math.random() * Math.min(threads.length, 4))] // one of the newest
  const comments = (await ctx.records.query('comments', { where: { threadId: thread.recordId }, limit: 6 })) as StoredRecord<CommentData>[]
  const recent = comments.reverse().map((c) => ({ author: c.data.botName ?? c.data.authorName ?? 'colonist', text: c.data.text }))
  const lastAuthor = recent[recent.length - 1]?.author
  const colonist = colonistFor(forum.slug, lastAuthor ? [lastAuthor] : []) // don't reply to yourself
  const text = await generateForumComment(env, colonist, forum, thread.data, recent)
  if (!text) return
  await ctx.records.create('comments', { threadId: thread.recordId, text, authorName: colonist.handle, botName: colonist.handle })
  console.log(`[forum-chatter] @${colonist.handle} commented in ${forum.name}`)
}
