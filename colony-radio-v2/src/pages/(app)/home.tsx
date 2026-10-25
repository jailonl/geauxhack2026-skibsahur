// "/home" — the feed, with a live column on the left (wide screens): Colony pulse, signal times,
// busy forums, and colonists to meet.
import { Link } from 'react-router-dom'
import Feed from '../../features/comms/Feed'
import ColonyPulse from '../../features/home/ColonyPulse'
import SignalTimes from '../../features/home/SignalTimes'
import { FORUMS } from '../../features/forums/forums'
import { useForumActivity } from '../../features/social/SocialProvider'
import UserAvatar from '../../features/social/UserAvatar'
import { useMyProfile, useProfiles } from '../../features/social/profiles'
import { BODY_LABELS } from '../../lib/space'

function BusyForums() {
  const { threads } = useForumActivity() // shared recent threads; no extra query
  const counts = new Map<string, number>()
  for (const r of threads) counts.set(r.data.forum, (counts.get(r.data.forum) ?? 0) + 1)
  const busiest = [...FORUMS].sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0)).slice(0, 4)

  return (
    <section aria-labelledby="busy-forums" className="rounded-2xl border border-border bg-card p-4">
      <h2 id="busy-forums" className="mb-3 font-display text-lg">Busy forums</h2>
      <ul className="space-y-1">
        {busiest.map((f) => (
          <li key={f.slug}>
            <Link to={`/forums/${f.slug}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/50">
              <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full font-bold" style={{ color: f.accent, boxShadow: `inset 0 0 0 1.5px ${f.accent}` }}>
                {f.glyph}
              </span>
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-sm text-muted-foreground">{counts.get(f.slug) ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/forums" className="mt-2 inline-block text-sm text-primary hover:underline">All forums</Link>
    </section>
  )
}

function Colonists({ myId }: { myId: string | null }) {
  const profiles = useProfiles()
  const people = [...profiles.byUserId.values()].filter((p) => p.userId !== myId).slice(-4).reverse()
  if (people.length === 0) return null

  return (
    <section aria-labelledby="colonists" className="rounded-2xl border border-border bg-card p-4">
      <h2 id="colonists" className="mb-3 font-display text-lg">Colonists</h2>
      <ul className="space-y-2">
        {people.map((p) => (
          <li key={p.userId} className="flex items-center gap-3">
            <Link to={`/u/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar name={p.username} avatarKey={p.avatarKey} accent={p.accent} size={36} />
              <span className="min-w-0">
                <span className="block truncate font-bold leading-tight hover:underline">{p.displayName || p.username}</span>
                <span className="block truncate text-sm text-muted-foreground">@{p.username} on {BODY_LABELS[p.homeBody ?? 'earth']}</span>
              </span>
            </Link>
            <Link to={`/messages?to=${p.username}`} className="rounded-full border border-border px-3 py-1 text-sm font-bold hover:bg-accent">
              Message
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function HomePage() {
  const { profile } = useMyProfile()

  return (
    <div className="mx-auto grid max-w-[1180px] gap-6 px-4 py-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside aria-label="Colony overview" className="hidden space-y-4 lg:block">
        <div className="sticky top-5 max-h-[calc(100vh-7rem)] space-y-4 overflow-y-auto pb-4">
          <ColonyPulse />
          <SignalTimes home={profile?.homeBody ?? 'earth'} />
          <BusyForums />
          <Colonists myId={profile?.userId ?? null} />
        </div>
      </aside>
      <div className="mx-auto w-full max-w-[680px] min-w-0">
        <Feed />
      </div>
    </div>
  )
}
