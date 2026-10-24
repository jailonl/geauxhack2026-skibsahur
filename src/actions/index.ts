import type { ActionHandler } from 'deepspace/worker'
import { resolveAppRole } from 'deepspace/worker'
import type { Env } from '../../worker'
import { generateBotPost } from '../features/comms/ai'

export const actions: Record<string, ActionHandler<Env>> = {
  // POST /api/actions/summonBot — admin-only button in the feed that posts an AI bot message right away.
  summonBot: async ({ tools, userId, env }) => {
    const role = await resolveAppRole(env, userId)
    if (role !== 'admin') return { success: false, error: 'Only admins can summon bots.' }

    return tools.create('posts', await generateBotPost(env))
  },

}
