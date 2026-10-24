// One post: author, text, media, quoted post, location, and the action row
// (reply, repost, quote, like, delete). Reply and quote open a composer right under the post.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useR2Files } from 'deepspace'
import { BODY_LABELS } from '../../lib/space'
import UserAvatar from '../social/UserAvatar'
import type { Profiles } from '../social/profiles'
import PostComposer from './PostComposer'
import { authorOf, type FeedData, type PostStats } from './feedData'
import type { PostRecord } from './types'

type Props = {
  post: PostRecord
  profiles: Profiles
  feed: FeedData
  stats: PostStats
  canDelete: boolean
  canReact: boolean // signed in with a profile
  onToggle: (postId: string, kind: 'like' | 'repost', existingId: string | null) => void
  onDelete: (postId: string) => void
  repostedBy?: string // shown above the post when it appears as a repost
  linkToPost?: boolean // false on the post's own page
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(iso).toLocaleDateString()
}

/** The small embedded card for a quoted post. */
export function QuoteEmbed({ post, profiles }: { post: PostRecord | undefined; profiles: Profiles }) {
  if (!post) return <div className="rounded-md border p-2 text-sm text-muted-foreground">This post is unavailable.</div>
  const a = authorOf(post, profiles)
  return (
    <Link to={`/post/${post.recordId}`} className="block rounded-md border p-3 text-sm hover:bg-muted/40">
      <span className="flex items-center gap-2">
        <UserAvatar name={a.name} avatarKey={a.avatarKey} accent={a.accent} emoji={a.emoji} size={20} />
        <strong>{a.name}</strong>
        {a.handle && <span className="text-muted-foreground">@{a.handle}</span>}
      </span>
      <span className="mt-1 line-clamp-3 block whitespace-pre-wrap">{post.data.text}</span>
    </Link>
  )
}

