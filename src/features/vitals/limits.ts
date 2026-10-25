// Vitals rules with no UI: the safety limits and the checks.
// Humans (Earth, Moon, station) get real medical limits. Everywhere else you're that world's alien,
// with its own limits (aliens.ts). Radiation and supply limits depend on the world too
// (colony.ts), because what's normal on the Moon isn't normal on Earth.
// Levels: 'ok' (normal), 'caution' (keep an eye on it), 'danger' (act now).
import { BODY_LABELS, type Place } from '../../lib/space'
import { alienFor, type Band } from './aliens'
import { CAREER_LIMIT_MSV, PLACE_INFO, checkSupply, radiationLimits, supplyLimits } from './colony'
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

// ---- What each number field is, and what values are possible at all ------------
// min/max here catch typos (a human heart rate of 700), not health problems. Aliens get much wider
// ranges, since a Pyrrax runs at 400 °C and a Nivvik's heart beats once a minute or less.

export type FieldInfo = { key: VitalKey; label: string; unit: string; min: number; max: number; step: number }

export const FIELDS: Record<VitalKey, FieldInfo> = {
  heartRate: { key: 'heartRate', label: 'Heart rate', unit: 'bpm', min: 20, max: 250, step: 1 },
  spo2: { key: 'spo2', label: 'Blood oxygen', unit: '%', min: 50, max: 100, step: 1 },
  systolic: { key: 'systolic', label: 'Systolic', unit: 'mmHg', min: 50, max: 260, step: 1 },
  diastolic: { key: 'diastolic', label: 'Diastolic', unit: 'mmHg', min: 30, max: 160, step: 1 },
  temperature: { key: 'temperature', label: 'Body temperature', unit: '°C', min: 30, max: 45, step: 0.1 },
  // Filled in from the colony, not typed (see colony.ts)
  radiation: { key: 'radiation', label: 'Radiation today', unit: 'mSv', min: 0, max: 5000, step: 0.01 },
  oxygenDays: { key: 'oxygenDays', label: 'Oxygen', unit: 'days', min: 0, max: 100000, step: 1 },
  waterDays: { key: 'waterDays', label: 'Water', unit: 'days', min: 0, max: 100000, step: 1 },
  foodDays: { key: 'foodDays', label: 'Food', unit: 'days', min: 0, max: 100000, step: 1 },
}

const ALIEN_RANGES: Partial<Record<VitalKey, { min: number; max: number; step: number }>> = {
  heartRate: { min: 0, max: 2000, step: 0.1 },
  spo2: { min: 0, max: 100, step: 1 },
  systolic: { min: 0, max: 2000, step: 1 },
  diastolic: { min: 0, max: 2000, step: 1 },
  temperature: { min: -273, max: 1000, step: 0.1 }, // nothing is colder than absolute zero
}

/** The field as it applies on a world: aliens get their own label for blood gas and wider ranges. */
export function fieldFor(key: VitalKey, place: Place): FieldInfo {
  const alien = alienFor(place)
  const base = FIELDS[key]
  if (!alien || !ALIEN_RANGES[key]) return base
  return { ...base, ...ALIEN_RANGES[key], label: key === 'spo2' ? alien.gasName : base.label }
}

/** The numbers a colonist types in. Radiation and supplies come from the colony. */
export const HEALTH_KEYS: VitalKey[] = ['heartRate', 'spo2', 'systolic', 'diastolic', 'temperature']

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

const fmtNum = (n: number) => (Math.abs(n) >= 10 || Number.isInteger(n) ? String(Math.round(n * 10) / 10) : n.toFixed(1))

/** Alien check: inside the normal band is fine, the next zone out is a warning, past that is danger. */
export function checkBand(value: number, b: Band, unit: string, words: { low: string; high: string }): Check {
  const u = unit === '%' ? '%' : ` ${unit}`
  if (value < b.dangerLow) return { level: 'danger', reason: `Under ${fmtNum(b.dangerLow)}${u}: dangerously ${words.low}` }
  if (value > b.dangerHigh) return { level: 'danger', reason: `Over ${fmtNum(b.dangerHigh)}${u}: dangerously ${words.high}` }
  if (value < b.cautionLow) return { level: 'caution', reason: `Under ${fmtNum(b.cautionLow)}${u}: ${words.low}` }
  if (value > b.cautionHigh) return { level: 'caution', reason: `Over ${fmtNum(b.cautionHigh)}${u}: ${words.high}` }
  return OK()
}

/** Today's dose against the limits for this world (and this species). */
export function checkRadiationDay(mSv: number, place: Place): Check {
  const alien = alienFor(place)
  const l = alien ? alien.radiation : radiationLimits(place)
  if (mSv > l.danger) return { level: 'danger', reason: `Over ${l.danger} mSv: storm levels, get to the shelter` }
  if (mSv > l.caution) return { level: 'caution', reason: `Over ${l.caution} mSv: above normal for ${BODY_LABELS[place]}` }
  return OK('Normal for ' + BODY_LABELS[place])
}

