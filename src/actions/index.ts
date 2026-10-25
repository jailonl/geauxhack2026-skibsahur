import type { ActionHandler } from 'deepspace/worker'
import { resolveAppRole } from 'deepspace/worker'
import type { Env } from '../../worker'
import { generateBotPost } from '../features/comms/ai'
import { SEED_THREADS } from '../features/forums/seed'

export const actions: Record<string, ActionHandler<Env>> = {
  // POST /api/actions/summonBot — admin-only button in the feed that posts an AI bot message right away.
  summonBot: async ({ tools, userId, env }) => {
    const role = await resolveAppRole(env, userId)
    if (role !== 'admin') return { success: false, error: 'Only admins can summon bots.' }

    return tools.create('posts', await generateBotPost(env))
  },

  // POST /api/actions/seedForums — admin-only: fills every forum with starter conversations from the bot
  // colonists (fixed text in src/features/forums/seed.ts, no AI credits). Skips threads that already exist.
  seedForums: async ({ tools, userId, env }) => {
    const role = await resolveAppRole(env, userId)
    if (role !== 'admin') return { success: false, error: 'Only admins can seed the forums.' }

    const existing = await tools.query<{ title: string }>('threads', { limit: 2000 })
    const titles = new Set((existing.data?.records ?? []).map((r) => r.data.title))
    let threads = 0
    let comments = 0
    for (const seed of SEED_THREADS) {
      if (titles.has(seed.title)) continue
      const made = await tools.create('threads', {
        forum: seed.forum, title: seed.title, text: seed.text, authorName: seed.by, botName: seed.by,
      })
      const threadId = made.data?.recordId
      if (!made.success || !threadId) continue
      threads++
      for (const c of seed.comments) {
        const ok = await tools.create('comments', { threadId, text: c.text, authorName: c.by, botName: c.by })
        if (ok.success) comments++
      }
    }
    return { success: true, data: { threads, comments } }
  },

}
