// "/u/:username" — a colonist's profile: banner in their color, picture, bio, home world, live signal delay
// from you to them, and tabs for Posts (including reposts), Replies, and Likes (your own profile only).
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth, useMutations, useUser } from 'deepspace'
import { ArrowLeft } from 'lucide-react'
import { BODY_LABELS, PLANET_COLORS, formatDelay, lightDelaySeconds } from '../../../lib/space'
import PostCard from '../../../features/comms/PostCard'
import { useFeedData, useReactionActions } from '../../../features/comms/feedData'
import type { Post, PostRecord } from '../../../features/comms/types'
import UserAvatar from '../../../features/social/UserAvatar'
import ProfileVitals from '../../../features/vitals/ProfileVitals'
import { DEFAULT_ACCENT, useMyProfile, useProfiles } from '../../../features/social/profiles'

type Item = { key: string; post: PostRecord; at: string; repostedBy?: { label: string; href?: string } }

export default function UserPage() {
  const { username = '' } = useParams()
  const [tab, setTab] = useState<'posts' | 'replies' | 'likes'>('posts')
  const profiles = useProfiles()
  const feed = useFeedData()
  const { profile: me } = useMyProfile()
  const { userId } = useAuth()
  const { user } = useUser()
  const { remove } = useMutations<Post>('posts')
  const reactions = useReactionActions()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  const person = profiles.byUsername.get(username.toLowerCase())
  if (profiles.status === 'loading') return <p className="p-6 text-muted-foreground">Loading profile...</p>
  if (!person) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="mb-2">No colonist named @{username}.</p>
        <Link to="/home" className="text-primary hover:underline">Back to Home</Link>
      </div>
    )
  }

  const accent = person.accent || DEFAULT_ACCENT
  const isMe = me?.userId === person.userId
  const home = person.homeBody ?? 'earth'
  const theirs = feed.posts.filter((p) => p.createdBy === person.userId && !p.data.botKind)
  const label = isMe ? 'You' : `@${person.username}`

  let items: Item[] = []
  if (tab === 'posts') {
    items = theirs.filter((p) => !p.data.replyToId).map((p) => ({ key: p.recordId, post: p, at: p.createdAt }))
    for (const r of feed.reposts) {
      if (r.createdBy !== person.userId) continue
      const post = feed.byId.get(r.data.targetId)
      if (post) items.push({ key: `repost-${r.recordId}`, post, at: r.createdAt, repostedBy: { label } })
    }
  } else if (tab === 'replies') {
    items = theirs.filter((p) => p.data.replyToId).map((p) => ({ key: p.recordId, post: p, at: p.createdAt }))
  } else {
    items = feed.posts.filter((p) => feed.stats(p.recordId).myLikeId).map((p) => ({ key: p.recordId, post: p, at: p.createdAt }))
  }
  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const postCount = theirs.filter((p) => !p.data.replyToId).length
  const likesReceived = theirs.reduce((n, p) => n + feed.stats(p.recordId).likes, 0)
  const tabs = (['posts', 'replies', ...(isMe ? ['likes'] : [])] as const) as readonly ('posts' | 'replies' | 'likes')[]

  return (
    <div className="mx-auto max-w-[680px] space-y-3 px-4 py-5">
      <Link to="/home" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to the feed
      </Link>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-32 sm:h-40" style={{ background: `radial-gradient(120% 140% at 85% 0%, ${accent} 0%, transparent 60%), linear-gradient(180deg, ${PLANET_COLORS[home]}33, transparent)` }} />
        <div className="px-4 pb-4">
          <div className="-mt-12 flex items-end justify-between gap-2">
            <span className="rounded-full bg-card p-1">
              <UserAvatar name={person.username} avatarKey={person.avatarKey} accent={accent} size={96} />
            </span>
            {isMe ? (
              <Link to="/profile" className="rounded-full border border-border px-4 py-1.5 font-bold hover:bg-accent">Edit profile</Link>
            ) : (
              <Link to={`/messages?to=${person.username}`} className="rounded-full bg-primary px-4 py-1.5 font-bold text-primary-foreground">
                Message
              </Link>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl">{person.displayName || person.username}</h1>
          <p className="text-muted-foreground">@{person.username}</p>
          {person.bio && <p className="font-post mt-3 whitespace-pre-wrap text-[1.05rem]">{person.bio}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: PLANET_COLORS[home] }} />
              Lives on {BODY_LABELS[home]}
            </span>
            {me && !isMe && (
              <span>Your signal reaches them in {formatDelay(lightDelaySeconds(me.homeBody ?? 'earth', home))}</span>
            )}
          </p>
          <p className="mt-2 text-sm">
            <strong>{postCount}</strong> <span className="text-muted-foreground">posts</span>
            <span className="mx-3" />
            <strong>{likesReceived}</strong> <span className="text-muted-foreground">likes received</span>
          </p>
        </div>

        <nav role="tablist" aria-label="Profile sections" className="flex border-t border-border">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`relative flex-1 py-3 text-sm hover:bg-accent/40 ${tab === t ? 'font-bold' : 'text-muted-foreground'}`}
            >
              {t === 'posts' ? 'Posts' : t === 'replies' ? 'Replies' : 'Likes'}
              {tab === t && <span aria-hidden className="absolute inset-x-1/3 bottom-0 h-1 rounded-full bg-primary" />}
            </button>
          ))}
        </nav>
      </section>

      {/* Shows only if they set their vitals to Public (Vitals page). */}
      <ProfileVitals userId={person.userId} isMe={isMe} />

      {items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border py-10 text-center text-muted-foreground">
          {tab === 'posts' ? (isMe ? 'You haven\'t posted yet.' : 'No posts yet.') : tab === 'replies' ? 'No replies yet.' : 'Posts you like show up here.'}
        </p>
      )}
      {items.map((i) => (
        <PostCard
          key={i.key}
          post={i.post}
          profiles={profiles}
          feed={feed}
          stats={feed.stats(i.post.recordId)}
          canDelete={isAdmin || (userId != null && i.post.createdBy === userId)}
          canReact={Boolean(me)}
          onToggle={(postId, kind, existing) => void reactions.toggle(postId, kind, existing)}
          onDelete={async (postId) => {
            if (window.confirm('Delete this post?')) await remove(postId)
          }}
          repostedBy={i.repostedBy}
        />
      ))}
    </div>
  )
}
