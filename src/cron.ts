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
import { findChannel } from './features/comms/channels'
import { lightDelaySeconds, type Body } from './lib/space'

// How often a colony bot posts to the feed. Each post is one DeepSpace AI call (uses credits).
const BOT_INTERVAL_MINUTES = 10

// Channel operators answer chat messages. Capped per run so a spammer can't drain AI credits:
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

type Transmission = {
  channel: string
  content: string
  authorName?: string
  fromBody: Body
  deliverAt: number
  speed?: number
  isOperator?: number | boolean
}
type StoredRecord<T> = { recordId: string; data: T; createdAt: string }

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
      await answerTransmissions(env, ctx)
    } catch (err) {
      console.error(`[operator-replies] failed: ${describeError(err)}`)
    }
  }
}

/** Find chat messages that have reached their channel and have the channel's AI operator answer them. */
async function answerTransmissions(env: Env, ctx: ReturnType<typeof buildCronContext>): Promise<void> {
  const now = Date.now()
  const waiting = (await ctx.records.query('transmissions', {
    where: { wantsReply: 1 },
    limit: 50,
  })) as StoredRecord<Transmission>[]

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
      await ctx.records.update('transmissions', record.recordId, { wantsReply: 0 })
      if (stale) {
        console.log(`[operator-replies] skipped ${record.recordId}: waited too long`)
        continue
      }

      const channel = findChannel(msg.channel)
      if (!channel) continue

      replies++
      const aiReply = await generateOperatorReply(
        env,
        channel,
        { content: msg.content, authorName: msg.authorName ?? 'Colonist', fromBody: msg.fromBody },
        await recentHistory(ctx, channel.id, record.recordId, msg.deliverAt),
        now,
      )

      // The reply travels back to the sender at the same speed-up they used.
      const speed = Math.min(60, Math.max(1, Number(msg.speed) || 1))
      const returnMs = (lightDelaySeconds(channel.body, msg.fromBody, now) * 1000) / speed
      await ctx.records.create('transmissions', {
        channel: channel.id,
        content: aiReply ?? FALLBACK_REPLY,
        authorName: channel.operator,
        fromBody: channel.body,
        deliverAt: Math.round(now + returnMs),
        speed,
        isOperator: 1,
        wantsReply: 0,
      })
      console.log(
        `[operator-replies] ${channel.operator} answered ${record.recordId}` +
          (aiReply ? '' : ' with the fallback (AI gave no answer)'),
      )
    } catch (err) {
      console.error(`[operator-replies] could not answer ${record.recordId}: ${describeError(err)}`)
    }
  }
}

/**
 * The channel's last few messages before this one, oldest first. One small query: the database returns
 * newest first by default, so a limit gets exactly the latest messages. Colonists' messages still in
 * transit when this one arrived are left out (the operator couldn't have read them yet); the operator's own
 * replies are always kept, since it knows what it said.
 */
async function recentHistory(
  ctx: ReturnType<typeof buildCronContext>,
  channelId: string,
  excludeRecordId: string,
  arrivedAt: number,
): Promise<ChatLine[]> {
  try {
    const latest = (await ctx.records.query('transmissions', {
      where: { channel: channelId },
      limit: HISTORY_SIZE + 4, // a little extra, since some get filtered out below
    })) as StoredRecord<Transmission>[]

    return latest
      .filter((r) => r.recordId !== excludeRecordId && (Boolean(r.data.isOperator) || r.data.deliverAt <= arrivedAt))
      .slice(0, HISTORY_SIZE)
      .reverse()
      .map((r) => ({ authorName: r.data.authorName ?? 'Colonist', content: r.data.content, fromBody: r.data.fromBody }))
  } catch (err) {
    console.error(`[operator-replies] could not load history: ${describeError(err)}`)
    return [] // answer without context rather than not at all
  }
}
