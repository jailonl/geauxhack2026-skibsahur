// Live list of posts. useQuery stays subscribed, so new posts from anyone appear instantly.
// Signed-in users can delete their own posts; admins can delete any post (for removing spam).
// The filter buttons show only posts tagged with one planet/station.
import { useState } from 'react'
import { useAuth, useMutations, useQuery, useR2Files, useUser } from 'deepspace'
import type { Body, Post } from './types'

const BODY_LABELS: Record<string, string> = { earth: 'Earth', moon: 'Moon', mars: 'Mars', station: 'Station' }
const FILTERS: (Body | 'all')[] = ['all', 'mars', 'moon', 'earth', 'station']

export default function Feed() {
  const [filter, setFilter] = useState<Body | 'all'>('all')

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

  async function onDelete(recordId: string) {
    if (!window.confirm('Delete this post?')) return
    try {
      await remove(recordId)
    } catch (err) {
      window.alert('Delete failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="space-y-3">
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

      {status === 'loading' && <p className="text-muted-foreground">Loading transmissions...</p>}
      {status === 'error' && <p role="alert" className="text-destructive">Could not load feed: {error}</p>}
      {status === 'ready' && records.length === 0 && (
        <p className="text-muted-foreground">
          {filter === 'all' ? 'No transmissions yet.' : `No posts tagged ${BODY_LABELS[filter]} yet.`}
        </p>
      )}

      {records.map((r) => {
        const post = r.data // your own fields live under .data
        const canDelete = ready && (isAdmin || (userId != null && r.createdBy === userId))

        return (
          <article key={r.recordId} className="rounded-lg border bg-card p-4">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <strong>@{post.authorName ?? 'unknown'}</strong>
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

            <p className="mt-2 whitespace-pre-wrap">{post.text}</p>

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
