// Vitals rules with no UI: the safety limits, the checks, and the mission radiation total.
// Every limit comes from a real medical or NASA source (listed in LIMIT_NOTES, shown on the page).
// Levels: 'ok' (normal), 'caution' (keep an eye on it), 'danger' (act now).
import { ALL_PLACES, type Place } from '../../lib/space'
import type { Check, Level, VitalKey, Vitals, VitalsRecord } from './types'

// ---- The limits ----------------------------------------------------------------

// Resting heart rate, beats per minute. Normal adult resting rate is 60–100 (American Heart Association).
// Fit people can sit in the 50s, so caution starts below 50.
export const HEART_RATE = { dangerLow: 40, cautionLow: 50, cautionHigh: 100, dangerHigh: 130 }

// Blood oxygen (SpO2), %. 95–100 is normal; below 90 is hypoxemia and needs oxygen.
export const SPO2 = { caution: 95, danger: 90 }

// Blood pressure, mmHg (2017 ACC/AHA guideline).
// 130/80 or higher is high (stage 1). Above 180 or 120 is a hypertensive crisis.
// Under 90/60 is low blood pressure, which matters in space: fluid shifts make astronauts dizzy on landing.
export const BLOOD_PRESSURE = {
  cautionSystolic: 130, cautionDiastolic: 80,
  dangerSystolic: 180, dangerDiastolic: 120,
  lowSystolic: 90, lowDiastolic: 60,
}

// Body temperature, °C. Fever is 38.0+. 40.0+ is heat stroke range. Under 35.0 is hypothermia.
export const TEMPERATURE = { dangerLow: 35.0, cautionLow: 36.0, cautionHigh: 38.0, dangerHigh: 40.0 }

// Radiation dose in one day, mSv.
// 1.84 mSv/day is what Curiosity's RAD measured in deep space on the way to Mars, so more than that
// means something unusual. 8.3 mSv/day is the pace that would use up NASA's old 30-day limit
// (250 mSv in 30 days) — usually a solar storm, so get to the shelter.
export const RADIATION_DAY = { caution: 1.84, danger: 8.3 }

// Total radiation for the mission, mSv. NASA's career limit is 600 mSv (NASA-STD-3001, 2022).
// Caution at 80% of it.
export const CAREER_LIMIT_MSV = 600
export const MISSION_DOSE = { caution: CAREER_LIMIT_MSV * 0.8, danger: CAREER_LIMIT_MSV }

// Supplies, days left. Colony rule (not a medical limit): order more under 30 days, emergency under 7.
export const SUPPLY_DAYS = { caution: 30, danger: 7 }

// Typical daily dose by world, mSv/day. Used by the "Read sensors" demo and shown for comparison.
// Measured: Earth ~2.4 mSv/year world average. Station: ISS, ~0.5/day. Moon: Chang'e 4 measured 1.37/day.
// Mars: Curiosity measured 0.64/day on the surface.
// Everywhere else there's no surface measurement, so we use the deep-space level Curiosity measured
// on the way to Mars (1.84/day). Real surfaces can be far worse (Europa's is thousands of mSv a day
// from Jupiter's belts), which is why colonies there would live under ice or rock.
export const DEEP_SPACE_DOSE = 1.84
const MEASURED_DOSE = { earth: 0.0066, station: 0.5, moon: 1.37, mars: 0.64 } as const
export const DOSE_MEASURED: ReadonlySet<Place> = new Set(Object.keys(MEASURED_DOSE) as Place[])
export const BACKGROUND_DOSE: Record<Place, number> = Object.fromEntries(
  ALL_PLACES.map((p) => [p, (MEASURED_DOSE as Record<string, number>)[p] ?? DEEP_SPACE_DOSE]),
) as Record<Place, number>

// ---- What each number field is, and what values are possible at all ------------
// min/max here catch typos (a heart rate of 700), not health problems.

export type FieldInfo = { key: VitalKey; label: string; unit: string; min: number; max: number; step: number }

export const FIELDS: Record<VitalKey, FieldInfo> = {
  heartRate: { key: 'heartRate', label: 'Heart rate', unit: 'bpm', min: 20, max: 250, step: 1 },
  spo2: { key: 'spo2', label: 'Blood oxygen', unit: '%', min: 50, max: 100, step: 1 },
  systolic: { key: 'systolic', label: 'Systolic', unit: 'mmHg', min: 50, max: 260, step: 1 },
  diastolic: { key: 'diastolic', label: 'Diastolic', unit: 'mmHg', min: 30, max: 160, step: 1 },
  temperature: { key: 'temperature', label: 'Body temperature', unit: '°C', min: 30, max: 45, step: 0.1 },
  radiation: { key: 'radiation', label: 'Radiation today', unit: 'mSv', min: 0, max: 5000, step: 0.01 },
  oxygenDays: { key: 'oxygenDays', label: 'Oxygen', unit: 'days', min: 0, max: 3650, step: 1 },
  waterDays: { key: 'waterDays', label: 'Water', unit: 'days', min: 0, max: 3650, step: 1 },
  foodDays: { key: 'foodDays', label: 'Food', unit: 'days', min: 0, max: 3650, step: 1 },
}

