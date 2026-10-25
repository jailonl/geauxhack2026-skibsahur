// One transmission: a card with an origin strip (which world it came from, and how long the signal took to
// reach you, in the VT323 terminal font), the author, the text, media, a quoted post, labeled actions, and a preview
// of the latest replies. Clicking anywhere on the card (except a control) opens the full thread.
import { memo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useR2Files } from 'deepspace'
import { Heart, ImageOff, MessageCircle, Quote, Repeat2, Trash2, Volume2 } from 'lucide-react'
import { BODY_LABELS, PLANET_COLORS, formatDelay, lightDelaySeconds, type Body } from '../../lib/space'
import { speak, useSettings } from '../settings/settings'
import UserAvatar from '../social/UserAvatar'
import { useMyProfile, type Profiles } from '../social/profiles'
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
  isReplyPreview?: boolean // this card IS a reply preview: lighter, no nested previews
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
    <Link to={`/post/${post.recordId}`} className="block rounded-xl border border-border bg-background/40 p-3 text-sm hover:bg-accent/40">
      <span className="flex items-center gap-2">
        <UserAvatar name={a.name} avatarKey={a.avatarKey} accent={a.accent} emoji={a.emoji} size={20} />
        <strong>{a.name}</strong>
        {a.handle && <span className="text-muted-foreground">@{a.handle}</span>}
      </span>
      <span className="font-post mt-1 line-clamp-3 block whitespace-pre-wrap">{post.data.text}</span>
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
    <video src={getUrl(mediaKey)} controls preload="metadata" className={`mt-3 w-full rounded-xl ${height}`} aria-label={alt} />
  ) : (
    <img src={getUrl(mediaKey)} alt={alt ?? ''} loading="lazy" decoding="async" className={`mt-3 w-full rounded-xl object-cover ${height}`} />
  )
}

/** Where a transmission came from: its location tag, else the author's home world. */
function originOf(post: PostRecord, profiles: Profiles): Body | null {
  if (post.data.body) return post.data.body
  if (post.data.botKind) return null
  return profiles.byUserId.get(post.createdBy)?.homeBody ?? null
}

