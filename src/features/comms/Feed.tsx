// Live list of posts. useQuery stays subscribed, so new posts from anyone appear instantly.
// Signed-in users can delete their own posts; admins can delete any post (for removing spam).
// Filter buttons show only posts tagged with one planet/station; bots can be hidden.
import { useState } from 'react'
import { getAuthToken, useAuth, useMutations, useQuery, useR2Files, useUser } from 'deepspace'
import { BODY_LABELS } from '../../lib/space'
import type { Body, Post } from './types'

const FILTERS: (Body | 'all')[] = ['all', 'mars', 'moon', 'earth', 'station']

export default function Feed() {
  const [filter, setFilter] = useState<Body | 'all'>('all')
  const [showBots, setShowBots] = useState(true)
  const [summoning, setSummoning] = useState(false)

  const { records, status, error } = useQuery<Post>('posts', {
    // No "where" = every post; otherwise only posts tagged with that body.
    ...(filter === 'all' ? {} : { where: { body: filter } }),
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 50,
  })
  const { getUrl } = useR2Files({ scope: 'app' })
  const { ready, remove } = useMutations<Post>('posts')
  const { userId } = useAuth()
  const { user } = useUser()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  const visible = showBots ? records : records.filter((r) => !r.data.botKind)

  async function onDelete(recordId: string) {
    if (!window.confirm('Delete this post?')) return
    try {
      await remove(recordId)
    } catch (err) {
      window.alert('Delete failed: ' + (err instanceof Error ? err.message : String(err)))
    }
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

      {status === 'loading' && <p className="text-muted-foreground">Loading transmissions...</p>}
      {status === 'error' && <p role="alert" className="text-destructive">Could not load feed: {error}</p>}
      {status === 'ready' && visible.length === 0 && (
        <p className="text-muted-foreground">
          {filter === 'all' ? 'No transmissions yet.' : `No posts tagged ${BODY_LABELS[filter]} yet.`}
        </p>
      )}

      {visible.map((r) => {
        const post = r.data // your own fields live under .data
        const canDelete = ready && (isAdmin || (userId != null && r.createdBy === userId))
        const isAlien = post.botKind === 'alien'

        return (
          <article
            key={r.recordId}
            className={
              isAlien
                ? 'rounded-lg border border-dashed border-primary bg-card p-4'
                : 'rounded-lg border bg-card p-4'
            }
          >
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="flex flex-wrap items-baseline gap-2">
                <strong>@{post.authorName ?? 'unknown'}</strong>
                {post.botKind && (
                  <span
                    className={
                      isAlien
                        ? 'rounded-full bg-primary px-2 py-px text-xs font-semibold text-primary-foreground'
                        : 'rounded-full border px-2 py-px text-xs text-muted-foreground'
                    }
                  >
                    {isAlien ? 'UNVERIFIED SIGNAL' : 'BOT'}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3">
                <time className="text-sm text-muted-foreground" dateTime={new Date(r.createdAt).toISOString()}>
                  {new Date(r.createdAt).toLocaleString()}
                </time>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(r.recordId)}
                    className="text-sm text-destructive underline"
                    aria-label={`Delete post by ${post.authorName ?? 'unknown'}`}
                  >
                    Delete
                  </button>
                )}
              </span>
            </header>

            <p className={isAlien ? 'mt-2 whitespace-pre-wrap font-mono tracking-wide' : 'mt-2 whitespace-pre-wrap'}>
              {post.text}
            </p>

            {post.mediaKey &&
              (post.mediaType?.startsWith('video/') ? (
                <video src={getUrl(post.mediaKey)} controls className="mt-3 max-h-96 w-full rounded-md" aria-label={post.mediaAlt} />
              ) : (
                <img src={getUrl(post.mediaKey)} alt={post.mediaAlt ?? ''} className="mt-3 max-h-96 w-full rounded-md object-cover" />
              ))}

            {post.body && post.lat != null && post.lng != null && (
              <p className="mt-2 text-sm text-muted-foreground">
                {BODY_LABELS[post.body] ?? post.body} · {post.lat.toFixed(2)}, {post.lng.toFixed(2)}
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}
