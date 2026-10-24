/**
 * App navigation.
 * - Desktop/tablet: a left rail with the wordmark, nav links, a Post button, and your account.
 * - Phones: a slim top bar, a bottom tab bar, and a floating Post button.
 * Links come from src/nav.ts (with role/dev filtering). Keep the data-testid hooks
 * (`app-navigation`, `nav-sign-in-button`, `nav-user-name`, `nav-user-email`) — the shipped tests use them.
 */

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthProfileReady, signOut } from 'deepspace'
import {
  Ellipsis, House, LogOut, Mail, Map as MapIcon, MessagesSquare, Pencil, Plus, Settings, Shield, User,
} from 'lucide-react'
import type { Role } from '../constants'
import { nav } from '../nav'
import { cn } from '../lib/utils'
import ComposeDialog from '../features/comms/ComposeDialog'
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
  '/preferences': Settings,
  '/settings': Shield,
}

/** The brand mark: a world with an orbit and a signal riding it. */
function Wordmark({ textClassName }: { textClassName: string }) {
  return (
    <Link to="/home" className="flex items-center gap-2.5 rounded-full p-2 hover:bg-accent/60" aria-label="Colony home">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="6.5" fill="#e4572e" />
        <ellipse cx="16" cy="16" rx="14" ry="5.5" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" transform="rotate(-24 16 16)" />
        <circle cx="28.2" cy="10.6" r="2.2" fill="var(--color-primary)" />
      </svg>
      <span className={cn('font-display text-xl font-bold tracking-tight', textClassName)}>Colony</span>
    </Link>
  )
}

