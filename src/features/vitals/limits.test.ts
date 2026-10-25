// Unit tests for the vitals rules. Run with: npm run test:unit
import { describe, expect, it } from 'vitest'
import {
  checkBloodPressure, checkHeartRate, checkMissionDose, checkRadiationDay, checkSpo2, checkSupply,
  checkTemperature, latest, missionDose, readingProblem, worst,
} from './limits'
import { simulateReading } from './simulate'
import type { VitalsRecord } from './types'

const rec = (createdAt: string, data: VitalsRecord['data']): VitalsRecord => ({ recordId: createdAt, createdBy: 'me', createdAt, data })

describe('safety limits', () => {
  it('heart rate', () => {
    expect(checkHeartRate(72).level).toBe('ok')
    expect(checkHeartRate(45).level).toBe('caution')
    expect(checkHeartRate(110).level).toBe('caution')
    expect(checkHeartRate(35).level).toBe('danger')
    expect(checkHeartRate(140).level).toBe('danger')
  })

  it('blood oxygen', () => {
    expect(checkSpo2(98).level).toBe('ok')
    expect(checkSpo2(95).level).toBe('ok')
    expect(checkSpo2(92).level).toBe('caution')
    expect(checkSpo2(89).level).toBe('danger')
  })

  it('blood pressure', () => {
    expect(checkBloodPressure(118, 76).level).toBe('ok')
    expect(checkBloodPressure(130, 70).level).toBe('caution') // stage 1 by the top number
    expect(checkBloodPressure(120, 80).level).toBe('caution') // stage 1 by the bottom number
    expect(checkBloodPressure(85, 55).level).toBe('caution') // low
    expect(checkBloodPressure(185, 100).level).toBe('danger')
    expect(checkBloodPressure(150, 125).level).toBe('danger')
  })

  it('temperature', () => {
    expect(checkTemperature(36.8).level).toBe('ok')
    expect(checkTemperature(38.0).level).toBe('caution')
    expect(checkTemperature(35.5).level).toBe('caution')
    expect(checkTemperature(40.0).level).toBe('danger')
    expect(checkTemperature(34.9).level).toBe('danger')
  })

  it('radiation and supplies', () => {
    expect(checkRadiationDay(0.64).level).toBe('ok') // Mars surface
    expect(checkRadiationDay(1.84).level).toBe('ok') // exactly deep-space cruise
    expect(checkRadiationDay(3).level).toBe('caution')
    expect(checkRadiationDay(9).level).toBe('danger')
    expect(checkMissionDose(100).level).toBe('ok')
    expect(checkMissionDose(480).level).toBe('caution')
    expect(checkMissionDose(600).level).toBe('danger')
    expect(checkSupply(45).level).toBe('ok')
    expect(checkSupply(29).level).toBe('caution')
    expect(checkSupply(6).level).toBe('danger')
  })

  it('worst level wins', () => {
    expect(worst([])).toBe('ok')
    expect(worst(['ok', 'caution', 'ok'])).toBe('caution')
    expect(worst(['caution', 'danger', 'ok'])).toBe('danger')
  })
})

describe('mission dose', () => {
  it('counts only the latest reading for each day', () => {
    const records = [
      rec('2026-10-20T08:00:00Z', { radiation: 0.6 }),
      rec('2026-10-20T20:00:00Z', { radiation: 0.7 }), // replaces the morning reading
      rec('2026-10-21T09:00:00Z', { radiation: 0.5 }),
      rec('2026-10-22T09:00:00Z', { heartRate: 70 }), // no radiation logged
    ]
    expect(missionDose(records)).toBeCloseTo(1.2)
  })

  it('latest finds the newest value of a field', () => {
    const records = [
      rec('2026-10-21T09:00:00Z', { heartRate: 80 }),
      rec('2026-10-22T09:00:00Z', { spo2: 97 }),
      rec('2026-10-20T09:00:00Z', { heartRate: 60 }),
    ]
    expect(latest(records, 'heartRate')?.value).toBe(80)
    expect(latest(records, 'temperature')).toBeNull()
  })
})

describe('form validation', () => {
  it('needs at least one number', () => {
    expect(readingProblem({})).toMatch(/at least one/)
  })
  it('catches typos and half a blood pressure', () => {
    expect(readingProblem({ heartRate: 700 })).toMatch(/between/)
    expect(readingProblem({ systolic: 120 })).toMatch(/both numbers/)
    expect(readingProblem({ systolic: 70, diastolic: 80 })).toMatch(/higher/)
    expect(readingProblem({ heartRate: 72, systolic: 120, diastolic: 80 })).toBeNull()
  })
  it('simulated readings are always valid', () => {
    for (const body of ['earth', 'moon', 'mars', 'station'] as const) {
      for (let i = 0; i < 200; i++) expect(readingProblem(simulateReading(body))).toBeNull()
    }
  })
  it('simulated supplies count down', () => {
    const r = simulateReading('mars', { oxygenDays: 50, waterDays: 0.2, foodDays: 10 })
    expect(r.oxygenDays).toBeLessThan(50)
    expect(r.waterDays).toBe(0) // never below zero
  })
})
