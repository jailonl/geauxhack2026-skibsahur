// Planet forums (Reddit-style): one board per location, with threads, comments, and votes.
import { useMemo } from 'react'
import { useAuth, useMutations, useQuery } from 'deepspace'
import type { Body } from '../../lib/space'

export type ForumCategory = 'worlds' | 'colonies' | 'lounges'

export type Forum = {
  slug: string // also the value stored on each thread
  name: string
  tagline: string
  accent: string
  glyph: string
  category: ForumCategory
  body?: Body // set for the four home worlds
}

export const CATEGORY_LABELS: Record<ForumCategory, { title: string; blurb: string }> = {
  worlds: { title: 'Home worlds', blurb: 'Where most colonists live today.' },
  colonies: { title: 'Outer colonies', blurb: 'Fictional settlements across the solar system and beyond.' },
  lounges: { title: 'Lounges', blurb: 'Off-topic chat, help, and everything in between.' },
}

// Keep in sync with FORUM_SLUGS in src/schemas/social-schemas.ts (the server only accepts these).
export const FORUMS: Forum[] = [
  { slug: 'mars', name: 'p/Mars', tagline: 'Dust storms, rovers, and life in Jezero Crater.', accent: '#e4572e', glyph: '♂', category: 'worlds', body: 'mars' },
  { slug: 'moon', name: 'p/Moon', tagline: 'Ice mining, regolith, and the best Earthrise views.', accent: '#a0a4b8', glyph: '☾', category: 'worlds', body: 'moon' },
  { slug: 'earth', name: 'p/Earth', tagline: 'Mission Control, news from home, and launch talk.', accent: '#3b82f6', glyph: '⊕', category: 'worlds', body: 'earth' },
  { slug: 'station', name: 'p/Orbit', tagline: 'Station life: microgravity and 16 sunrises a day.', accent: '#22c55e', glyph: '◎', category: 'worlds', body: 'station' },

  { slug: 'europa', name: 'p/EuropaDeep', tagline: 'The under-ice research town on Jupiter\'s moon Europa.', accent: '#7dd3fc', glyph: '❄', category: 'colonies' },
  { slug: 'titan', name: 'p/TitanDocks', tagline: 'Methane-lake harbor on Saturn\'s moon Titan. Bring a heater.', accent: '#f59e0b', glyph: '⛭', category: 'colonies' },
  { slug: 'ceres', name: 'p/CeresRing', tagline: 'Mining ring station in the asteroid belt.', accent: '#a78bfa', glyph: '◌', category: 'colonies' },
  { slug: 'ganymede', name: 'p/GanymedeGreens', tagline: 'Greenhouse domes under Jupiter\'s magnetic field.', accent: '#4ade80', glyph: '❦', category: 'colonies' },
  { slug: 'kuiper', name: 'p/KuiperDrift', tagline: 'Long-haul crews at the edge of the solar system.', accent: '#94a3b8', glyph: '⋯', category: 'colonies' },
  { slug: 'proxima', name: 'p/ProximaB', tagline: 'The first settlement around another star. 4.2 light-years from home.', accent: '#f472b6', glyph: '✦', category: 'colonies' },

  { slug: 'random', name: 'p/Random', tagline: 'Anything goes. Off-topic chat from every colony.', accent: '#ffb454', glyph: '✳', category: 'lounges' },
  { slug: 'askacolonist', name: 'p/AskAColonist', tagline: 'New to off-world life? Ask the people who live it.', accent: '#38bdf8', glyph: '?', category: 'lounges' },
  { slug: 'spacekitchen', name: 'p/SpaceKitchen', tagline: 'Ration hacks, hydroponic recipes, and zero-g cooking fails.', accent: '#fb923c', glyph: '♨', category: 'lounges' },
  { slug: 'hydroponics', name: 'p/Hydroponics', tagline: 'Growing food where nothing grows.', accent: '#84cc16', glyph: '❀', category: 'lounges' },
  { slug: 'signals', name: 'p/Signals', tagline: 'Unexplained sightings, strange transmissions, and theories.', accent: '#c084fc', glyph: '◉', category: 'lounges' },
  { slug: 'zerogmemes', name: 'p/ZeroGMemes', tagline: 'Jokes that only make sense at 0.38 g.', accent: '#facc15', glyph: '☺', category: 'lounges' },
]

export function findForum(slug: string): Forum | undefined {
  return FORUMS.find((f) => f.slug === slug)
}

export type Thread = { forum: string; title: string; text?: string; authorName?: string; botName?: string }
export type Comment = { threadId: string; parentId?: string; text: string; authorName?: string; botName?: string }
export type Vote = { targetId: string; value: number; userId?: string }

/** All votes, summed per thread/comment, plus my own vote on each (so clicking again undoes it). */
export function useVotes() {
  const { userId } = useAuth()
  const { records } = useQuery<Vote>('votes', { limit: 2000 })
  const { ready, create, put, remove } = useMutations<Vote>('votes')

  const tally = useMemo(() => {
    const score = new Map<string, number>()
    const mine = new Map<string, { recordId: string; value: number }>()
    for (const r of records) {
      score.set(r.data.targetId, (score.get(r.data.targetId) ?? 0) + r.data.value)
      if (userId && r.createdBy === userId) mine.set(r.data.targetId, { recordId: r.recordId, value: r.data.value })
    }
    return { score, mine }
  }, [records, userId])

  return {
    ready,
    score: (id: string) => tally.score.get(id) ?? 0,
    myVote: (id: string) => tally.mine.get(id)?.value ?? 0,
    vote(id: string, value: 1 | -1) {
      const existing = tally.mine.get(id)
      if (!existing) return create({ targetId: id, value })
      if (existing.value === value) return remove(existing.recordId) // same arrow again = undo
      return put(existing.recordId, { value })
    },
  }
}

export type Votes = ReturnType<typeof useVotes>
