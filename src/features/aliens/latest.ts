// The newest alien posts for a given moment (see generator.ts for how one post is made).
import { SLOT_MS, collect } from '../chatter/stream'
import { alienPostForSlot, type AlienPost } from './generator'

export type AlienChatter = 'off' | 'calm' | 'lively'

// Chance that a 3-second slot holds an alien post. Lively: about one every 10 s.
const CHANCE: Record<AlienChatter, number> = { off: 0, calm: 0.08, lively: 0.3 }

export function latestAliens(slot: number, mode: AlienChatter, humanQuotes: string[], max: number): AlienPost[] {
  if (mode === 'off') return []
  return collect(slot, (s) => alienPostForSlot(s, SLOT_MS, CHANCE[mode], humanQuotes), (list) => list.length >= max)
}

/** A few short quotes from recent human posts, for the aliens to "intercept". */
export function quotesFrom(texts: string[]): string[] {
  return texts
    .map((t) => t.replace(/[#\n]/g, ' ').trim())
    .filter((t) => t.length > 0)
    .slice(0, 6)
    .map((t) => (t.length > 60 ? t.slice(0, t.lastIndexOf(' ', 60) > 20 ? t.lastIndexOf(' ', 60) : 60) + '...' : t))
}
