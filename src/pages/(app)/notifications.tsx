// "/notifications" — likes, reposts, quotes, replies, messages, and forum replies, newest first.
// Opening the page marks everything as seen (the bell's count resets).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Mail, MessageCircle, MessagesSquare, Quote, Repeat2 } from 'lucide-react'
import { timeAgo } from '../../features/comms/PostCard'
import { useNotifications, type NotificationKind } from '../../features/notifications/notifications'
import UserAvatar from '../../features/social/UserAvatar'
import { useMyProfile } from '../../features/social/profiles'
import { SignInPrompt } from '../../features/social/SignIn'

const KIND: Record<NotificationKind, { verb: string; Icon: typeof Heart; color: string }> = {
  like: { verb: 'liked your post', Icon: Heart, color: '#ec4899' },
  repost: { verb: 'reposted your post', Icon: Repeat2, color: '#22c55e' },
  quote: { verb: 'quoted your post', Icon: Quote, color: '#f59e0b' },
  reply: { verb: 'replied to you', Icon: MessageCircle, color: '#38bdf8' },
  message: { verb: 'sent you a message', Icon: Mail, color: '#a78bfa' },
  comment: { verb: 'replied in the forums', Icon: MessagesSquare, color: '#fb923c' },
}

type Filter = 'all' | 'mentions' | 'messages'

export default function NotificationsPage() {
  const { isSignedIn } = useMyProfile()
  const { items, lastSeen, markAllSeen } = useNotifications()
  const [filter, setFilter] = useState<Filter>('all')
  // Remember which ones were new when the page opened, then mark them seen.
  const [newSince] = useState(lastSeen)
  useEffect(() => {
    markAllSeen()
  }, [markAllSeen])

  const shown = items.filter((n) =>
    filter === 'all' ? true : filter === 'messages' ? n.kind === 'message' : n.kind === 'reply' || n.kind === 'quote' || n.kind === 'comment',
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="font-display text-2xl">Notifications</h1>

      {!isSignedIn ? (
        <div className="mt-4"><SignInPrompt action="get notified when people reply, like, or message you" /></div>
      ) : (
        <>
          <div role="group" aria-label="Filter notifications" className="mt-3 flex gap-2">
            {(['all', 'mentions', 'messages'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={filter === f ? 'rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground' : 'rounded-full border border-border px-4 py-1.5 text-sm hover:bg-accent'}
              >
                {f === 'all' ? 'All' : f === 'mentions' ? 'Replies' : 'Messages'}
              </button>
            ))}
          </div>

          {shown.length === 0 && (
            <p className="mt-10 text-center text-muted-foreground">
              Nothing yet. Post something, reply in a forum, or message an operator to get the conversation going.
            </p>
          )}

          <ul className="mt-4 space-y-2">
            {shown.map((n) => {
              const k = KIND[n.kind]
              const isNew = n.at > newSince
              return (
                <li key={n.id}>
                  <Link
                    to={n.href}
                    className="flex gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-accent/40"
                    style={isNew ? { boxShadow: 'inset 3px 0 0 var(--color-primary)' } : undefined}
                  >
                    <span className="relative shrink-0">
                      <UserAvatar name={n.actor.name} avatarKey={n.actor.avatarKey} accent={n.actor.accent} emoji={n.actor.emoji} size={40} />
                      <span
                        aria-hidden
                        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background"
                        style={{ color: k.color }}
                      >
                        <k.Icon className="h-3.5 w-3.5" fill={n.kind === 'like' ? 'currentColor' : 'none'} />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block">
                        <strong>{n.actor.name}</strong>
                        {n.actor.isBot && <span className="ml-1.5 rounded-full border border-border px-1.5 text-xs text-muted-foreground">Bot</span>}{' '}
                        <span className="text-muted-foreground">{k.verb}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{timeAgo(new Date(n.at).toISOString())}</span>
                        {isNew && <span className="sr-only"> (new)</span>}
                      </span>
                      {n.snippet && <span className="font-post mt-0.5 line-clamp-2 block text-muted-foreground">{n.snippet}</span>}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
