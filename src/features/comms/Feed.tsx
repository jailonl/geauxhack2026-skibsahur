// The home timeline: posts and reposts, newest first, updating live, with reply previews under each post.
// Guests can read everything; posting, replying, quoting, liking, and reposting need an account.
// Tabs show one world's tagged posts; bots follow the Settings toggle; admins can summon a bot or delete any post.
import { useState } from 'react'
import { getAuthToken, useAuth, useMutations, useUser } from 'deepspace'
import { BODY_LABELS, PLANET_COLORS } from '../../lib/space'
import { updateSettings, useSettings } from '../settings/settings'
import { useMyProfile, useProfiles } from '../social/profiles'
import PostCard from './PostCard'
import PostComposer from './PostComposer'
import { useFeedData, useReactionActions } from './feedData'
import type { Body, Post, PostRecord } from './types'

const TABS: (Body | 'all')[] = ['all', 'mars', 'moon', 'earth', 'station']

type FeedItem = { key: string; post: PostRecord; at: string; repostedBy?: { label: string; href?: string } }

export default function Feed() {
  const [tab, setTab] = useState<Body | 'all'>('all')
  const [summoning, setSummoning] = useState(false)
  const { showBots } = useSettings()

  const feed = useFeedData()
  const profiles = useProfiles()
  const { profile: me } = useMyProfile()
  const { userId } = useAuth()
  const { user } = useUser()
  const { remove } = useMutations<Post>('posts')
  const reactions = useReactionActions()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  // Timeline = original posts (not replies) plus reposts, each placed at the time it happened.
  const items: FeedItem[] = []
  for (const p of feed.posts) {
    if (!p.data.replyToId) items.push({ key: p.recordId, post: p, at: p.createdAt })
  }
  for (const r of feed.reposts) {
    const post = feed.byId.get(r.data.targetId)
    if (!post) continue
    const who = profiles.byUserId.get(r.createdBy)
    const isMe = userId != null && r.createdBy === userId
    items.push({
      key: `repost-${r.recordId}`,
      post,
      at: r.createdAt,
      repostedBy: { label: isMe ? 'You' : who ? `@${who.username}` : 'Someone', href: who ? `/u/${who.username}` : undefined },
    })
  }
  const visible = items
    .filter((i) => tab === 'all' || i.post.data.body === tab)
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
      {/* Header: title, world filter, bot toggle */}
      <header className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <h1 className="font-display text-3xl leading-none">The feed</h1>
          <p className="mt-1 text-sm text-muted-foreground">Transmissions from every colony, as they arrive.</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
            <input
              type="checkbox"
              checked={showBots}
              onChange={(e) => updateSettings({ showBots: e.target.checked })}
              className="accent-[var(--color-primary)]"
            />
            Show bots
          </label>
          {isAdmin && (
            <button type="button" onClick={onSummonBot} disabled={summoning} className="font-bold text-primary hover:underline disabled:opacity-50">
              {summoning ? 'Summoning...' : 'Summon a bot'}
            </button>
          )}
        </div>
      </header>

      <nav aria-label="Filter by world" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = tab === t
          const color = t === 'all' ? 'var(--color-primary)' : PLANET_COLORS[t]
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={active}
              className="flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold transition-colors"
              style={
                active
                  ? { background: `color-mix(in srgb, ${color} 22%, transparent)`, borderColor: color, color: 'var(--color-foreground)' }
                  : { borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }
              }
            >
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
              {t === 'all' ? 'Every world' : BODY_LABELS[t]}
            </button>
          )
        })}
      </nav>

      <PostComposer compact />

      {feed.status === 'loading' && <p className="py-6 text-muted-foreground">Tuning in to the colony feed...</p>}
      {feed.status === 'error' && <p role="alert" className="py-6 text-destructive">Could not load the feed: {feed.error}</p>}
      {feed.status === 'ready' && visible.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border py-10 text-center text-muted-foreground">
          {tab === 'all' ? 'No transmissions yet. Be the first to post.' : `Nothing tagged ${BODY_LABELS[tab]} yet. Tag a location when you post.`}
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
          showReplyPreview
        />
      ))}
    </div>
  )
}
