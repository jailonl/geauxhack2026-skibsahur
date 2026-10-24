// One post in the timeline: author, text, media, quoted post, location, actions, and a preview of
// the latest replies. Clicking anywhere on the post (except a button or link) opens its full thread.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useR2Files } from 'deepspace'
import { Heart, ImageOff, MessageCircle, Quote, Repeat2, Trash2, Volume2 } from 'lucide-react'
import { BODY_LABELS, PLANET_COLORS } from '../../lib/space'
import { speak, useSettings } from '../settings/settings'
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
  repostedBy?: { label: string; href?: string } // shown above the post when it appears as a repost
  linkToPost?: boolean // false on the post's own page
  showReplyPreview?: boolean // show the latest replies under the post (timeline only)
  isReplyPreview?: boolean // this card IS a reply preview: smaller, no nested previews
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** True when a click landed on something interactive inside the card (so the card shouldn't navigate). */
function clickedControl(e: React.MouseEvent): boolean {
  return Boolean((e.target as HTMLElement).closest('a,button,video,input,textarea,select,label,form'))
}

/** The small embedded card for a quoted post. */
export function QuoteEmbed({ post, profiles }: { post: PostRecord | undefined; profiles: Profiles }) {
  if (!post) return <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">This post is unavailable.</div>
  const a = authorOf(post, profiles)
  return (
    <Link to={`/post/${post.recordId}`} className="block rounded-xl border border-border p-3 text-sm hover:bg-accent/40">
      <span className="flex items-center gap-2">
        <UserAvatar name={a.name} avatarKey={a.avatarKey} accent={a.accent} emoji={a.emoji} size={20} />
        <strong>{a.name}</strong>
        {a.handle && <span className="text-muted-foreground">@{a.handle}</span>}
      </span>
      <span className="mt-1 line-clamp-3 block whitespace-pre-wrap">{post.data.text}</span>
    </Link>
  )
}

/** Photo or video, respecting the bandwidth saver setting. */
function Media({ mediaKey, mediaType, alt, compact }: { mediaKey: string; mediaType?: string; alt?: string; compact: boolean }) {
  const { getUrl } = useR2Files({ scope: 'app' })
  const { bandwidthSaver } = useSettings()
  const [loaded, setLoaded] = useState(!bandwidthSaver)
  const isVideo = mediaType?.startsWith('video/')
  const height = compact ? 'max-h-56' : 'max-h-[28rem]'

  if (!loaded) {
    return (
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-sm text-muted-foreground hover:bg-accent/40"
      >
        <ImageOff className="h-4 w-4" aria-hidden />
        Bandwidth saver: tap to load {isVideo ? 'video' : 'photo'}
      </button>
    )
  }
  return isVideo ? (
    <video src={getUrl(mediaKey)} controls preload="metadata" className={`mt-3 w-full rounded-xl border border-border ${height}`} aria-label={alt} />
  ) : (
    <img src={getUrl(mediaKey)} alt={alt ?? ''} loading="lazy" decoding="async" className={`mt-3 w-full rounded-xl border border-border object-cover ${height}`} />
  )
}

export default function PostCard(props: Props) {
  const {
    post, profiles, feed, stats, canDelete, canReact, onToggle, onDelete, repostedBy,
    linkToPost = true, showReplyPreview = false, isReplyPreview = false,
  } = props
  const [mode, setMode] = useState<'reply' | 'quote' | null>(null)
  const settings = useSettings()
  const navigate = useNavigate()
  const d = post.data
  const author = authorOf(post, profiles)
  const isAlien = d.botKind === 'alien'
  const parent = d.replyToId ? feed.byId.get(d.replyToId) : undefined
  const parentAuthor = parent ? authorOf(parent, profiles) : null
  const replies = showReplyPreview ? feed.repliesTo(post.recordId) : []
  const compact = settings.compactPosts || isReplyPreview
  const avatarSize = compact ? 32 : 44

  function openThread(e: React.MouseEvent) {
    if (!linkToPost || clickedControl(e) || window.getSelection()?.toString()) return
    e.stopPropagation() // a click on a reply preview opens that reply, not the parent
    navigate(`/post/${post.recordId}`)
  }

  const action = 'group flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-muted-foreground transition-colors disabled:opacity-40'

  return (
    <>
      <article
        onClick={openThread}
        className={`${isReplyPreview ? '' : 'border-b border-border'} ${linkToPost ? 'cursor-pointer hover:bg-accent/25' : ''} ${compact ? 'px-4 py-2.5' : 'px-4 py-3.5'}`}
        style={isAlien ? { boxShadow: 'inset 3px 0 0 #a855f7' } : undefined}
      >
        {repostedBy && (
          <p className="mb-1 flex items-center gap-1.5 pl-8 text-sm font-bold text-muted-foreground">
            <Repeat2 className="h-4 w-4" aria-hidden />
            {repostedBy.href ? <Link to={repostedBy.href} className="hover:underline">{repostedBy.label} reposted</Link> : `${repostedBy.label} reposted`}
          </p>
        )}

        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            {author.href ? (
              <Link to={author.href} aria-label={`${author.name}'s profile`}>
                <UserAvatar name={author.name} avatarKey={author.avatarKey} accent={author.accent} size={avatarSize} />
              </Link>
            ) : (
              <UserAvatar name={author.name} avatarKey={author.avatarKey} accent={author.accent} emoji={author.emoji} size={avatarSize} />
            )}
            {/* thread line down to the reply previews */}
            {replies.length > 0 && <span aria-hidden className="mt-1 w-0.5 flex-1 rounded bg-border" />}
          </div>

          <div className="min-w-0 flex-1">
            <header className="flex flex-wrap items-baseline gap-x-1.5">
              {author.href ? (
                <Link to={author.href} className="font-bold hover:underline">{author.name}</Link>
              ) : (
                <strong>{author.name}</strong>
              )}
              {author.handle && <span className="text-muted-foreground">@{author.handle}</span>}
              {d.botKind && (
                <span
                  className="rounded-full px-2 py-px text-xs font-bold"
                  style={isAlien ? { background: '#a855f7', color: '#fff' } : { border: '1px solid var(--color-border)', color: 'var(--color-muted-foreground)' }}
                >
                  {isAlien ? 'Unverified signal' : 'Bot'}
                </span>
              )}
              <span aria-hidden className="text-muted-foreground">·</span>
              {linkToPost ? (
                <Link to={`/post/${post.recordId}`} className="text-muted-foreground hover:underline">
                  <time dateTime={new Date(post.createdAt).toISOString()}>{timeAgo(post.createdAt)}</time>
                </Link>
              ) : (
                <time className="text-muted-foreground" dateTime={new Date(post.createdAt).toISOString()}>
                  {new Date(post.createdAt).toLocaleString()}
                </time>
              )}
            </header>

            {d.replyToId && !isReplyPreview && (
              <p className="text-sm text-muted-foreground">
                Replying to{' '}
                <Link to={parentAuthor?.href ?? `/post/${d.replyToId}`} className="text-primary hover:underline">
                  {parentAuthor?.handle ? `@${parentAuthor.handle}` : 'a post'}
                </Link>
              </p>
            )}

            <p className={`mt-0.5 whitespace-pre-wrap break-words ${isAlien ? 'tracking-wide' : ''} ${linkToPost ? '' : 'text-lg'}`}>{d.text}</p>

            {d.mediaKey && <Media mediaKey={d.mediaKey} mediaType={d.mediaType} alt={d.mediaAlt} compact={compact} />}

            {d.quoteOfId && (
              <div className="mt-3">
                <QuoteEmbed post={feed.byId.get(d.quoteOfId)} profiles={profiles} />
              </div>
            )}

            {d.body && d.lat != null && d.lng != null && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: PLANET_COLORS[d.body] }} />
                {BODY_LABELS[d.body] ?? d.body} at {d.lat.toFixed(2)}, {d.lng.toFixed(2)}
                <Link to="/map" className="text-primary hover:underline">Open map</Link>
              </p>
            )}

            <footer className="-ml-2 mt-1.5 flex max-w-md items-center justify-between" aria-label="Post actions">
              <button
                type="button"
                className={`${action} hover:bg-sky-500/10 hover:text-sky-400`}
                onClick={() => (canReact ? setMode(mode === 'reply' ? null : 'reply') : navigate(`/post/${post.recordId}`))}
                aria-label={`Reply. ${stats.replies} replies`}
              >
                <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
                {stats.replies > 0 && stats.replies}
              </button>
              <button
                type="button"
                className={`${action} hover:bg-green-500/10 hover:text-green-400`}
                disabled={!canReact}
                onClick={() => onToggle(post.recordId, 'repost', stats.myRepostId)}
                aria-pressed={Boolean(stats.myRepostId)}
                aria-label={`Repost. ${stats.reposts} reposts`}
                style={stats.myRepostId ? { color: '#22c55e' } : undefined}
              >
                <Repeat2 className="h-[18px] w-[18px]" aria-hidden />
                {stats.reposts > 0 && stats.reposts}
              </button>
              <button
                type="button"
                className={`${action} hover:bg-amber-500/10 hover:text-amber-400`}
                disabled={!canReact}
                onClick={() => setMode(mode === 'quote' ? null : 'quote')}
                aria-label="Quote post"
              >
                <Quote className="h-[18px] w-[18px]" aria-hidden />
              </button>
              <button
                type="button"
                className={`${action} hover:bg-pink-500/10 hover:text-pink-400`}
                disabled={!canReact}
                onClick={() => onToggle(post.recordId, 'like', stats.myLikeId)}
                aria-pressed={Boolean(stats.myLikeId)}
                aria-label={`Like. ${stats.likes} likes`}
                style={stats.myLikeId ? { color: '#ec4899' } : undefined}
              >
                <Heart className="h-[18px] w-[18px]" fill={stats.myLikeId ? 'currentColor' : 'none'} aria-hidden />
                {stats.likes > 0 && stats.likes}
              </button>
              {settings.readAloud && (
                <button
                  type="button"
                  className={`${action} hover:bg-accent hover:text-foreground`}
                  onClick={() => speak(`${author.name} says: ${d.text}`)}
                  aria-label="Read this post aloud"
                >
                  <Volume2 className="h-[18px] w-[18px]" aria-hidden />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className={`${action} hover:bg-red-500/10 hover:text-red-400`}
                  onClick={() => onDelete(post.recordId)}
                  aria-label="Delete post"
                >
                  <Trash2 className="h-[18px] w-[18px]" aria-hidden />
                </button>
              )}
            </footer>

            {mode && (
              <div className="mt-2">
                <PostComposer
                  replyToId={mode === 'reply' ? post.recordId : undefined}
                  quoteOfId={mode === 'quote' ? post.recordId : undefined}
                  quotePreview={mode === 'quote' ? <QuoteEmbed post={post} profiles={profiles} /> : undefined}
                  onDone={() => setMode(null)}
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Latest replies, so conversations are visible right in the feed. */}
        {replies.length > 0 && (
          <div className="mt-1">
            {replies.slice(-2).map((r) => (
              <PostCard
                key={r.recordId}
                {...props}
                post={r}
                stats={feed.stats(r.recordId)}
                canDelete={false}
                repostedBy={undefined}
                showReplyPreview={false}
                isReplyPreview
              />
            ))}
            <Link to={`/post/${post.recordId}`} className="ml-[3.25rem] inline-block py-1 text-sm text-primary hover:underline">
              {replies.length > 2 ? `Show all ${replies.length} replies` : 'Open thread'}
            </Link>
          </div>
        )}
      </article>
    </>
  )
}