export const VITAL_KEYS = Object.keys(FIELDS) as VitalKey[]

// ---- Checks ----------------------------------------------------------------------

const OK = (reason = 'Normal'): Check => ({ level: 'ok', reason })

export function checkHeartRate(bpm: number): Check {
  const h = HEART_RATE
  if (bpm < h.dangerLow) return { level: 'danger', reason: `Under ${h.dangerLow} bpm: very slow heart rate` }
  if (bpm > h.dangerHigh) return { level: 'danger', reason: `Over ${h.dangerHigh} bpm at rest: very fast heart rate` }
  if (bpm < h.cautionLow) return { level: 'caution', reason: `Under ${h.cautionLow} bpm: slow (fine if you're very fit)` }
  if (bpm > h.cautionHigh) return { level: 'caution', reason: `Over ${h.cautionHigh} bpm at rest: fast heart rate` }
  return OK('Normal resting rate')
}

export function checkSpo2(percent: number): Check {
  if (percent < SPO2.danger) return { level: 'danger', reason: `Under ${SPO2.danger}%: low blood oxygen (hypoxemia)` }
  if (percent < SPO2.caution) return { level: 'caution', reason: `Under ${SPO2.caution}%: below normal` }
  return OK()
}

export function checkBloodPressure(systolic: number, diastolic: number): Check {
  const b = BLOOD_PRESSURE
  if (systolic > b.dangerSystolic || diastolic > b.dangerDiastolic) {
    return { level: 'danger', reason: `Over ${b.dangerSystolic}/${b.dangerDiastolic}: hypertensive crisis` }
  }
  if (systolic < b.lowSystolic || diastolic < b.lowDiastolic) {
    return { level: 'caution', reason: `Under ${b.lowSystolic}/${b.lowDiastolic}: low blood pressure` }
  }
  if (systolic >= b.cautionSystolic || diastolic >= b.cautionDiastolic) {
    return { level: 'caution', reason: `${b.cautionSystolic}/${b.cautionDiastolic} or higher: high blood pressure` }
  }
  return OK()
}

export function checkTemperature(celsius: number): Check {
  const t = TEMPERATURE
  if (celsius >= t.dangerHigh) return { level: 'danger', reason: `${t.dangerHigh.toFixed(1)} °C or higher: heat stroke range` }
  if (celsius < t.dangerLow) return { level: 'danger', reason: `Under ${t.dangerLow.toFixed(1)} °C: hypothermia` }
  if (celsius >= t.cautionHigh) return { level: 'caution', reason: `${t.cautionHigh.toFixed(1)} °C or higher: fever` }
  if (celsius < t.cautionLow) return { level: 'caution', reason: `Under ${t.cautionLow.toFixed(1)} °C: running cold` }
  return OK()
}

export function checkRadiationDay(mSv: number): Check {
  if (mSv > RADIATION_DAY.danger) return { level: 'danger', reason: 'Solar storm levels: go to the shelter' }
  if (mSv > RADIATION_DAY.caution) return { level: 'caution', reason: `Above deep-space level (${RADIATION_DAY.caution} mSv/day)` }
  return OK('Normal background')
}

export function checkMissionDose(mSv: number): Check {
  const pct = Math.round((mSv / CAREER_LIMIT_MSV) * 100)
  if (mSv >= MISSION_DOSE.danger) return { level: 'danger', reason: `At NASA's ${CAREER_LIMIT_MSV} mSv career limit` }
  if (mSv >= MISSION_DOSE.caution) return { level: 'caution', reason: `${pct}% of NASA's career limit` }
  return OK(`${pct}% of NASA's career limit`)
}

export function checkSupply(days: number): Check {
  if (days < SUPPLY_DAYS.danger) return { level: 'danger', reason: `Under ${SUPPLY_DAYS.danger} days left: emergency` }
  if (days < SUPPLY_DAYS.caution) return { level: 'caution', reason: `Under ${SUPPLY_DAYS.caution} days left: resupply soon` }
  return OK('Stocked')
}

/** The level in words (shown next to or instead of the 8-bit heart). */
export const LEVEL_TEXT: Record<Level, string> = { ok: 'Good', caution: 'Warning', danger: 'Danger' }

const RANK: Record<Level, number> = { ok: 0, caution: 1, danger: 2 }

/** The most serious level in a list (ok if the list is empty). */
export function worst(levels: Level[]): Level {
  return levels.reduce<Level>((a, b) => (RANK[b] > RANK[a] ? b : a), 'ok')
}

// ---- Putting readings together -----------------------------------------------------

/**
 * Total mission radiation in mSv. Readings are "dose today", so if you log twice in one day
 * only the latest reading for that day counts (otherwise the same day would be added twice).
 */
