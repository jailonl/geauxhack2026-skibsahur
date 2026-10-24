// Profiles: types, validation, and hooks to look people up by user id or @username.
import { useMemo } from 'react'
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

/** Every profile, indexed both ways. Call once per page and pass it down, rather than once per card. */
export function useProfiles() {
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

export type Profiles = ReturnType<typeof useProfiles>

/** The signed-in user's own profile (null if signed out or not set up yet). */
export function useMyProfile() {
  const { isSignedIn, userId } = useAuth()
  const { records, status } = useQuery<Profile>('profiles', {
    where: { userId: userId ?? '__signed_out__' },
    limit: 1,
  })
  const record = records[0]
  const profile: ProfileRecord | null =
    isSignedIn && userId && record ? { ...record.data, recordId: record.recordId, userId } : null
  return { profile, isSignedIn: Boolean(isSignedIn), userId: userId ?? null, loading: isSignedIn && status === 'loading' }
}
