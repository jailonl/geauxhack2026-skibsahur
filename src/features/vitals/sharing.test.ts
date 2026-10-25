// Unit tests for sharing: the DM text and the public profile snapshot. Run with: npm run test:unit
import { describe, expect, it } from 'vitest'
import { publicRows, publicSnapshot, sameSnapshot, shareMessage } from './sharing'
import type { VitalsRecord } from './types'

const rec = (createdAt: string, data: VitalsRecord['data']): VitalsRecord => ({ recordId: createdAt, createdBy: 'me', createdAt, data })

describe('share message', () => {
  it('lists every reading with its level and explains warnings', () => {
    const text = shareMessage(
      { body: 'mars', heartRate: 72, temperature: 38.2, note: 'After EVA' },
      { username: 'brandon' },
      '2026-10-24T21:41:00Z',
    )
    expect(text).toMatch(/^\[VITALS\] @brandon shared a reading from Mars/)
    expect(text).toMatch(/Overall: Warning/)
    expect(text).toMatch(/- Good: Heart rate 72 bpm\n/)
    expect(text).toMatch(/- Warning: Temperature 38.2 °C \(.*fever\)/)
    expect(text).toMatch(/Note: After EVA$/)
  })
})

describe('public snapshot', () => {
  const records = [
    rec('2026-10-22T09:00:00Z', { body: 'mars', heartRate: 80, systolic: 118, diastolic: 76, radiation: 0.6 }),
    rec('2026-10-23T09:00:00Z', { body: 'mars', spo2: 97, radiation: 0.7 }),
  ]

  it('takes the latest value of each vital and the mission dose', () => {
    const snap = publicSnapshot(records)!
    expect(snap.heartRate).toBe(80)
    expect(snap.spo2).toBe(97)
    expect(snap.systolic).toBe(118)
    expect(snap.diastolic).toBe(76)
    expect(snap.missionDose).toBeCloseTo(1.3)
    expect(snap.takenAt).toBe(Date.parse('2026-10-23T09:00:00Z'))
    expect(publicSnapshot([])).toBeNull()
  })

  it('knows when nothing changed', () => {
    const snap = publicSnapshot(records)!
    expect(sameSnapshot({ ...snap, userId: 'me' }, snap)).toBe(true)
    expect(sameSnapshot({ ...snap, heartRate: 81 }, snap)).toBe(false)
  })

  it('profile rows include the mission total', () => {
    const rows = publicRows(publicSnapshot(records)!)
    expect(rows.map((r) => r.label)).toContain('Mission radiation')
    expect(rows.find((r) => r.label === 'Blood pressure')?.value).toBe('118/76 mmHg')
  })
})