export function checkMissionDose(mSv: number, place: Place): Check {
  const alien = alienFor(place)
  const limit = alien ? alien.careerDose : CAREER_LIMIT_MSV
  const whose = alien ? `the ${alien.name} lifetime limit` : `NASA's career limit`
  const pct = Math.round((mSv / limit) * 100)
  if (mSv >= limit) return { level: 'danger', reason: `At ${whose} (${limit} mSv)` }
  if (mSv >= limit * 0.8) return { level: 'caution', reason: `${pct}% of ${whose}` }
  return OK(`${pct}% of ${whose}`)
}

export { checkSupply }

/** The level in words (shown next to or instead of the 8-bit heart). */
export const LEVEL_TEXT: Record<Level, string> = { ok: 'Good', caution: 'Warning', danger: 'Danger' }

const RANK: Record<Level, number> = { ok: 0, caution: 1, danger: 2 }

/** The most serious level in a list (ok if the list is empty). */
export function worst(levels: Level[]): Level {
  return levels.reduce<Level>((a, b) => (RANK[b] > RANK[a] ? b : a), 'ok')
}

// ---- Putting readings together -----------------------------------------------------

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

export type ReadingRow = { label: string; value: string; check: Check }

/** Every check that applies to one reading (only for fields that were filled in), with the value as text. */
export function checkReading(v: Vitals): ReadingRow[] {
  const place: Place = v.body ?? 'earth'
  const alien = alienFor(place)
  const out: ReadingRow[] = []
  const bp = v.systolic != null && v.diastolic != null

  if (alien) {
    const a = alien
    if (v.heartRate != null) out.push({ label: 'Heart rate', value: `${v.heartRate} bpm`, check: checkBand(v.heartRate, a.heartRate, 'bpm', { low: 'slow', high: 'fast' }) })
    if (v.spo2 != null) out.push({ label: a.gasName, value: `${v.spo2}%`, check: checkBand(v.spo2, a.gas, '%', { low: 'low', high: 'high' }) })
    if (bp) {
      const s = checkBand(v.systolic!, a.systolic, 'mmHg', { low: 'low top pressure', high: 'high top pressure' })
      const d = checkBand(v.diastolic!, a.diastolic, 'mmHg', { low: 'low bottom pressure', high: 'high bottom pressure' })
      out.push({ label: 'Body pressure', value: `${v.systolic}/${v.diastolic} mmHg`, check: worst([s.level, d.level]) === s.level ? s : d })
    }
    if (v.temperature != null) out.push({ label: 'Temperature', value: `${v.temperature.toFixed(1)} °C`, check: checkBand(v.temperature, a.temperature, '°C', { low: 'cold', high: 'hot' }) })
  } else {
    if (v.heartRate != null) out.push({ label: 'Heart rate', value: `${v.heartRate} bpm`, check: checkHeartRate(v.heartRate) })
    if (v.spo2 != null) out.push({ label: 'Blood oxygen', value: `${v.spo2}%`, check: checkSpo2(v.spo2) })
    if (bp) out.push({ label: 'Blood pressure', value: `${v.systolic}/${v.diastolic} mmHg`, check: checkBloodPressure(v.systolic!, v.diastolic!) })
    if (v.temperature != null) out.push({ label: 'Temperature', value: `${v.temperature.toFixed(1)} °C`, check: checkTemperature(v.temperature) })
  }

  if (v.radiation != null) out.push({ label: 'Radiation today', value: `${v.radiation} mSv`, check: checkRadiationDay(v.radiation, place) })
  if (v.oxygenDays != null) out.push({ label: 'Oxygen', value: `${v.oxygenDays} days`, check: checkSupply(v.oxygenDays, place) })
  if (v.waterDays != null) out.push({ label: 'Water', value: `${v.waterDays} days`, check: checkSupply(v.waterDays, place) })
  if (v.foodDays != null) out.push({ label: 'Food', value: `${v.foodDays} days`, check: checkSupply(v.foodDays, place) })
  return out
}

/** Returns an error message for the form, or null if the reading can be saved. */
export function readingProblem(v: Vitals): string | null {
  const place: Place = v.body ?? 'earth'
  const filled = HEALTH_KEYS.filter((k) => v[k] != null)
  if (filled.length === 0) return 'Fill in at least one reading.'
  for (const k of filled) {
    const value = v[k] as number
    const f = fieldFor(k, place)
    if (!Number.isFinite(value)) return `${f.label} must be a number.`
    if (value < f.min || value > f.max) return `${f.label} should be between ${f.min} and ${f.max} ${f.unit}.`
  }
  if ((v.systolic == null) !== (v.diastolic == null)) return 'Pressure needs both numbers (like 120 / 80).'
  if (!alienFor(place) && v.systolic != null && v.diastolic != null && v.systolic <= v.diastolic) {
    return 'The first blood pressure number (systolic) should be higher than the second.'
  }
  return null
}

// ---- Shown on the page under "Safety limits" ----------------------------------------

export type LimitNote = { name: string; normal: string; caution: string; danger: string; source: string }

