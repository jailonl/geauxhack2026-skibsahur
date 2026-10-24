// "/u/:username" — a colonist's public profile: picture, bio, home planet, posts, and a Message button.
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth, useMutations, useUser } from 'deepspace'
import { BODY_LABELS } from '../../../lib/space'
import PostCard from '../../../features/comms/PostCard'
import { useFeedData, useReactionActions } from '../../../features/comms/feedData'
import type { Post } from '../../../features/comms/types'
import UserAvatar from '../../../features/social/UserAvatar'
import { DEFAULT_ACCENT, useMyProfile, useProfiles } from '../../../features/social/profiles'

export default function UserPage() {
  const { username = '' } = useParams()
  const [tab, setTab] = useState<'posts' | 'replies' | 'likes'>('posts')
  const profiles = useProfiles()
  const feed = useFeedData(500)
  const { profile: me } = useMyProfile()
  const { userId } = useAuth()
  const { user } = useUser()
  const { remove } = useMutations<Post>('posts')
  const reactions = useReactionActions()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  const person = profiles.byUsername.get(username.toLowerCase())
  if (profiles.status === 'loading') return <main className="p-4 text-muted-foreground">Loading...</main>
  if (!person) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <p className="text-muted-foreground">No colonist named @{username}.</p>
        <Link to="/home" className="underline">Back to feed</Link>
      </main>
    )
  }

  const accent = person.accent || DEFAULT_ACCENT
  const isMe = me?.userId === person.userId
  const theirs = feed.posts.filter((p) => p.createdBy === person.userId && !p.data.botKind)
  const shown =
    tab === 'posts'
      ? theirs.filter((p) => !p.data.replyToId)
      : tab === 'replies'
        ? theirs.filter((p) => p.data.replyToId)
        : feed.posts.filter((p) => feed.stats(p.recordId).myLikeId && isMe) // likes are only listed on your own profile

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="h-24" style={{ background: `linear-gradient(135deg, ${accent}, transparent)` }} />
        <div className="-mt-10 space-y-2 p-4">
          <div className="flex items-end justify-between gap-2">
            <UserAvatar name={person.username} avatarKey={person.avatarKey} accent={accent} size={80} />
            {isMe ? (
              <Link to="/profile" className="rounded-md border px-3 py-1.5 text-sm">Edit profile</Link>
            ) : (
              <Link
                to={`/messages?to=${person.username}`}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                Message
              </Link>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">{person.displayName || person.username}</h1>
            <p className="text-sm text-muted-foreground">@{person.username}</p>
          </div>
          {person.bio && <p className="whitespace-pre-wrap">{person.bio}</p>}
          <p className="text-sm text-muted-foreground">🏠 Lives on {BODY_LABELS[person.homeBody ?? 'earth']}</p>
        </div>
      </section>

      <div role="tablist" aria-label="Profile sections" className="flex gap-2">
        {(['posts', 'replies', ...(isMe ? ['likes'] : [])] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t as typeof tab)}
            className={tab === t ? 'rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground' : 'rounded-full border px-3 py-1 text-sm'}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="text-muted-foreground">Nothing here yet.</p>}
      {shown.map((p) => (
        <PostCard
          key={p.recordId}
          post={p}
          profiles={profiles}
          feed={feed}
          stats={feed.stats(p.recordId)}
          canDelete={isAdmin || (userId != null && p.createdBy === userId)}
          canReact={Boolean(me)}
          onToggle={(postId, kind, existing) => void reactions.toggle(postId, kind, existing)}
          onDelete={async (postId) => {
            if (window.confirm('Delete this post?')) await remove(postId)
          }}
        />
      ))}
    </main>
  )
}
