// Profiles: types, validation, and hooks to look people up by user id or @username.
import { createContext, useContext, useMemo } from 'react'
import { useAuth, useQuery } from 'deepspace'
import type { Body } from '../../lib/space'
import { OPERATORS } from './operators'

export type Profile = {
  userId?: string
  username: string
  displayName?: string
  bio?: string
  homeBody?: Body
  avatarKey?: string
  accent?: string
}

export type ProfileRecord = Profile & { recordId: string; userId: string }

export const DEFAULT_ACCENT = '#7c83fd'
export const ACCENTS = ['#7c83fd', '#e4572e', '#f5b700', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6', '#a0a4b8']

const RESERVED = new Set(['admin', 'deepspace', 'system', 'bot', ...OPERATORS.map((o) => o.handle)])

/** Returns an error message, or null if the username is allowed. */
export function usernameProblem(username: string): string | null {
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return 'Use 3–20 lowercase letters, numbers, or underscores.'
  if (RESERVED.has(username)) return 'That username is reserved.'
  return null
}

export type Profiles = {
  byUserId: Map<string, ProfileRecord>
  byUsername: Map<string, ProfileRecord>
  status: 'loading' | 'ready' | 'error'
}

const EMPTY: Profiles = { byUserId: new Map(), byUsername: new Map(), status: 'loading' }

/** Shared by the whole app. Filled once by <SocialProvider> (one live subscription instead of one per component). */
export const ProfilesContext = createContext<Profiles>(EMPTY)

/** Load every profile once and index it both ways. Only <SocialProvider> calls this. */
export function useProfilesQuery(): Profiles {
  const { records, status } = useQuery<Profile>('profiles', { limit: 1000 })
  return useMemo(() => {
    const byUserId = new Map<string, ProfileRecord>()
    const byUsername = new Map<string, ProfileRecord>()
    for (const r of records) {
      const userId = r.data.userId ?? r.createdBy
      const profile: ProfileRecord = { ...r.data, recordId: r.recordId, userId }
      byUserId.set(userId, profile)
      byUsername.set(r.data.username, profile)
    }
    return { byUserId, byUsername, status }
  }, [records, status])
}

/** Every profile, indexed by user id and by @username. */
export function useProfiles(): Profiles {
  return useContext(ProfilesContext)
}

/** The signed-in user's own profile (null if signed out or not set up yet). */
export function useMyProfile() {
  const { isSignedIn, userId } = useAuth()
  const profiles = useContext(ProfilesContext)
  const profile = isSignedIn && userId ? profiles.byUserId.get(userId) ?? null : null
  return {
    profile,
    isSignedIn: Boolean(isSignedIn),
    userId: userId ?? null,
    loading: Boolean(isSignedIn) && profiles.status === 'loading',
  }
}