const r = (n: number) => fmtNum(n)
function bandNote(name: string, b: Band, unit: string, source: string): LimitNote {
  const u = unit === '%' ? '%' : ` ${unit}`
  return {
    name,
    normal: `${r(b.cautionLow)}–${r(b.cautionHigh)}${u}`,
    caution: `${r(b.dangerLow)}–${r(b.cautionLow)} or ${r(b.cautionHigh)}–${r(b.dangerHigh)}`,
    danger: `<${r(b.dangerLow)} or >${r(b.dangerHigh)}`,
    source,
  }
}

/** The limits that apply on a world, for whoever lives there. */
export function limitNotes(place: Place): LimitNote[] {
  const alien = alienFor(place)
  const rad = alien ? alien.radiation : radiationLimits(place)
  const career = alien ? alien.careerDose : CAREER_LIMIT_MSV
  const sup = supplyLimits(place)
  const info = PLACE_INFO[place]
  const health: LimitNote[] = alien
    ? [
        bandNote('Heart rate', alien.heartRate, 'bpm', `${alien.name} biology`),
        bandNote(alien.gasName, alien.gas, '%', `${alien.name} biology`),
        bandNote('Body pressure (top)', alien.systolic, 'mmHg', `${alien.name} biology`),
        bandNote('Body pressure (bottom)', alien.diastolic, 'mmHg', `${alien.name} biology`),
        bandNote('Temperature', alien.temperature, '°C', `${alien.name} biology`),
      ]
    : [
        { name: 'Heart rate (resting)', normal: '50–100 bpm', caution: '40–49 or 101–130', danger: '<40 or >130', source: 'American Heart Association' },
        { name: 'Blood oxygen', normal: '95–100%', caution: '90–94%', danger: '<90%', source: 'Hypoxemia threshold' },
        { name: 'Blood pressure', normal: 'under 130 and under 80', caution: 'top ≥130, bottom ≥80, or <90/60', danger: '>180/120', source: '2017 ACC/AHA guideline' },
        { name: 'Temperature', normal: '36.0–37.9 °C', caution: '35.0–35.9 or 38.0–39.9', danger: '<35.0 or ≥40.0', source: 'Fever / hypothermia / heat stroke' },
      ]
  return [
    ...health,
    {
      name: 'Radiation (day)', normal: `≤${rad.caution} mSv`, caution: `${rad.caution}–${rad.danger} mSv`, danger: `>${rad.danger} mSv`,
      source: alien ? `${alien.name} biology` : `Normal here: ~${info.dose} mSv (${info.doseNote}); danger = NASA 30-day limit pace`,
    },
    {
      name: 'Radiation (lifetime)', normal: `<${r(career * 0.8)} mSv`, caution: `${r(career * 0.8)}–${r(career)} mSv`, danger: `≥${r(career)} mSv`,
      source: alien ? `${alien.name} biology` : 'NASA-STD-3001 career limit',
    },
    {
      name: 'Oxygen / water / food', normal: `≥${sup.caution} days`, caution: `${sup.danger}–${sup.caution - 1} days`, danger: `<${sup.danger} days`,
      source: info.trip == null ? info.tripNote : `Emergency cargo takes ${info.trip} day${info.trip === 1 ? '' : 's'} (${info.tripNote})`,
    },
  ]
}

// ---- Survival rating -----------------------------------------------------------------

export type Survival = {
  score: number // chance of survival, 0–100 (%)
  label: 'Thriving' | 'Stable' | 'At risk' | 'Critical'
  summary: string
  steps: { label: string; value: string; level: Level; chance: number; reason: string }[]
}

/** Chance of getting through each reading's problem, in %. */
export const SURVIVAL_CHANCE: Record<Level, number> = { ok: 100, caution: 92, danger: 45 }

/** Turns a chance into the words shown next to it. */
export const SURVIVAL_BANDS = { thriving: 95, stable: 80, atRisk: 50 } as const

/**
 * Survival rating: the likelihood (%) you're fine, given everything you logged. Each reading has its own
 * chance of survival (good 100%, warning 92%, danger 45%), and any one of them could go wrong on its own,
 * so the chances multiply. One warning gives 92%, two give 85%, one danger gives 45%, and a warning plus
 * a danger gives 41%.
 */
export function survivalRating(rows: ReadingRow[]): Survival {
  const steps = rows.map((r) => ({
    label: r.label, value: r.value, level: r.check.level, chance: SURVIVAL_CHANCE[r.check.level], reason: r.check.reason,
  }))
  const product = steps.reduce((p, s) => p * (s.chance / 100), 1)
  const score = Math.round(product * 100)
  const b = SURVIVAL_BANDS
  const label = score >= b.thriving ? 'Thriving' : score >= b.stable ? 'Stable' : score >= b.atRisk ? 'At risk' : 'Critical'
  const summary = steps.length === 0
    ? 'No readings yet.'
    : {
        Thriving: 'Everything is where it should be.',
        Stable: 'Likely fine, but keep an eye on the warnings.',
        'At risk': 'Several things are off. Fix the warnings soon.',
        Critical: 'Something is dangerous. Deal with the red readings now.',
      }[label]
  return { score, label, summary, steps }
}

/** "92%", or "<1%" when it rounds down to nothing. */
export const formatChance = (score: number) => (score === 0 ? '<1%' : `${score}%`)
