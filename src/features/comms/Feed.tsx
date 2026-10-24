// The home feed: top-level posts and reposts, newest first, updating live.
// Guests can read everything; posting, replying, quoting, liking, and reposting need an account.
// Filters show one planet's tagged posts; bots can be hidden; admins can summon a bot or delete any post.
import { useState } from 'react'
import { getAuthToken, useAuth, useMutations, useUser } from 'deepspace'
import { BODY_LABELS } from '../../lib/space'
import { useMyProfile, useProfiles } from '../social/profiles'
import PostCard from './PostCard'
import PostComposer from './PostComposer'
import { useFeedData, useReactionActions } from './feedData'
import type { Body, Post, PostRecord } from './types'

const FILTERS: (Body | 'all')[] = ['all', 'mars', 'moon', 'earth', 'station']

type FeedItem = { key: string; post: PostRecord; at: string; repostedBy?: string }

export default function Feed() {
  const [filter, setFilter] = useState<Body | 'all'>('all')
  const [showBots, setShowBots] = useState(true)
  const [summoning, setSummoning] = useState(false)

  const feed = useFeedData()
  const profiles = useProfiles()
  const { profile: me } = useMyProfile()
  const { userId } = useAuth()
  const { user } = useUser()
  const { remove } = useMutations<Post>('posts')
  const reactions = useReactionActions()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  // Build the timeline: original posts (not replies) plus reposts, each at its own time.
  const items: FeedItem[] = []
  for (const p of feed.posts) {
    if (!p.data.replyToId) items.push({ key: p.recordId, post: p, at: p.createdAt })
  }
  for (const r of feed.reposts) {
    const post = feed.byId.get(r.data.targetId)
    if (!post) continue
    const who = profiles.byUserId.get(r.createdBy)
    items.push({ key: `repost-${r.recordId}`, post, at: r.createdAt, repostedBy: who ? `@${who.username}` : 'Someone' })
  }
  const visible = items
    .filter((i) => filter === 'all' || i.post.data.body === filter)
    .filter((i) => showBots || !i.post.data.botKind)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  async function onDelete(postId: string) {
    if (!window.confirm('Delete this post?')) return
    try {
      await remove(postId)
    } catch (err) {
      window.alert('Delete failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  function onToggle(postId: string, kind: 'like' | 'repost', existingId: string | null) {
    reactions.toggle(postId, kind, existingId)?.catch((err: unknown) => {
      window.alert('Could not update: ' + (err instanceof Error ? err.message : String(err)))
    })
  }

  // Admin-only: ask the server to post one bot message right now (src/actions/index.ts).
  async function onSummonBot() {
    setSummoning(true)
    try {
      const res = await fetch('/api/actions/summonBot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getAuthToken()}` },
        body: '{}',
      })
      const result = (await res.json()) as { success: boolean; error?: string }
      if (!result.success) window.alert('Could not summon bot: ' + (result.error ?? 'unknown error'))
    } catch (err) {
      window.alert('Could not summon bot: ' + (err instanceof Error ? err.message : String(err)))
    }
    setSummoning(false)
  }

  return (
    <div className="space-y-3">
      <PostComposer />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Filter posts by location" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={
                filter === f
                  ? 'rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground'
                  : 'rounded-full border px-3 py-1 text-sm'
              }
            >
              {f === 'all' ? 'All' : BODY_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={showBots} onChange={(e) => setShowBots(e.target.checked)} />
            Show bots
          </label>
          {isAdmin && (
            <button type="button" onClick={onSummonBot} disabled={summoning} className="underline disabled:opacity-50">
              {summoning ? 'Summoning...' : 'Summon a bot'}
            </button>
          )}
        </div>
      </div>

      {feed.status === 'loading' && <p className="text-muted-foreground">Loading transmissions...</p>}
      {feed.status === 'error' && <p role="alert" className="text-destructive">Could not load feed: {feed.error}</p>}
      {feed.status === 'ready' && visible.length === 0 && (
        <p className="text-muted-foreground">
          {filter === 'all' ? 'No transmissions yet.' : `No posts tagged ${BODY_LABELS[filter]} yet.`}
        </p>
      )}

      {visible.map((item) => (
        <PostCard
          key={item.key}
          post={item.post}
          profiles={profiles}
          feed={feed}
          stats={feed.stats(item.post.recordId)}
          canDelete={isAdmin || (userId != null && item.post.createdBy === userId)}
          canReact={Boolean(me)}
          onToggle={onToggle}
          onDelete={onDelete}
          repostedBy={item.repostedBy}
        />
      ))}
    </div>
  )
}
