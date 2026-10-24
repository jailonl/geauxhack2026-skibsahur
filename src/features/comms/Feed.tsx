// Live list of posts. useQuery stays subscribed, so new posts from anyone appear instantly.
// Signed-in users can delete their own posts; admins can delete any post (for removing spam).
import { useAuth, useMutations, useQuery, useR2Files, useUser } from 'deepspace'
import type { Post } from './types'

const BODY_LABELS: Record<string, string> = { earth: 'Earth', moon: 'Moon', mars: 'Mars', station: 'Station' }

export default function Feed() {
  const { records, status, error } = useQuery<Post>('posts', {
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

  if (status === 'loading') return <p className="text-muted-foreground">Loading transmissions...</p>
  if (status === 'error') return <p role="alert" className="text-destructive">Could not load feed: {error}</p>
  if (records.length === 0) return <p className="text-muted-foreground">No transmissions yet.</p>

  return (
    <div className="space-y-3">
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
