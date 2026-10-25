// Page layout in the style of a Moodle course page:
// - left drawer (wide screens): navigation and the busiest forums
// - center: breadcrumbs, then the page
// - right column (extra-wide screens): info blocks (colony pulse, signal times, colonists)
// On phones the drawer is replaced by the bottom tab bar (Navigation.tsx), and on the feed and forums
// pages the right-hand blocks move below the page.
import { useSyncExternalStore, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser } from 'deepspace'
import Block from './Block'
import ColonyPulse from '../features/home/ColonyPulse'
import SignalTimes from '../features/home/SignalTimes'
import { FORUMS, findForum } from '../features/forums/forums'
import { useNotifications } from '../features/notifications/notifications'
import { useForumActivity } from '../features/social/SocialProvider'
import UserAvatar from '../features/social/UserAvatar'
import { useMyProfile, useProfiles } from '../features/social/profiles'
import { BODY_LABELS } from '../lib/space'
import { cn } from '../lib/utils'

const LINKS = [
  { to: '/', label: 'Welcome' },
  { to: '/home', label: 'Feed' },
  { to: '/forums', label: 'Forums' },
  { to: '/messages', label: 'Messages' },
  { to: '/map', label: 'Map' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/search', label: 'Search' },
  { to: '/preferences', label: 'Settings' },
]

function isActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(to + '/') || (to === '/forums' && pathname.startsWith('/thread/'))
}

