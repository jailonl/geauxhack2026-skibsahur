// Hooks for the two sharing features:
// - useVitalsVisibility: the Public / Private setting. Public keeps one copy of your latest vitals
//   in "vitalsPublic" (shown on your profile); Private deletes it. History in "vitals" never leaves you.
// - useShareVitals: sends a reading to people as a DM, with the same light-delay as Messages.
import { useEffect, useMemo } from 'react'
import { useAuth, useMutations, useQuery } from 'deepspace'
import { lightDelaySeconds, type Place } from '../../lib/space'
import { useSettings } from '../settings/settings'
import { OPERATORS } from '../social/operators'
import { useMyProfile, useProfiles } from '../social/profiles'
import { publicSnapshot, sameSnapshot, shareMessage, type PublicVitals } from './sharing'
import type { Vitals, VitalsRecord } from './types'

/** Your own readings, newest first. */
export function useMyVitals() {
  const { userId } = useAuth()
  const { records, status, error } = useQuery<Vitals>('vitals', { orderBy: 'createdAt', orderDir: 'desc', limit: 500 })
  // The server only sends your own rows; filtering again keeps it safe if that ever changes.
  const mine = useMemo(() => (records as VitalsRecord[]).filter((r) => r.createdBy === userId), [records, userId])
  return { records: mine, status, error }
}

/** Someone's public vitals (null if they keep them private). */
export function usePublicVitals(userId: string | null | undefined) {
  const { records } = useQuery<PublicVitals>('vitalsPublic', { where: { userId: userId ?? '-' }, limit: 1 })
  return useMemo(() => {
    const r = records.find((x) => (x.data.userId ?? x.createdBy) === userId)
    return r ? { recordId: r.recordId, data: r.data } : null
  }, [records, userId])
}

export function useVitalsVisibility() {
  const { userId } = useAuth()
  const { records } = useMyVitals()
  const published = usePublicVitals(userId)
  const { ready, create, put, remove } = useMutations<PublicVitals>('vitalsPublic')
  const snapshot = useMemo(() => publicSnapshot(records), [records])

  // While public, keep the profile copy up to date when you log or delete readings.
  useEffect(() => {
    if (!ready || !published || !snapshot) return
    if (!sameSnapshot(published.data, snapshot)) void put(published.recordId, snapshot)
  }, [ready, published, snapshot, put])

  return {
    ready: ready && Boolean(userId),
    isPublic: published != null,
    async setPublic(next: boolean) {
      if (next && !published) await create(snapshot ?? { takenAt: Date.now() })
      if (!next && published) await remove(published.recordId)
    },
  }
}

/** Someone a reading can be sent to: a colonist, or an AI operator (who will answer in character). */
export type ShareContact = { id: string; handle: string; name: string; body: Place; isOperator: boolean }

export function useShareVitals() {
  const { profile: me } = useMyProfile()
  const profiles = useProfiles()
  const { defaultSpeed } = useSettings()
  const { ready, create } = useMutations<{
    toId: string; participants: string[]; content: string; fromBody: Place; toBody: Place
    deliverAt: number; speed: number; wantsReply: number
  }>('dms')

  const contacts: ShareContact[] = useMemo(() => {
    const people = [...profiles.byUserId.values()]
      .filter((p) => p.userId !== me?.userId)
      .map((p) => ({ id: p.userId, handle: p.username, name: p.displayName || p.username, body: p.homeBody ?? 'earth', isOperator: false }))
      .sort((a, b) => a.handle.localeCompare(b.handle))
    const ops = OPERATORS.map((o) => ({ id: o.id, handle: o.handle, name: o.name, body: o.body, isOperator: true }))
    return [...people, ...ops]
  }, [profiles, me?.userId])

  return {
    ready: ready && me != null,
    contacts,
    speed: defaultSpeed,
    /** Sends one DM per person. Returns the longest wait until it arrives, in seconds. */
    async send(reading: Vitals, takenAt: string | number, to: ShareContact[]): Promise<number> {
      if (!me) throw new Error('Set up your profile first.')
      const myBody: Place = me.homeBody ?? 'earth'
      const content = shareMessage(reading, me, takenAt)
      const sentAt = Date.now()
      let longest = 0
      for (const c of to) {
        const delay = lightDelaySeconds(myBody, c.body, sentAt) / defaultSpeed
        longest = Math.max(longest, delay)
        await create({
          toId: c.id,
          participants: [c.id], // same as Messages: only the recipient (and you) can read it
          content,
          fromBody: myBody,
          toBody: c.body,
          deliverAt: Math.round(sentAt + delay * 1000),
          speed: defaultSpeed,
          wantsReply: c.isOperator ? 1 : 0,
        })
      }
      return longest
    },
  }
}
