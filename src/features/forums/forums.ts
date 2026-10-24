// Planet forums (Reddit-style): one board per location, with threads, comments, and votes.
import { useMemo } from 'react'
import { useAuth, useMutations, useQuery } from 'deepspace'
import type { Body } from '../../lib/space'

export type Forum = { body: Body; slug: string; name: string; tagline: string; accent: string; emoji: string }

export const FORUMS: Forum[] = [
  { body: 'mars', slug: 'mars', name: 'p/Mars', tagline: 'Dust storms, rovers, and life in Jezero Crater.', accent: '#e4572e', emoji: '🔴' },
  { body: 'moon', slug: 'moon', name: 'p/Moon', tagline: 'Ice mining, regolith, and the best Earthrise views.', accent: '#a0a4b8', emoji: '🌕' },
  { body: 'earth', slug: 'earth', name: 'p/Earth', tagline: 'Mission Control, news from home, and launch talk.', accent: '#3b82f6', emoji: '🌍' },
  { body: 'station', slug: 'station', name: 'p/Station', tagline: 'Orbital life: microgravity, 16 sunrises a day.', accent: '#22c55e', emoji: '🛰' },
]

export function findForum(slug: string): Forum | undefined {
  return FORUMS.find((f) => f.slug === slug)
}

export type Thread = { forum: Body; title: string; text?: string; authorName?: string }
export type Comment = { threadId: string; parentId?: string; text: string; authorName?: string }
export type Vote = { targetId: string; value: number; userId?: string }

/** All votes, summed per thread/comment, plus my own vote on each (so clicking again undoes it). */
export function useVotes() {
  const { userId } = useAuth()
  const { records } = useQuery<Vote>('votes', { limit: 5000 })
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