export default function Navigation() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({ requireUser: true })
  const { profile } = useMyProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const [showSignIn, setShowSignIn] = useState(false)
  const [showCompose, setShowCompose] = useState(false)

  // Apply saved appearance settings (theme, text size, contrast, motion) once on load.
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
  const isActive = (path: string) =>
    path === '/profile-link'
      ? location.pathname.startsWith('/u/') || location.pathname === '/profile'
      : location.pathname === path || location.pathname.startsWith(path + '/')

  function onPost() {
    if (!isSignedIn) setShowSignIn(true)
    else if (!profile) navigate('/profile')
    else setShowCompose(true)
  }

  const railLink = (path: string, label: string, Icon: typeof House, to = path) => {
    const active = isActive(path)
    return (
      <Link
        key={path}
        to={to}
        aria-current={active ? 'page' : undefined}
        title={label}
        className={cn(
          'flex items-center gap-4 rounded-full p-3 text-lg transition-colors hover:bg-accent/60 xl:pr-6',
          active ? 'font-bold text-foreground' : 'text-foreground/85',
        )}
      >
        <Icon className="h-[26px] w-[26px] shrink-0" strokeWidth={active ? 2.5 : 1.75} aria-hidden />
        <span className="hidden xl:inline">{label}</span>
      </Link>
    )
  }

  const accountMenu = isSignedIn && user && (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Account menu"
            className="flex w-full items-center gap-3 rounded-full p-2 text-left transition-colors hover:bg-accent/60"
          >
            <UserAvatar name={profile?.username ?? user.name ?? '?'} avatarKey={profile?.avatarKey} accent={profile?.accent} size={40} />
            <span className="hidden min-w-0 flex-1 xl:block">
              <span data-testid="nav-user-name" className="block truncate font-bold leading-tight">
                {profile?.displayName || user.name || user.email}
              </span>
              <span className="block truncate text-sm text-muted-foreground">
                {profile ? `@${profile.username}` : 'Set up your profile'}
              </span>
            </span>
            <Ellipsis className="hidden h-5 w-5 text-muted-foreground xl:block" aria-hidden />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>
          <div className="truncate font-medium text-foreground">{profile ? `@${profile.username}` : user.name || 'Signed in'}</div>
          <div data-testid="nav-user-email" className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profile && (
          <DropdownMenuItem onClick={() => navigate(`/u/${profile.username}`)}>
            <User aria-hidden />
            My profile
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <Pencil aria-hidden />
          {profile ? 'Edit profile' : 'Set up profile'}
        </DropdownMenuItem>
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
  )

  // Phone tab bar: the four main places plus your profile.
  const tabs: { path: string; to: string; label: string; Icon: typeof House }[] = [
    { path: '/home', to: '/home', label: 'Home', Icon: House },
    { path: '/forums', to: '/forums', label: 'Forums', Icon: MessagesSquare },
    { path: '/messages', to: '/messages', label: 'Messages', Icon: Mail },
    { path: '/map', to: '/map', label: 'Map', Icon: MapIcon },
    { path: '/profile-link', to: isSignedIn ? profilePath : '/preferences', label: isSignedIn ? 'Profile' : 'Settings', Icon: isSignedIn ? User : Settings },
  ]

  return (
    <>
      {/* Desktop / tablet rail */}
      <aside
        data-testid="app-navigation"
        className="sticky top-0 hidden h-screen w-[84px] shrink-0 flex-col items-center border-r border-border px-2 py-3 md:flex xl:w-[260px] xl:items-stretch xl:px-4"
      >
        <Wordmark textClassName="hidden xl:inline" />
        <nav aria-label="Main" className="mt-2 flex flex-col items-center gap-1 xl:items-stretch">
          {visibleNav.map((item) => railLink(item.path, item.label, ICONS[item.path] ?? House))}
          {isSignedIn && railLink('/profile-link', 'Profile', User, profilePath)}
        </nav>

        <button
          type="button"
          onClick={onPost}
          aria-label="Write a post"
          className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-[0_6px_24px_-6px_var(--color-primary)] hover:brightness-105 xl:h-auto xl:w-full xl:py-3.5"
        >
          <Plus className="h-6 w-6 xl:hidden" aria-hidden />
          <span className="hidden xl:inline">Post</span>
        </button>

        <div className="mt-auto w-full">
          {!isLoaded ? null : isSignedIn && !profileReady ? (
            <div className="flex items-center gap-3 p-2">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="hidden h-4 w-28 animate-pulse rounded-md bg-muted xl:block" />
            </div>
          ) : isSignedIn && user ? (
            accountMenu
          ) : (
            <button
              data-testid="nav-sign-in-button"
              onClick={() => setShowSignIn(true)}
              className="w-full rounded-full border border-border px-3 py-2.5 font-bold hover:bg-accent/60"
            >
              <span className="hidden xl:inline">Sign in</span>
              <User className="mx-auto h-5 w-5 xl:hidden" aria-label="Sign in" />
            </button>
          )}
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-3 py-1.5 backdrop-blur md:hidden">
        {isSignedIn && user ? (
          <Link to={profilePath} aria-label="My profile">
            <UserAvatar name={profile?.username ?? user.name ?? '?'} avatarKey={profile?.avatarKey} accent={profile?.accent} size={32} />
          </Link>
        ) : (
          <button type="button" onClick={() => setShowSignIn(true)} className="rounded-full border border-border px-3 py-1 text-sm font-bold">
            Sign in
          </button>
        )}
        <Wordmark textClassName="" />
        <Link to="/preferences" aria-label="Settings" className="rounded-full p-2 hover:bg-accent/60">
          <Settings className="h-5 w-5" aria-hidden />
        </Link>
      </header>

      {/* Phone bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {tabs.map(({ path, to, label, Icon }) => {
          const active = isActive(path)
          return (
            <Link key={path} to={to} aria-label={label} aria-current={active ? 'page' : undefined} className="flex flex-col items-center gap-0.5 py-2 text-[11px]">
              <Icon className={cn('h-6 w-6', active ? 'text-foreground' : 'text-muted-foreground')} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
              <span className={active ? 'font-bold' : 'text-muted-foreground'}>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Phone floating Post button */}
      <button
        type="button"
        onClick={onPost}
        aria-label="Write a post"
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_28px_-6px_var(--color-primary)] md:hidden"
      >
        <Plus className="h-7 w-7" aria-hidden />
      </button>

      {showSignIn && <SignInDialog onClose={() => setShowSignIn(false)} />}
      {showCompose && <ComposeDialog onClose={() => setShowCompose(false)} />}
    </>
  )
}
