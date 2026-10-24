// Loads posts + likes/reposts once and derives everything the feed needs: counts, who liked what,
// quoted posts, and reply counts. One query per collection, shared by every card on the page.
import { useMemo } from 'react'
import { useAuth, useMutations, useQuery } from 'deepspace'
import type { Profiles } from '../social/profiles'
import type { Post, PostRecord } from './types'

export type Reaction = { targetId: string; kind: 'like' | 'repost'; userId?: string }
type ReactionRecord = { recordId: string; data: Reaction; createdBy: string; createdAt: string }

export type PostStats = {
  replies: number
  likes: number
  reposts: number
  myLikeId: string | null // my reaction record ids, so a second click can undo
  myRepostId: string | null
}

const EMPTY_STATS: PostStats = { replies: 0, likes: 0, reposts: 0, myLikeId: null, myRepostId: null }

export function useFeedData(limit = 150) {
  const { userId } = useAuth()
  const posts = useQuery<Post>('posts', { orderBy: 'createdAt', orderDir: 'desc', limit })
  const reactions = useQuery<Reaction>('reactions', { orderBy: 'createdAt', orderDir: 'desc', limit: 2000 })

  return useMemo(() => {
    const postRecords = posts.records as PostRecord[]
    const reactionRecords = reactions.records as ReactionRecord[]
    const byId = new Map<string, PostRecord>()
    const stats = new Map<string, PostStats>()
    const statsFor = (id: string) => {
      let s = stats.get(id)
      if (!s) stats.set(id, (s = { ...EMPTY_STATS }))
      return s
    }

    for (const p of postRecords) {
      byId.set(p.recordId, p)
      if (p.data.replyToId) statsFor(p.data.replyToId).replies++
    }
    for (const r of reactionRecords) {
      const s = statsFor(r.data.targetId)
      const mine = userId != null && r.createdBy === userId
      if (r.data.kind === 'like') {
        s.likes++
        if (mine) s.myLikeId = r.recordId
      } else {
        s.reposts++
        if (mine) s.myRepostId = r.recordId
      }
    }

    return {
      posts: postRecords,
      reposts: reactionRecords.filter((r) => r.data.kind === 'repost'),
      byId,
      stats: (id: string) => stats.get(id) ?? EMPTY_STATS,
      status: posts.status === 'error' || reactions.status === 'error' ? 'error' : posts.status,
      error: posts.error ?? reactions.error,
    }
  }, [posts.records, posts.status, posts.error, reactions.records, reactions.status, reactions.error, userId])
}

export type FeedData = ReturnType<typeof useFeedData>

/** Like/repost toggles: create the reaction, or delete mine if it's already there. */
export function useReactionActions() {
  const { ready, create, remove } = useMutations<Reaction>('reactions')
  return {
    ready,
    toggle(postId: string, kind: 'like' | 'repost', existingId: string | null) {
      if (existingId) return remove(existingId)
      return create({ targetId: postId, kind })
    },
  }
}

/** Name, handle, picture, and link for whoever wrote a post (person, bot, or old guest post). */
export function authorOf(post: PostRecord, profiles: Profiles) {
  const d = post.data
  if (d.botKind) {
    return {
      name: d.authorName ?? 'Unknown bot',
      handle: null,
      avatarKey: undefined,
      accent: d.botKind === 'alien' ? '#a855f7' : '#64748b',
      emoji: d.botKind === 'alien' ? '◉' : '⚙',
      href: null,
    }
  }
  const p = profiles.byUserId.get(post.createdBy)
  if (p) {
    return {
      name: p.displayName || p.username,
      handle: p.username,
      avatarKey: p.avatarKey,
      accent: p.accent,
      emoji: undefined,
      href: `/u/${p.username}`,
    }
  }
  return { name: d.authorName ?? 'unknown', handle: null, avatarKey: undefined, accent: undefined, emoji: undefined, href: null }
}
