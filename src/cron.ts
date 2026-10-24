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
import { describeError, generateBotPost, generateOperatorReply, type ChatLine } from './features/comms/ai'
import { findOperator, type Operator } from './features/social/operators'
import { lightDelaySeconds, type Body } from './lib/space'

// How often a colony bot posts to the feed. Each post is one DeepSpace AI call (uses credits).
const BOT_INTERVAL_MINUTES = 10

// AI operators answer direct messages. Capped per run so a spammer can't drain AI credits:
// at most 3 replies a minute, and messages that waited more than 15 minutes are skipped.
const MAX_REPLIES_PER_RUN = 3
const GIVE_UP_AFTER_MS = 15 * 60_000
// How many earlier messages the operator sees, so it can follow the conversation.
const HISTORY_SIZE = 8
// What the operator says if the AI call fails, so a colonist is never left without an answer.
const FALLBACK_REPLY = 'Signal garbled on our end. Please repeat your last transmission.'

export const tasks: CronTask[] = [
  { name: 'colony-bots', intervalMinutes: BOT_INTERVAL_MINUTES },
  { name: 'operator-replies', intervalMinutes: 1 },
]

type Dm = {
  toId: string
  content: string
  fromBody?: Body
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
      const senderBody: Body = msg.fromBody ?? 'earth'
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
