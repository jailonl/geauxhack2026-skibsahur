// Sharing rules with no UI: the text of a "shared vitals" message, and the public snapshot
// that shows on your profile when your vitals are set to Public.
import { BODY_LABELS, type Body } from '../../lib/space'
import { LEVEL_TEXT, VITAL_KEYS, checkMissionDose, checkReading, latest, missionDose, worst } from './limits'
import type { Vitals, VitalsRecord } from './types'

/** What the "vitalsPublic" collection stores (see src/schemas/vitals-public-schema.ts). */
export type PublicVitals = Omit<Vitals, 'note' | 'source'> & {
  userId?: string
  missionDose?: number
  takenAt?: number // newest reading, ms since 1970
}

/**
 * The DM text for a shared reading, e.g.
 *   [VITALS] @brandon shared a reading from Mars (10/24/2026, 9:41 PM)
 *   Overall: Warning
 *   - Good: Heart rate 72 bpm
 *   - Warning: Temperature 38.2 °C (38.0 °C or higher: fever)
 * Only "good" lines skip the reason, so warnings explain themselves.
 */
export function shareMessage(reading: Vitals, from: { username: string }, takenAt: string | number): string {
  const rows = checkReading(reading)
  const where = BODY_LABELS[(reading.body ?? 'earth') as Body]
  const when = new Date(takenAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
  const lines = [
    `[VITALS] @${from.username} shared a reading from ${where} (${when})`,
    `Overall: ${LEVEL_TEXT[worst(rows.map((r) => r.check.level))]}`,
    ...rows.map((r) =>
      `- ${LEVEL_TEXT[r.check.level]}: ${r.label} ${r.value}${r.check.level === 'ok' ? '' : ` (${r.check.reason})`}`,
    ),
  ]
  if (reading.note) lines.push(`Note: ${reading.note}`)
  return lines.join('\n')
}

/** Your latest value of every vital (each from the newest reading that has it), for your profile. */
export function publicSnapshot(records: VitalsRecord[]): PublicVitals | null {
  if (records.length === 0) return null
  const newest = records.reduce((a, b) => (Date.parse(b.createdAt) > Date.parse(a.createdAt) ? b : a))
  const snap: PublicVitals = { body: newest.data.body, takenAt: Date.parse(newest.createdAt) }
  for (const k of VITAL_KEYS) {
    if (k === 'systolic' || k === 'diastolic') continue // blood pressure: both numbers from one reading
    const last = latest(records, k)
    if (last) snap[k] = last.value
  }
  const bp = [...records]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .find((r) => r.data.systolic != null && r.data.diastolic != null)
  if (bp) {
    snap.systolic = bp.data.systolic
    snap.diastolic = bp.data.diastolic
  }
  if (records.some((r) => r.data.radiation != null)) snap.missionDose = Number(missionDose(records).toFixed(2))
  return snap
}

/** True if every value in `snap` is already stored, so there's nothing to update. */
export function sameSnapshot(stored: PublicVitals, snap: PublicVitals): boolean {
  return (Object.keys(snap) as (keyof PublicVitals)[]).every((k) => stored[k] === snap[k])
}

/** The rows shown on a profile: each vital with its heart, plus the mission total. */
export function publicRows(p: PublicVitals) {
  const rows = checkReading(p)
  if (p.missionDose != null) {
    rows.push({ label: 'Mission radiation', value: `${p.missionDose} mSv`, check: checkMissionDose(p.missionDose) })
  }
  return rows
}
