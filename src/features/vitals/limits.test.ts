// Unit tests for the vitals rules, the alien limits, the colony numbers, and the survival rating.
// Run with: npm run test:unit
import { describe, expect, it } from 'vitest'
import { ALL_PLACES } from '../../lib/space'
import { ALIENS, HUMAN_WORLDS, alienFor } from './aliens'
import {
  PLACE_INFO, colonyNow, dayNumber, missionDose, radiationLimits, radiationOnDay, suppliesOn, supplyLimits,
} from './colony'
import {
  checkBloodPressure, checkHeartRate, checkMissionDose, checkRadiationDay, checkReading, checkSpo2, checkSupply,
  checkTemperature, formatChance, latest, limitNotes, readingProblem, survivalRating, worst,
} from './limits'
import { simulateReading } from './simulate'
import type { VitalsRecord } from './types'

const rec = (createdAt: string, data: VitalsRecord['data']): VitalsRecord => ({ recordId: createdAt, createdBy: 'me', createdAt, data })

describe('human safety limits', () => {
  it('heart rate', () => {
    expect(checkHeartRate(72).level).toBe('ok')
    expect(checkHeartRate(45).level).toBe('caution')
    expect(checkHeartRate(110).level).toBe('caution')
    expect(checkHeartRate(35).level).toBe('danger')
    expect(checkHeartRate(140).level).toBe('danger')
  })

  it('blood oxygen', () => {
    expect(checkSpo2(98).level).toBe('ok')
    expect(checkSpo2(92).level).toBe('caution')
    expect(checkSpo2(89).level).toBe('danger')
  })

  it('blood pressure', () => {
    expect(checkBloodPressure(118, 76).level).toBe('ok')
    expect(checkBloodPressure(130, 70).level).toBe('caution')
    expect(checkBloodPressure(85, 55).level).toBe('caution')
    expect(checkBloodPressure(185, 100).level).toBe('danger')
  })

  it('temperature', () => {
    expect(checkTemperature(36.8).level).toBe('ok')
    expect(checkTemperature(38.0).level).toBe('caution')
    expect(checkTemperature(40.0).level).toBe('danger')
    expect(checkTemperature(34.9).level).toBe('danger')
  })

  it('worst level wins', () => {
    expect(worst([])).toBe('ok')
    expect(worst(['ok', 'caution', 'ok'])).toBe('caution')
    expect(worst(['caution', 'danger', 'ok'])).toBe('danger')
  })
})

describe('who lives where', () => {
  it('humans on Earth, the Moon, and the station; an alien everywhere else', () => {
    expect(HUMAN_WORLDS).toEqual(['earth', 'moon', 'station'])
    for (const p of ALL_PLACES) expect(alienFor(p) == null).toBe(HUMAN_WORLDS.includes(p))
    expect(alienFor('mars')?.name).toBe('Rhul')
    expect(alienFor('titan')?.name).toBe('Ossk')
  })

  it('every alien band is in order (danger < watch < normal < watch < danger)', () => {
    for (const a of Object.values(ALIENS)) {
      for (const b of [a!.heartRate, a!.gas, a!.systolic, a!.diastolic, a!.temperature]) {
        expect(b.dangerLow <= b.cautionLow && b.cautionLow < b.cautionHigh && b.cautionHigh <= b.dangerHigh).toBe(true)
      }
      expect(a!.radiation.caution).toBeLessThan(a!.radiation.danger)
    }
  })

  it('the same number means different things on different worlds', () => {
    // A heart rate of 400 is deadly for a human and normal for a Pyrrax on Io.
    expect(checkReading({ body: 'earth', heartRate: 400 })[0].check.level).toBe('danger')
    expect(checkReading({ body: 'io', heartRate: 400 })[0].check.level).toBe('ok')
    // -180 °C is a healthy Ossk on Titan.
    expect(checkReading({ body: 'titan', temperature: -180 })[0].check.level).toBe('ok')
    expect(checkReading({ body: 'titan', temperature: -150 })[0].check.level).toBe('danger')
  })

  it('aliens get wider input ranges than humans', () => {
    expect(readingProblem({ body: 'earth', heartRate: 400 })).toMatch(/between/)
    expect(readingProblem({ body: 'io', heartRate: 400 })).toBeNull()
    expect(readingProblem({ body: 'kuiper', temperature: -230 })).toBeNull()
    expect(readingProblem({ body: 'kuiper', temperature: -300 })).toMatch(/between/) // below absolute zero
  })
})