function LeftDrawer({ pathname }: { pathname: string }) {
  const { unread } = useNotifications()
  const { user } = useUser()
  const { threads } = useForumActivity()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true
  const links = isAdmin ? [...LINKS, { to: '/settings', label: 'Admin' }] : LINKS

  // Busiest forums by recent threads (shared data; no extra query).
  const counts = new Map<string, number>()
  for (const t of threads) counts.set(t.data.forum, (counts.get(t.data.forum) ?? 0) + 1)
  const busiest = [...FORUMS].sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0)).slice(0, 6)

  return (
    <aside aria-label="Navigation drawer" className="max-h-[calc(100vh-6rem)] space-y-5 overflow-y-auto p-1">
      <Block id="drawer-nav" title="Navigation">
        <ul className="-m-1 space-y-0.5">
          {links.map((l) => {
            const active = isActive(pathname, l.to)
            return (
              <li key={l.to}>
                <Link
                  to={l.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn('flex items-center justify-between px-2 py-1.5', active ? 'bg-primary font-bold text-primary-foreground' : 'hover:bg-accent')}
                >
                  {l.label}
                  {l.to === '/notifications' && unread > 0 && (
                    <span className={cn('px-1.5 text-xs font-bold', active ? 'bg-background text-foreground' : 'bg-primary text-primary-foreground')}>{unread}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </Block>
      <Block id="drawer-forums" title="Busy forums">
        <ul className="-m-1 space-y-0.5">
          {busiest.map((f) => (
            <li key={f.slug}>
              <Link to={`/forums/${f.slug}`} className="flex items-center gap-2 px-2 py-1 hover:bg-accent">
                <span aria-hidden style={{ color: f.accent }}>{f.glyph}</span>
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="font-signal text-muted-foreground">{counts.get(f.slug) ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/forums" className="font-signal mt-2 inline-block text-primary hover:underline">[ All forums ]</Link>
      </Block>
    </aside>
  )
}

function Colonists() {
  const profiles = useProfiles()
  const { profile: me } = useMyProfile()
  const people = [...profiles.byUserId.values()].filter((p) => p.userId !== me?.userId).slice(-5).reverse()
  if (people.length === 0) return null

  return (
    <Block id="colonists" title="Colonists">
      <ul className="space-y-2">
        {people.map((p) => (
          <li key={p.userId} className="flex items-center gap-2.5">
            <Link to={`/u/${p.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
              <UserAvatar name={p.username} avatarKey={p.avatarKey} accent={p.accent} size={30} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold leading-tight hover:underline">@{p.username}</span>
                <span className="block truncate text-xs text-muted-foreground">{BODY_LABELS[p.homeBody ?? 'earth']}</span>
              </span>
            </Link>
            <Link to={`/messages?to=${p.username}`} className="font-signal text-primary hover:underline">[ msg ]</Link>
          </li>
        ))}
      </ul>
    </Block>
  )
}

function RightBlocks() {
  const { profile } = useMyProfile()
  return (
    <>
      <ColonyPulse />
      <SignalTimes home={profile?.homeBody ?? 'earth'} />
      <Colonists />
    </>
  )
}

/** "Stellar > Forums > p/Mars > Dust storm prep", worked out from the address. */
function Breadcrumbs({ pathname }: { pathname: string }) {
  const { threads } = useForumActivity()
  const [, first, second] = pathname.split('/')
  const crumbs: { label: string; to?: string }[] = [{ label: 'Stellar', to: '/home' }]

  if (first === 'home') crumbs.push({ label: 'Feed' })
  else if (first === 'post') crumbs.push({ label: 'Feed', to: '/home' }, { label: 'Transmission' })
  else if (first === 'forums') {
    crumbs.push({ label: 'Forums', to: second ? '/forums' : undefined })
    if (second) crumbs.push({ label: findForum(second)?.name ?? second })
  } else if (first === 'thread') {
    const thread = threads.find((t) => t.recordId === second)
    const forum = thread ? findForum(thread.data.forum) : undefined
    crumbs.push({ label: 'Forums', to: '/forums' })
    if (forum) crumbs.push({ label: forum.name, to: `/forums/${forum.slug}` })
    crumbs.push({ label: thread?.data.title ?? 'Discussion' })
  } else if (first === 'u') crumbs.push({ label: 'Colonists' }, { label: `@${decodeURIComponent(second ?? '')}` })
  else {
    const named: Record<string, string> = {
      messages: 'Messages', notifications: 'Notifications', search: 'Search', preferences: 'Settings',
      profile: 'Edit profile', map: 'Map', settings: 'Admin',
    }
    if (first && named[first]) crumbs.push({ label: named[first] })
  }

  return (
    <nav aria-label="Breadcrumb" className="font-signal mb-1 px-1 text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-2">
        {crumbs.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-2">
            {i > 0 && <span aria-hidden>&gt;</span>}
            {c.to && i < crumbs.length - 1 ? (
              <Link to={c.to} className="hover:text-foreground hover:underline">{c.label}</Link>
            ) : (
              <span aria-current={i === crumbs.length - 1 ? 'page' : undefined} className="max-w-[24ch] truncate text-foreground">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** True on extra-wide screens (Tailwind's xl, 1280px+), so the right blocks render in one place only. */
const XL = '(min-width: 1280px)'
function useIsXl(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(XL)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(XL).matches,
    () => false,
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  // The map and messages need the width, so they skip the right column.
  const wide = pathname.startsWith('/map') || pathname.startsWith('/messages')
  const blocksBelow = pathname === '/home' || pathname === '/forums'
  const isXl = useIsXl()

  return (
    <div
      className={cn(
        'mx-auto grid max-w-[1320px] items-start gap-6 px-3 py-4',
        wide ? 'lg:grid-cols-[210px_minmax(0,1fr)]' : 'lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_280px]',
      )}
    >
      <div className="sticky top-4 hidden lg:block">
        <LeftDrawer pathname={pathname} />
      </div>
      <div className="min-w-0">
        <Breadcrumbs pathname={pathname} />
        {children}
        {!wide && blocksBelow && !isXl && (
          <div className="mt-8 grid gap-5 p-1 sm:grid-cols-2">
            <RightBlocks />
          </div>
        )}
      </div>
      {!wide && isXl && (
        <aside aria-label="Stellar info" className="sticky top-4 max-h-[calc(100vh-6rem)] space-y-5 overflow-y-auto p-1">
          <RightBlocks />
        </aside>
      )}
    </div>
  )
}
