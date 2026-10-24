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
import { generateBotPost } from './features/comms/ai'

// How often a colony bot posts to the feed. Each post is one DeepSpace AI call (uses credits),
// so don't go much lower than this except during the demo.
const BOT_INTERVAL_MINUTES = 10

export const tasks: CronTask[] = [{ name: 'colony-bots', intervalMinutes: BOT_INTERVAL_MINUTES }]

export async function runTask(name: string, env: Env): Promise<void> {
  if (name !== 'colony-bots') return

  const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.DEEPSPACE_APP_ID}`)
  try {
    await ctx.records.create('posts', await generateBotPost(env))
  } catch (err) {
    console.error('[colony-bots] could not post:', err)
  }
}
