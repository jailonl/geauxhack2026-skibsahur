import type { ActionHandler } from 'deepspace/worker'
import { resolveAppRole } from 'deepspace/worker'
import type { Env } from '../../worker'
import { generateBotPost, generateOperatorReply } from '../features/comms/ai'
import { findChannel } from '../features/comms/channels'
import { lightDelaySeconds, type Body } from '../lib/space'

const BODIES: Body[] = ['earth', 'moon', 'mars', 'station']

// Simple per-user cooldown so one person can't burn through AI credits. Resets if the worker restarts.
const lastAskByUser = new Map<string, number>()
const ASK_COOLDOWN_MS = 15_000

export const actions: Record<string, ActionHandler<Env>> = {
  // POST /api/actions/summonBot — admin-only button in the feed that posts an AI bot message right away.
  summonBot: async ({ tools, userId, env }) => {
    const role = await resolveAppRole(env, userId)
    if (role !== 'admin') return { success: false, error: 'Only admins can summon bots.' }

    return tools.create('posts', await generateBotPost(env))
  },

  // POST /api/actions/askOperator — a signed-in colonist's chat message gets an AI reply from the
  // channel's operator. The reply is timestamped to arrive after the full round-trip light delay.
  askOperator: async ({ params, tools, userId, env }) => {
    if (!userId || userId.startsWith('anon-')) return { success: false, error: 'Sign in to talk to the colony AI.' }

    const channel = findChannel(String(params.channel ?? ''))
    const content = String(params.content ?? '').trim().slice(0, 500)
    const authorName = String(params.authorName ?? 'Colonist').slice(0, 60)
    const fromBody = String(params.fromBody ?? '') as Body
    const speed = Math.min(60, Math.max(1, Number(params.speed) || 1))
    const deliverAt = Number(params.deliverAt) || Date.now()

    if (!channel || !content || !BODIES.includes(fromBody)) {
      return { success: false, error: 'Bad request.' }
    }

    const now = Date.now()
    const last = lastAskByUser.get(userId) ?? 0
    if (now - last < ASK_COOLDOWN_MS) {
      return { success: false, error: 'The operator is still answering your last message. Try again in a few seconds.' }
    }
    lastAskByUser.set(userId, now)

    const reply = await generateOperatorReply(env, channel, { content, authorName, fromBody }, now)
    if (!reply) return { success: false, error: 'No answer from the operator. Try again.' }

    // The operator answers when the message arrives, then the reply travels back the same distance.
    const returnMs = (lightDelaySeconds(channel.body, fromBody, now) * 1000) / speed
    return tools.create('transmissions', {
      channel: channel.id,
      content: reply,
      authorName: channel.operator,
      fromBody: channel.body,
      deliverAt: Math.round(Math.max(deliverAt, now) + returnMs),
      speed,
      isOperator: 1,
    })
  },
}