export default function PostCard(props: Props) {
  const { post, profiles, feed, stats, canDelete, canReact, onToggle, onDelete, repostedBy, linkToPost = true } = props
  const [mode, setMode] = useState<'reply' | 'quote' | null>(null)
  const { getUrl } = useR2Files({ scope: 'app' })
  const navigate = useNavigate()
  const d = post.data
  const author = authorOf(post, profiles)
  const isAlien = d.botKind === 'alien'
  const parent = d.replyToId ? feed.byId.get(d.replyToId) : undefined
  const parentAuthor = parent ? authorOf(parent, profiles) : null

  const actionClass = 'flex items-center gap-1 rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50'

  return (
    <article className={isAlien ? 'rounded-lg border border-dashed border-primary bg-card p-4' : 'rounded-lg border bg-card p-4'}>
      {repostedBy && <p className="mb-2 text-xs text-muted-foreground">⟲ {repostedBy} reposted</p>}

      <div className="flex gap-3">
        {author.href ? (
          <Link to={author.href} aria-label={`${author.name}'s profile`}>
            <UserAvatar name={author.name} avatarKey={author.avatarKey} accent={author.accent} />
          </Link>
        ) : (
          <UserAvatar name={author.name} avatarKey={author.avatarKey} accent={author.accent} emoji={author.emoji} />
        )}

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-baseline gap-x-2">
            {author.href ? (
              <Link to={author.href} className="font-semibold hover:underline" style={{ color: author.accent }}>
                {author.name}
              </Link>
            ) : (
              <strong>{author.name}</strong>
            )}
            {author.handle && <span className="text-sm text-muted-foreground">@{author.handle}</span>}
            {d.botKind && (
              <span className={isAlien ? 'rounded-full bg-primary px-2 py-px text-xs font-semibold text-primary-foreground' : 'rounded-full border px-2 py-px text-xs text-muted-foreground'}>
                {isAlien ? 'UNVERIFIED SIGNAL' : 'BOT'}
              </span>
            )}
            <span className="text-sm text-muted-foreground">·</span>
            {linkToPost ? (
              <Link to={`/post/${post.recordId}`} className="text-sm text-muted-foreground hover:underline">
                <time dateTime={new Date(post.createdAt).toISOString()}>{timeAgo(post.createdAt)}</time>
              </Link>
            ) : (
              <time className="text-sm text-muted-foreground" dateTime={new Date(post.createdAt).toISOString()}>
                {new Date(post.createdAt).toLocaleString()}
              </time>
            )}
          </header>

          {d.replyToId && (
            <p className="text-sm text-muted-foreground">
              Replying to{' '}
              <Link to={`/post/${d.replyToId}`} className="underline">
                {parentAuthor?.handle ? `@${parentAuthor.handle}` : 'a post'}
              </Link>
            </p>
          )}

          <p className={isAlien ? 'mt-1 whitespace-pre-wrap break-words font-mono tracking-wide' : 'mt-1 whitespace-pre-wrap break-words'}>
            {d.text}
          </p>

          {d.mediaKey &&
            (d.mediaType?.startsWith('video/') ? (
              <video src={getUrl(d.mediaKey)} controls className="mt-3 max-h-96 w-full rounded-md" aria-label={d.mediaAlt} />
            ) : (
              <img src={getUrl(d.mediaKey)} alt={d.mediaAlt ?? ''} className="mt-3 max-h-96 w-full rounded-md object-cover" />
            ))}

          {d.quoteOfId && (
            <div className="mt-3">
              <QuoteEmbed post={feed.byId.get(d.quoteOfId)} profiles={profiles} />
            </div>
          )}

          {d.body && d.lat != null && d.lng != null && (
            <p className="mt-2 text-sm text-muted-foreground">
              📍 {BODY_LABELS[d.body] ?? d.body} · {d.lat.toFixed(2)}, {d.lng.toFixed(2)}{' '}
              <Link to="/map" className="underline">View map</Link>
            </p>
          )}

          <footer className="mt-2 flex flex-wrap items-center gap-1" aria-label="Post actions">
            <button
              type="button"
              className={actionClass}
              onClick={() => (canReact ? setMode(mode === 'reply' ? null : 'reply') : navigate(`/post/${post.recordId}`))}
              aria-label={`Reply, ${stats.replies} replies`}
            >
              💬 {stats.replies || ''}
            </button>
            <button
              type="button"
              className={actionClass}
              disabled={!canReact}
              onClick={() => onToggle(post.recordId, 'repost', stats.myRepostId)}
              aria-pressed={Boolean(stats.myRepostId)}
              aria-label={`Repost, ${stats.reposts} reposts`}
              style={stats.myRepostId ? { color: '#22c55e' } : undefined}
            >
              ⟲ {stats.reposts || ''}
            </button>
            <button
              type="button"
              className={actionClass}
              disabled={!canReact}
              onClick={() => setMode(mode === 'quote' ? null : 'quote')}
              aria-label="Quote post"
            >
              ❝ Quote
            </button>
            <button
              type="button"
              className={actionClass}
              disabled={!canReact}
              onClick={() => onToggle(post.recordId, 'like', stats.myLikeId)}
              aria-pressed={Boolean(stats.myLikeId)}
              aria-label={`Like, ${stats.likes} likes`}
              style={stats.myLikeId ? { color: '#ec4899' } : undefined}
            >
              {stats.myLikeId ? '♥' : '♡'} {stats.likes || ''}
            </button>
            {canDelete && (
              <button type="button" className={`${actionClass} ml-auto text-destructive`} onClick={() => onDelete(post.recordId)}>
                Delete
              </button>
            )}
          </footer>
        </div>
      </div>

      {mode && (
        <div className="mt-3">
          <PostComposer
            replyToId={mode === 'reply' ? post.recordId : undefined}
            quoteOfId={mode === 'quote' ? post.recordId : undefined}
            quotePreview={mode === 'quote' ? <QuoteEmbed post={post} profiles={profiles} /> : undefined}
            onDone={() => setMode(null)}
            autoFocus
          />
        </div>
      )}
    </article>
  )
}