export function missionDose(records: Pick<VitalsRecord, 'data' | 'createdAt'>[]): number {
  const perDay = new Map<string, { at: number; mSv: number }>()
  for (const r of records) {
    const mSv = r.data.radiation
    if (mSv == null || !Number.isFinite(mSv)) continue
    const at = Date.parse(r.createdAt)
    const day = new Date(at).toISOString().slice(0, 10) // UTC date, e.g. "2026-10-24"
    const seen = perDay.get(day)
    if (!seen || at > seen.at) perDay.set(day, { at, mSv })
  }
  let total = 0
  for (const d of perDay.values()) total += d.mSv
  return total
}

/** Newest value of a field across readings (null if never logged), with when it was logged. */
export function latest(records: VitalsRecord[], key: VitalKey): { value: number; at: string } | null {
  let best: { value: number; at: string } | null = null
  for (const r of records) {
    const v = r.data[key]
    if (v == null || !Number.isFinite(v)) continue
    if (!best || Date.parse(r.createdAt) > Date.parse(best.at)) best = { value: v, at: r.createdAt }
  }
  return best
}

/** Oldest-to-newest values of a field, for the little trend line on each card. */
export function history(records: VitalsRecord[], key: VitalKey, count = 12): number[] {
  return records
    .filter((r) => r.data[key] != null && Number.isFinite(r.data[key]))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(-count)
    .map((r) => r.data[key] as number)
}

/** Every check that applies to one reading (only for fields that were filled in), with the value as text. */
export function checkReading(v: Vitals): { label: string; value: string; check: Check }[] {
  const out: { label: string; value: string; check: Check }[] = []
  if (v.heartRate != null) out.push({ label: 'Heart rate', value: `${v.heartRate} bpm`, check: checkHeartRate(v.heartRate) })
  if (v.spo2 != null) out.push({ label: 'Blood oxygen', value: `${v.spo2}%`, check: checkSpo2(v.spo2) })
  if (v.systolic != null && v.diastolic != null) {
    out.push({ label: 'Blood pressure', value: `${v.systolic}/${v.diastolic} mmHg`, check: checkBloodPressure(v.systolic, v.diastolic) })
  }
  if (v.temperature != null) out.push({ label: 'Temperature', value: `${v.temperature.toFixed(1)} °C`, check: checkTemperature(v.temperature) })
  if (v.radiation != null) out.push({ label: 'Radiation today', value: `${v.radiation} mSv`, check: checkRadiationDay(v.radiation) })
  if (v.oxygenDays != null) out.push({ label: 'Oxygen', value: `${v.oxygenDays} days`, check: checkSupply(v.oxygenDays) })
  if (v.waterDays != null) out.push({ label: 'Water', value: `${v.waterDays} days`, check: checkSupply(v.waterDays) })
  if (v.foodDays != null) out.push({ label: 'Food', value: `${v.foodDays} days`, check: checkSupply(v.foodDays) })
  return out
}

/** Returns an error message for the form, or null if the reading can be saved. */
export function readingProblem(v: Vitals): string | null {
  const filled = VITAL_KEYS.filter((k) => v[k] != null)
  if (filled.length === 0) return 'Fill in at least one reading.'
  for (const k of filled) {
    const value = v[k] as number
    const f = FIELDS[k]
    if (!Number.isFinite(value)) return `${f.label} must be a number.`
    if (value < f.min || value > f.max) return `${f.label} should be between ${f.min} and ${f.max} ${f.unit}.`
  }
  if ((v.systolic == null) !== (v.diastolic == null)) return 'Blood pressure needs both numbers (like 120 / 80).'
  if (v.systolic != null && v.diastolic != null && v.systolic <= v.diastolic) {
    return 'The first blood pressure number (systolic) should be higher than the second.'
  }
  return null
}

// ---- Shown on the page under "Safety limits" ----------------------------------------

export const LIMIT_NOTES: { name: string; normal: string; caution: string; danger: string; source: string }[] = [
  { name: 'Heart rate (resting)', normal: '50–100 bpm', caution: '40–49 or 101–130', danger: '<40 or >130', source: 'American Heart Association' },
  { name: 'Blood oxygen', normal: '95–100%', caution: '90–94%', danger: '<90%', source: 'Hypoxemia threshold' },
  { name: 'Blood pressure', normal: 'under 130 and under 80', caution: 'top ≥130, bottom ≥80, or <90/60', danger: '>180/120', source: '2017 ACC/AHA guideline' },
  { name: 'Temperature', normal: '36.0–37.9 °C', caution: '35.0–35.9 or 38.0–39.9', danger: '<35.0 or ≥40.0', source: 'Fever / hypothermia / heat stroke' },
  { name: 'Radiation (day)', normal: '≤1.84 mSv', caution: '1.84–8.3 mSv', danger: '>8.3 mSv', source: 'Curiosity RAD; NASA 30-day limit pace' },
  { name: 'Radiation (mission)', normal: '<480 mSv', caution: '480–599 mSv', danger: '≥600 mSv', source: 'NASA-STD-3001 career limit' },
  { name: 'Oxygen / water / food', normal: '≥30 days', caution: '7–29 days', danger: '<7 days', source: 'Colony resupply rule' },
]
