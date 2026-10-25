// "Colony pulse": a live log of the latest activity everywhere (posts, replies, new threads, forum comments),
// so the app feels inhabited. Built from data that's already loaded; no extra queries.
import { Link } from 'react-router-dom'
import { timeAgo } from '../comms/PostCard'
import { authorOf, useFeedData } from '../comms/feedData'
import { findForum } from '../forums/forums'
import { findColonist } from '../forums/colonists'
import { useForumActivity } from '../social/SocialProvider'
import { useProfiles } from '../social/profiles'

type Event = { id: string; who: string; what: string; detail: string; href: string; at: string; color?: string }

export default function ColonyPulse() {
  const feed = useFeedData()
  const profiles = useProfiles()
  const { threads, comments } = useForumActivity()

  const nameOf = (createdBy: string, botName?: string) =>
    botName ? findColonist(botName)?.name ?? botName : profiles.byUserId.get(createdBy)?.username ? `@${profiles.byUserId.get(createdBy)!.username}` : 'A colonist'
  const titleOf = new Map(threads.map((t) => [t.recordId, t.data.title]))

  const events: Event[] = [
    ...feed.posts.slice(0, 12).map((p) => ({
      id: `p-${p.recordId}`,
      who: authorOf(p, profiles).name,
      what: p.data.replyToId ? 'replied' : 'posted',
      detail: p.data.text,
      href: `/post/${p.recordId}`,
      at: p.createdAt,
    })),
    ...threads.slice(0, 8).map((t) => {
      const f = findForum(t.data.forum)
      return {
        id: `t-${t.recordId}`,
        who: nameOf(t.createdBy, t.data.botName),
        what: `started a thread in ${f?.name ?? 'the forums'}`,
        detail: t.data.title,
        href: `/thread/${t.recordId}`,
        at: t.createdAt,
        color: f?.accent,
      }
    }),
    ...comments.slice(0, 8).map((c) => ({
      id: `c-${c.recordId}`,
      who: nameOf(c.createdBy, c.data.botName),
      what: `commented on "${titleOf.get(c.data.threadId) ?? 'a thread'}"`,
      detail: c.data.text,
      href: `/thread/${c.data.threadId}`,
      at: c.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 9)

  return (
    <section aria-labelledby="colony-pulse" className="rounded-2xl border border-border bg-card p-4">
      <h2 id="colony-pulse" className="flex items-center gap-2 font-display text-lg">
        <span aria-hidden className="signal-pulse h-2.5 w-2.5 rounded-full bg-green-400" />
        Colony pulse
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">Live activity across every world.</p>
      {events.length === 0 && <p className="text-sm text-muted-foreground">Quiet right now. Say something.</p>}
      <ol className="space-y-3">
        {events.map((e) => (
          <li key={e.id}>
            <Link to={e.href} className="group block">
              <span className="block text-sm leading-snug">
                <strong>{e.who}</strong> <span className="text-muted-foreground" style={e.color ? { color: e.color } : undefined}>{e.what}</span>
                <span className="text-muted-foreground"> · {timeAgo(e.at)}</span>
              </span>
              <span className="font-post line-clamp-2 block text-sm text-muted-foreground group-hover:text-foreground">{e.detail}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
