// The live alien chatter for the feed. Time is cut into 3-second slots; each slot may hold one alien post
// (see generator.ts). Every 3 seconds we look at the newest slots and return the latest few posts.
// Nothing is saved: the posts are worked out from the clock, so every viewer sees the same stream.
import { useEffect, useMemo, useState } from 'react'
import { alienPostForSlot, type AlienPost } from './generator'

export type AlienChatter = 'off' | 'calm' | 'lively'

const SLOT_MS = 3000
const CHANCE: Record<AlienChatter, number> = { off: 0, calm: 0.12, lively: 0.5 } // lively: a post about every 6 s
const LOOK_BACK = 600 // slots (30 minutes) at most

export function useAlienStream(mode: AlienChatter, humanQuotes: string[], max = 8): AlienPost[] {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (mode === 'off') return
    const id = window.setInterval(() => setNow(Date.now()), SLOT_MS)
    return () => window.clearInterval(id)
  }, [mode])

  const currentSlot = Math.floor(now / SLOT_MS)
  const quotesKey = humanQuotes.join('\n') // only recompute when the quotes actually change

  return useMemo(() => {
    if (mode === 'off') return []
    const posts: AlienPost[] = []
    for (let slot = currentSlot; slot > currentSlot - LOOK_BACK && posts.length < max; slot--) {
      const post = alienPostForSlot(slot, SLOT_MS, CHANCE[mode], humanQuotes)
      if (post) posts.push(post)
    }
    return posts
  }, [mode, currentSlot, quotesKey, max])
}

/** A few short quotes from recent human posts, for the aliens to "intercept". */
export function quotesFrom(texts: string[]): string[] {
  return texts
    .map((t) => t.replace(/[#\n]/g, ' ').trim())
    .filter((t) => t.length > 0)
    .slice(0, 6)
    .map((t) => (t.length > 60 ? t.slice(0, t.lastIndexOf(' ', 60) > 20 ? t.lastIndexOf(' ', 60) : 60) + '...' : t))
}