describe('colony numbers', () => {
  const at = Date.parse('2026-10-25T12:00:00Z')

  it('are the same for everyone at the same moment', () => {
    for (const p of ALL_PLACES) expect(colonyNow(p, at)).toEqual(colonyNow(p, at))
  })

  it('radiation stays near each world\'s normal dose, with occasional storms', () => {
    const today = dayNumber(at)
    for (const p of ALL_PLACES) {
      const days = Array.from({ length: 365 }, (_, i) => radiationOnDay(p, today - i))
      const calm = days.filter((d) => !d.storm)
      for (const d of calm) {
        expect(d.mSv).toBeGreaterThanOrEqual(Number((PLACE_INFO[p].dose * 0.84).toFixed(4)))
        expect(d.mSv).toBeLessThanOrEqual(PLACE_INFO[p].dose * 1.16)
      }
    }
    expect(Array.from({ length: 365 }, (_, i) => radiationOnDay('proxima', today - i)).some((d) => d.storm)).toBe(true)
    expect(Array.from({ length: 365 }, (_, i) => radiationOnDay('earth', today - i)).some((d) => d.storm)).toBe(false)
  })

  it('supplies count down a day at a time between deliveries', () => {
    const d = dayNumber(at)
    for (const p of ALL_PLACES) {
      const a = suppliesOn(p, d)
      const b = suppliesOn(p, d + 1)
      if (a.nextArrival > 1 && !a.fault && !b.fault) expect(b.foodDays).toBe(a.foodDays - 1)
    }
  })

  it('limits depend on the world', () => {
    expect(supplyLimits('mars').danger).toBeGreaterThan(supplyLimits('moon').danger) // help takes longer to reach Mars
    expect(radiationLimits('earth').caution).toBeLessThan(radiationLimits('moon').caution)
    expect(checkSupply(100, 'moon').level).toBe('ok')
    expect(checkSupply(100, 'mars').level).toBe('danger') // 100 days of food on Mars is an emergency
    expect(checkRadiationDay(2, 'earth').level).toBe('caution')
    expect(checkRadiationDay(2, 'moon').level).toBe('ok')
    expect(checkRadiationDay(50, 'io').level).toBe('ok') // a Pyrrax shrugs it off
    expect(checkMissionDose(500, 'earth').level).toBe('caution') // 83% of NASA's 600 mSv
    expect(checkMissionDose(500, 'mars').level).toBe('ok') // Rhul lifetime limit is 3000
  })

  it('mission dose adds up each day and follows moves between worlds', () => {
    const start = Date.parse('2026-10-01T12:00:00Z')
    const end = Date.parse('2026-10-10T12:00:00Z')
    const onMoon = missionDose([{ at: start, place: 'moon' }], 'moon', start, end)
    expect(onMoon).toBeGreaterThan(10 * 1.37 * 0.8)
    const movedToEarth = missionDose([{ at: start, place: 'moon' }, { at: start + 2 * 86_400_000, place: 'earth' }], 'moon', start, end)
    expect(movedToEarth).toBeLessThan(onMoon)
  })
})

describe('survival rating', () => {
  it('is 100% when everything is good', () => {
    const s = survivalRating(checkReading({ body: 'earth', heartRate: 70, spo2: 98 }))
    expect(s.score).toBe(100)
    expect(s.label).toBe('Thriving')
  })
  it('multiplies the chance of each problem', () => {
    const one = survivalRating(checkReading({ body: 'earth', heartRate: 70, spo2: 98, systolic: 118, diastolic: 76, temperature: 38.2 }))
    expect(one.score).toBe(92) // one warning
    expect(one.label).toBe('Stable')
    const two = survivalRating(checkReading({ body: 'earth', heartRate: 110, temperature: 38.2 }))
    expect(two.score).toBe(85) // 92% × 92%
    const danger = survivalRating(checkReading({ body: 'earth', heartRate: 70, spo2: 85 }))
    expect(danger.score).toBe(45)
    expect(danger.label).toBe('Critical')
    const both = survivalRating(checkReading({ body: 'earth', heartRate: 110, spo2: 85 }))
    expect(both.score).toBe(41) // 92% × 45%
  })
  it('lists each reading with its own chance', () => {
    const s = survivalRating(checkReading({ body: 'mars', heartRate: 30, temperature: 0 }))
    expect(s.steps.map((x) => x.label)).toEqual(['Heart rate', 'Temperature'])
    expect(s.steps[1].chance).toBe(92) // 0 °C is warm for a Rhul
    expect(formatChance(0)).toBe('<1%')
    expect(formatChance(92)).toBe('92%')
  })
})

describe('readings and the form', () => {
  it('latest finds the newest value of a field', () => {
    const records = [
      rec('2026-10-21T09:00:00Z', { heartRate: 80 }),
      rec('2026-10-22T09:00:00Z', { spo2: 97 }),
      rec('2026-10-20T09:00:00Z', { heartRate: 60 }),
    ]
    expect(latest(records, 'heartRate')?.value).toBe(80)
    expect(latest(records, 'temperature')).toBeNull()
  })
  it('needs at least one health number', () => {
    expect(readingProblem({ body: 'earth', radiation: 1, foodDays: 10 })).toMatch(/at least one/)
    expect(readingProblem({ body: 'earth', systolic: 120 })).toMatch(/both numbers/)
    expect(readingProblem({ body: 'earth', systolic: 70, diastolic: 80 })).toMatch(/higher/)
  })
  it('simulated readings are always valid, for humans and aliens', () => {
    for (const body of ALL_PLACES) {
      for (let i = 0; i < 200; i++) expect(readingProblem(simulateReading(body))).toBeNull()
    }
  })
  it('every world has a limits table', () => {
    for (const p of ALL_PLACES) expect(limitNotes(p).length).toBeGreaterThanOrEqual(7)
  })
})
