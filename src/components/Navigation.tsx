/**
 * App navigation.
 * - Top bar (all sizes): wordmark, search, notifications bell, Post button, account menu.
 * - Tablets also get the main sections here; wide screens have them in the left drawer instead (AppShell).
 * - Phones: the sections move to a bottom tab bar, plus a floating Post button.
 * Links come from src/nav.ts (with role/dev filtering). Keep the data-testid hooks
 * (`app-navigation`, `nav-sign-in-button`, `nav-user-name`, `nav-user-email`) — the shipped tests use them.
 */

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthProfileReady, signOut } from 'deepspace'
import { Bell, House, LogOut, Mail, Map as MapIcon, MessagesSquare, Pencil, Plus, Search, Settings, Shield, User } from 'lucide-react'
import type { Role } from '../constants'
import { nav } from '../nav'
import { cn } from '../lib/utils'
import ComposeDialog from '../features/comms/ComposeDialog'
import { useNotifications } from '../features/notifications/notifications'
import { applySettings } from '../features/settings/settings'
import { SignInDialog } from '../features/social/SignIn'
import { useMyProfile } from '../features/social/profiles'
import UserAvatar from '../features/social/UserAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui'

const ICONS: Record<string, typeof House> = {
  '/home': House,
  '/forums': MessagesSquare,
  '/messages': Mail,
  '/map': MapIcon,
  '/settings': Shield,
}

/** The brand mark: just the word, set in the Silkscreen pixel font (no drawn logo, so no image assets). */
function Wordmark() {
  return (
    <Link to="/home" className="flex shrink-0 items-baseline gap-2 py-1 pr-2" aria-label="Colony, go to the feed">
      <span className="font-display text-2xl leading-none text-primary">Colony</span>
      <span className="font-signal hidden text-muted-foreground sm:inline">network</span>
    </Link>
  )
}

/** Bell with an unread count. */
function BellLink({ unread, className }: { unread: number; className?: string }) {
  return (
    <Link
      to="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      className={cn('relative rounded-full p-2 hover:bg-accent/60', className)}
    >
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-primary px-1 text-center text-[11px] font-bold leading-[1.15rem] text-primary-foreground">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}

export default function Navigation() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({ requireUser: true })
  const { profile } = useMyProfile()
  const { unread } = useNotifications()
  const location = useLocation()
  const navigate = useNavigate()
  const [showSignIn, setShowSignIn] = useState(false)
  const [showCompose, setShowCompose] = useState(false)

  // Apply saved appearance settings (theme, text size, font, contrast, motion) once on load.
  useEffect(() => {
    applySettings()
  }, [])

  const profileReady = !isSignedIn || (!userLoading && !!user)
  const userRole = (user?.role ?? 'anonymous') as Role | 'anonymous'
  const visibleNav = nav.filter((item) => {
    if (item.devOnly && !import.meta.env.DEV) return false
    if (!item.roles) return true
    if (!profileReady) return false
    if (userRole === 'admin') return true
    return item.roles.includes(userRole as Role)
  })

  const profilePath = profile ? `/u/${profile.username}` : '/profile'
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  function onPost() {
    if (!isSignedIn) setShowSignIn(true)
    else if (!profile) navigate('/profile')
    else setShowCompose(true)
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <>
      <header data-testid="app-navigation" className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-2 px-4">
          <Wordmark />

          {/* Main sections (tablet and up) */}
          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex lg:hidden">
            {visibleNav.map((item) => {
              const Icon = ICONS[item.path] ?? House
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3.5 py-2 text-[15px] transition-colors',
                    active ? 'bg-accent font-bold text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="sr-only lg:hidden">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="flex-1" />

          {/* Search (tablet and up); phones get the icon */}
          <form role="search" onSubmit={onSearch} className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 md:flex">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <label htmlFor="nav-search" className="sr-only">Search the colony</label>
            <input id="nav-search" name="q" placeholder="Search the colony" className="w-36 bg-transparent py-2 text-sm outline-none lg:w-52" />
          </form>
          <Link to="/search" aria-label="Search" className="rounded-full p-2 hover:bg-accent/60 md:hidden">
            <Search className="h-5 w-5" aria-hidden />
          </Link>

          {isSignedIn && <BellLink unread={unread} />}

          <button
            type="button"
            onClick={onPost}
            className="ml-1 hidden items-center gap-1.5 rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground shadow-[0_6px_20px_-8px_var(--color-primary)] hover:brightness-105 md:flex"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Post
          </button>

          {!isLoaded ? null : isSignedIn && !profileReady ? (
            <div className="ml-1 h-9 w-9 animate-pulse rounded-full bg-muted" />
          ) : isSignedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button aria-label="Account menu" className="ml-1 flex items-center gap-2 rounded-full p-0.5 hover:bg-accent/60">
                    <UserAvatar name={profile?.username ?? user.name ?? '?'} avatarKey={profile?.avatarKey} accent={profile?.accent} size={36} />
                    <span data-testid="nav-user-name" className="sr-only">{profile?.displayName || user.name || user.email}</span>
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="truncate font-medium text-foreground">{profile ? `@${profile.username}` : user.name || 'Signed in'}</div>
                  <div data-testid="nav-user-email" className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(profilePath)}>
                  <User aria-hidden />
                  {profile ? 'My profile' : 'Set up profile'}
                </DropdownMenuItem>
                {profile && (
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Pencil aria-hidden />
                    Edit profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate('/preferences')}>
                  <Settings aria-hidden />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/preferences" aria-label="Settings" className="rounded-full p-2 hover:bg-accent/60">
                <Settings className="h-5 w-5" aria-hidden />
              </Link>
              <button
                data-testid="nav-sign-in-button"
                onClick={() => setShowSignIn(true)}
                className="ml-1 rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-accent/60"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </header>

      {/* Phone bottom tab bar */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {visibleNav.filter((i) => !i.roles).slice(0, 4).map((item) => {
          const Icon = ICONS[item.path] ?? House
          const active = isActive(item.path)
          return (
            <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className="flex flex-col items-center gap-0.5 py-2 text-[11px]">
              <Icon className={cn('h-6 w-6', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
              <span className={active ? 'font-bold' : 'text-muted-foreground'}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Phone floating Post button */}
      <button
        type="button"
        onClick={onPost}
        aria-label="Write a post"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_28px_-6px_var(--color-primary)] md:hidden"
      >
        <Plus className="h-7 w-7" aria-hidden />
      </button>

      {showSignIn && <SignInDialog onClose={() => setShowSignIn(false)} />}
      {showCompose && <ComposeDialog onClose={() => setShowCompose(false)} />}
    </>
  )
}