function PostCard(props: Props) {
  const {
    post, profiles, feed, stats, canDelete, canReact, onToggle, onDelete, repostedBy,
    linkToPost = true, showReplyPreview = false, isReplyPreview = false,
  } = props
  const [mode, setMode] = useState<'reply' | 'quote' | null>(null)
  const settings = useSettings()
  const { profile: me } = useMyProfile()
  const navigate = useNavigate()
  const d = post.data
  const author = authorOf(post, profiles)
  const isAlien = d.botKind === 'alien'
  const parent = d.replyToId ? feed.byId.get(d.replyToId) : undefined
  const parentAuthor = parent ? authorOf(parent, profiles) : null
  const replies = showReplyPreview ? feed.repliesTo(post.recordId) : []
  const compact = settings.compactPosts || isReplyPreview
  const avatarSize = compact ? 32 : 44

  const origin = originOf(post, profiles)
  const myHome: Body = me?.homeBody ?? 'earth'
  const delay = origin ? lightDelaySeconds(origin, myHome) : 0
  const originColor = isAlien ? '#a855f7' : origin ? PLANET_COLORS[origin] : '#64748b'

  function openThread(e: React.MouseEvent) {
    if (!linkToPost || clickedControl(e) || window.getSelection()?.toString()) return
    e.stopPropagation() // a click on a reply preview opens that reply, not the parent
    navigate(`/post/${post.recordId}`)
  }

  const action =
    'flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-40'

  const body = (
    <div className={`flex gap-3 ${compact ? 'px-3 py-2.5' : 'px-4 py-3.5'}`}>
      {author.href ? (
        <Link to={author.href} aria-label={`${author.name}'s profile`} className="shrink-0">
          <UserAvatar name={author.name} avatarKey={author.avatarKey} accent={author.accent} size={avatarSize} />
        </Link>
      ) : (
        <span className="shrink-0">
          <UserAvatar name={author.name} avatarKey={author.avatarKey} accent={author.accent} emoji={author.emoji} size={avatarSize} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline gap-x-2">
          {author.href ? (
            <Link to={author.href} className="font-bold hover:underline">{author.name}</Link>
          ) : (
            <strong>{author.name}</strong>
          )}
          {author.handle && <span className="text-sm text-muted-foreground">@{author.handle}</span>}
          {d.botKind && (
            <span
              className="rounded-full px-2 py-px text-xs font-bold"
              style={isAlien ? { background: '#a855f7', color: '#fff' } : { border: '1px solid var(--color-border)', color: 'var(--color-muted-foreground)' }}
            >
              {isAlien ? 'Unverified signal' : 'Bot'}
            </span>
          )}
          <span className="ml-auto text-sm text-muted-foreground">
            {linkToPost ? (
              <Link to={`/post/${post.recordId}`} className="hover:underline">
                <time dateTime={new Date(post.createdAt).toISOString()}>{timeAgo(post.createdAt)}</time>
              </Link>
            ) : (
              <time dateTime={new Date(post.createdAt).toISOString()}>{new Date(post.createdAt).toLocaleString()}</time>
            )}
          </span>
        </header>

        {d.replyToId && !isReplyPreview && (
          <p className="text-sm text-muted-foreground">
            Replying to{' '}
            <Link to={parentAuthor?.href ?? `/post/${d.replyToId}`} className="text-primary hover:underline">
              {parentAuthor?.handle ? `@${parentAuthor.handle}` : 'a post'}
            </Link>
          </p>
        )}

        <p className={`font-post mt-1 whitespace-pre-wrap break-words ${linkToPost ? 'text-[1.05rem]' : 'text-xl'} ${isAlien ? 'tracking-wide' : ''}`}>
          {d.text}
        </p>

        {d.mediaKey && <Media mediaKey={d.mediaKey} mediaType={d.mediaType} alt={d.mediaAlt} compact={compact} />}

        {d.quoteOfId && (
          <div className="mt-3">
            <QuoteEmbed post={feed.byId.get(d.quoteOfId)} profiles={profiles} />
          </div>
        )}

        {d.body && d.lat != null && d.lng != null && (
          <p className="mt-2 text-sm text-muted-foreground">
            Tagged at {d.lat.toFixed(2)}, {d.lng.toFixed(2)} on {BODY_LABELS[d.body]}.{' '}
            <Link to={`/map?body=${d.body}&lat=${d.lat}&lng=${d.lng}`} className="text-primary hover:underline">Open map</Link>
          </p>
        )}

        <footer className="-ml-2.5 mt-2 flex flex-wrap items-center gap-1" aria-label="Post actions">
          <button
            type="button"
            className={action}
            disabled={!canReact}
            onClick={() => onToggle(post.recordId, 'like', stats.myLikeId)}
            aria-pressed={Boolean(stats.myLikeId)}
            style={stats.myLikeId ? { color: '#ec4899' } : undefined}
          >
            <Heart className="h-4 w-4" fill={stats.myLikeId ? 'currentColor' : 'none'} aria-hidden />
            <span className={compact ? 'sr-only' : 'hidden sm:inline'}>Like</span>
            {stats.likes > 0 && <span className="tabular-nums">{stats.likes}</span>}
          </button>
          <button
            type="button"
            className={action}
            onClick={() => (canReact ? setMode(mode === 'reply' ? null : 'reply') : navigate(`/post/${post.recordId}`))}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            <span className={compact ? 'sr-only' : 'hidden sm:inline'}>Reply</span>
            {stats.replies > 0 && <span className="tabular-nums">{stats.replies}</span>}
          </button>
          <button
            type="button"
            className={action}
            disabled={!canReact}
            onClick={() => onToggle(post.recordId, 'repost', stats.myRepostId)}
            aria-pressed={Boolean(stats.myRepostId)}
            style={stats.myRepostId ? { color: '#22c55e' } : undefined}
          >
            <Repeat2 className="h-4 w-4" aria-hidden />
            <span className={compact ? 'sr-only' : 'hidden sm:inline'}>Repost</span>
            {stats.reposts > 0 && <span className="tabular-nums">{stats.reposts}</span>}
          </button>
          {!isReplyPreview && (
            <button type="button" className={action} disabled={!canReact} onClick={() => setMode(mode === 'quote' ? null : 'quote')}>
              <Quote className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Quote</span>
              <span className="sr-only sm:hidden">Quote post</span>
            </button>
          )}
          {settings.readAloud && (
            <button type="button" className={action} onClick={() => speak(`${author.name} says: ${d.text}`)} aria-label="Read this post aloud">
              <Volume2 className="h-4 w-4" aria-hidden />
            </button>
          )}
          {canDelete && (
            <button type="button" className={`${action} ml-auto hover:text-red-400`} onClick={() => onDelete(post.recordId)} aria-label="Delete post">
              <Trash2 className="h-4 w-4" aria-hidden />
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
  )

  // A reply preview sits inside its parent's card: no frame, no origin strip.
  if (isReplyPreview) {
    return (
      <article onClick={openThread} className="cursor-pointer border-t border-border hover:bg-accent/20">
        {body}
      </article>
    )
  }

  return (
    <article
      onClick={openThread}
      className={`overflow-hidden rounded-2xl border border-border bg-card ${linkToPost ? 'cursor-pointer transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]' : ''}`}
    >
      {/* Origin strip: which world sent this, and how long the light took to reach you. */}
      <div
        className="font-signal flex flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-1 text-sm"
        style={{ background: `color-mix(in srgb, ${originColor} 16%, transparent)`, borderBottom: `1px solid color-mix(in srgb, ${originColor} 35%, transparent)` }}
      >
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: originColor }} />
        <span className="font-bold" style={{ color: originColor }}>
          {isAlien ? 'Unknown origin' : origin ? `From ${BODY_LABELS[origin]}` : 'Stellar network'}
        </span>
        {origin && delay >= 0.05 && (
          <span className="text-muted-foreground">
            reached {BODY_LABELS[myHome]} {formatDelay(delay)} after it was sent
          </span>
        )}
        {repostedBy && (
          <span className="ml-auto flex items-center gap-1 font-bold text-muted-foreground">
            <Repeat2 className="h-3.5 w-3.5" aria-hidden />
            {repostedBy.href ? <Link to={repostedBy.href} className="hover:underline">{repostedBy.label} reposted</Link> : `${repostedBy.label} reposted`}
          </span>
        )}
      </div>

      {body}

      {/* Latest replies, so conversations are visible right in the feed. */}
      {replies.length > 0 && (
        <div className="bg-background/30 pl-6">
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
          <Link to={`/post/${post.recordId}`} className="block border-t border-border px-4 py-2 text-sm font-bold text-primary hover:underline">
            {replies.length > 2 ? `Show all ${replies.length} replies` : 'Open the thread'}
          </Link>
        </div>
      )}
    </article>
  )
}

/** True when a card would look the same, so React can skip re-rendering it. The feed re-renders every few
 * seconds for alien posts; without this every card on the page would redraw each time. */
function sameCard(a: Props, b: Props): boolean {
  if (a.repostedBy?.label !== b.repostedBy?.label || a.repostedBy?.href !== b.repostedBy?.href) return false
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Props>
  for (const key of keys) {
    if (key !== 'repostedBy' && a[key] !== b[key]) return false
  }
  return true
}

export default memo(PostCard, sameCard)
