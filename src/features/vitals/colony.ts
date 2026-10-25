// Colony conditions: the radiation and supplies of each world. Nobody types these in: they're the
// same for everyone on that world at the same moment, and they change over time on their own.
// Like the alien chatter, it's all worked out from the date with a seeded random generator, so
// every viewer sees the same numbers and nothing has to be saved.
import { ALL_PLACES, BODY_LABELS, type Place } from '../../lib/space'
import type { Check } from './types'

const DAY_MS = 86_400_000
const J2000_MS = Date.UTC(2000, 0, 1, 12)

export type PlaceInfo = {
  dose: number // normal radiation inside the habitat, mSv/day
  measured: boolean // true = a real spacecraft measurement, false = our estimate
  doseNote: string
  stormChance: number // chance per day of a solar storm (or star flare)
  storm: [number, number] // how many times the normal dose a storm brings, inside the habitat
  trip: number | null // days for a cargo ship from Earth (null = the colony grows its own)
  cycle: number // days between cargo arrivals (or between harvests if trip is null)
  tripNote: string
}

// Doses: Earth ~2.4 mSv/year world average. ISS ~0.5/day. Chang'e 4 measured 1.37/day on the Moon.
// Curiosity measured 0.64/day on Mars and 1.84/day in deep space. Everything else is our estimate for a
// shielded habitat (real surfaces can be far worse: Europa's gets thousands of mSv a day).
// Trips are Hohmann transfer times (the cheap, slow path); cycles are synodic periods, the real gap
// between launch windows (Mars 780 days, Ceres 467, Jupiter 399, Saturn 378, Pluto 367).
export const PLACE_INFO: Record<Place, PlaceInfo> = {
  earth: { dose: 0.0066, measured: true, doseNote: 'world average, ~2.4 mSv a year', stormChance: 0, storm: [1, 1], trip: 1, cycle: 7, tripNote: 'shops restock weekly' },
  station: { dose: 0.5, measured: true, doseNote: 'measured on the ISS', stormChance: 0.02, storm: [2, 4], trip: 2, cycle: 60, tripNote: 'cargo docks every ~2 months' },
  moon: { dose: 1.37, measured: true, doseNote: "measured by China's Chang'e 4 lander", stormChance: 0.02, storm: [3, 8], trip: 4, cycle: 90, tripNote: '3–4 day flight, cargo every quarter' },
  mars: { dose: 0.64, measured: true, doseNote: "measured by NASA's Curiosity rover", stormChance: 0.015, storm: [3, 10], trip: 259, cycle: 780, tripNote: '~8.5 month flight, launch windows every 26 months' },
  ceres: { dose: 1.1, measured: false, doseNote: 'estimate: deep-space level under regolith shielding', stormChance: 0.01, storm: [2, 5], trip: 475, cycle: 467, tripNote: '~1.3 year flight, windows every 15 months' },
  europa: { dose: 0.4, measured: false, doseNote: "estimate: habitat under the ice, hiding from Jupiter's belts", stormChance: 0.005, storm: [2, 4], trip: 997, cycle: 399, tripNote: '~2.7 year flight, windows every 13 months' },
  ganymede: { dose: 0.8, measured: false, doseNote: 'estimate: its own magnetic field plus buried habitat', stormChance: 0.005, storm: [2, 4], trip: 997, cycle: 399, tripNote: '~2.7 year flight, windows every 13 months' },
  io: { dose: 3.0, measured: false, doseNote: "estimate: deep in rock, still inside Jupiter's worst belt", stormChance: 0.03, storm: [1.5, 3], trip: 997, cycle: 399, tripNote: '~2.7 year flight, windows every 13 months' },
  titan: { dose: 0.05, measured: false, doseNote: 'estimate: a thick atmosphere shields like Earth', stormChance: 0.003, storm: [1.5, 3], trip: 2210, cycle: 378, tripNote: '~6 year flight, windows every 12.4 months' },
  enceladus: { dose: 0.6, measured: false, doseNote: 'estimate: under the ice shell', stormChance: 0.003, storm: [2, 4], trip: 2210, cycle: 378, tripNote: '~6 year flight, windows every 12.4 months' },
  kuiper: { dose: 1.84, measured: false, doseNote: 'deep-space level (Curiosity, on the way to Mars)', stormChance: 0.002, storm: [1.5, 2], trip: 3470, cycle: 367, tripNote: '~9.5 year flight (as fast as New Horizons)' },
  proxima: { dose: 2.5, measured: false, doseNote: 'estimate: Proxima is a flare star', stormChance: 0.06, storm: [3, 10], trip: null, cycle: 120, tripNote: 'too far for cargo: the colony grows its own (harvest every 4 months)' },
  alphacen: { dose: 1.2, measured: false, doseNote: 'estimate: a calmer Sun-like star', stormChance: 0.01, storm: [2, 5], trip: null, cycle: 120, tripNote: 'too far for cargo: the colony grows its own (harvest every 4 months)' },
}

// ---- Seeded random numbers (same day + same world = same numbers for everyone) -----------------

function hash(s: string): number {
  let h = 2166136261 // FNV-1a
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function rng(seed: string): () => number {
  let a = hash(seed) // Mulberry32
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const dayNumber = (atMs: number) => Math.floor((atMs - J2000_MS) / DAY_MS)

// ---- Radiation ---------------------------------------------------------------------------------

/** Dose for one whole day on a world, and whether a storm hit that day. */
export function radiationOnDay(place: Place, day: number): { mSv: number; storm: boolean } {
  const info = PLACE_INFO[place]
  const r = rng(`rad:${place}:${day}`)
  const normal = info.dose * (0.85 + r() * 0.3) // ±15% day to day
  const storm = r() < info.stormChance
  const factor = storm ? info.storm[0] + r() * (info.storm[1] - info.storm[0]) : 1
  return { mSv: Number((normal * factor).toFixed(info.dose < 0.1 ? 4 : 2)), storm }
}

/** Total dose from `fromMs` to `toMs`, following where you lived (latest reading on or before each day). */
export function missionDose(stays: { at: number; place: Place }[], fallback: Place, fromMs: number, toMs: number): number {
  const sorted = [...stays].sort((a, b) => a.at - b.at)
  let total = 0
  let i = 0
  let place = sorted[0]?.place ?? fallback
  for (let d = dayNumber(fromMs); d <= dayNumber(toMs); d++) {
    const dayEnd = J2000_MS + (d + 1) * DAY_MS
    while (i < sorted.length && sorted[i].at < dayEnd) place = sorted[i++].place
    total += radiationOnDay(place, d).mSv
  }
  return Number(total.toFixed(2))
}

// ---- Supplies ----------------------------------------------------------------------------------

export type Supplies = { oxygenDays: number; waterDays: number; foodDays: number; nextArrival: number; fault: string | null }

/**
 * Days of oxygen, water, and food left. A delivery (or harvest) tops the stock up to cover the wait for
 * the next one, plus the flight time, plus a small reserve, and the stock counts down a day at a time.
 * Now and then a week brings trouble (a recycler fault, spoiled food) that eats into one supply.
 */
export function suppliesOn(place: Place, day: number): Supplies {
  const info = PLACE_INFO[place]
  const offset = hash(`phase:${place}`) % info.cycle // each world's deliveries land on different days
  const sinceDelivery = (((day + offset) % info.cycle) + info.cycle) % info.cycle
  const nextArrival = info.cycle - sinceDelivery
  const trip = info.trip ?? 0
  const stock = (reserve: number) => nextArrival + trip + reserve

  const week = Math.floor(day / 7)
  const r = rng(`supply:${place}:${week}`)
  let fault: string | null = null
  const cut = { oxygen: 1, water: 1, food: 1 }
  if (place !== 'earth' && r() < 0.06) { // Earth can always just restock
    const pick = Math.floor(r() * 3)
    const share = 0.25 + r() * 0.35
    if (pick === 0) { cut.oxygen = share; fault = 'Oxygen recycler fault' }
    else if (pick === 1) { cut.water = share; fault = 'Water recycler leak' }
    else { cut.food = share; fault = 'Food stores spoiled' }
  }
  return {
    oxygenDays: Math.round(stock(25) * cut.oxygen),
    waterDays: Math.round(stock(20) * cut.water),
    foodDays: Math.round(stock(15) * cut.food),
    nextArrival,
    fault,
  }
}

/** Everything about a world right now. */
export function colonyNow(place: Place, atMs: number = Date.now()) {
  const day = dayNumber(atMs)
  return { place, ...radiationOnDay(place, day), ...suppliesOn(place, day) }
}
export type ColonyNow = ReturnType<typeof colonyNow>

// ---- Limits that depend on the world (humans; aliens have their own in aliens.ts) ---------------

// 8.3 mSv/day is the pace that would use up NASA's old 30-day limit (250 mSv in 30 days). That's about
// the human body, so it's the same everywhere. "Watch" is about the world: more than double its normal.
export const HUMAN_RADIATION_DANGER = 8.3
export const CAREER_LIMIT_MSV = 600 // NASA-STD-3001 (2022)

export function radiationLimits(place: Place) {
  const caution = Math.min(HUMAN_RADIATION_DANGER * 0.75, Math.max(PLACE_INFO[place].dose * 2, 0.1))
  return { caution: Number(caution.toFixed(2)), danger: HUMAN_RADIATION_DANGER }
}

/**
 * Supplies: danger if you'd run out before an emergency ship could get there (plus a week to launch it);
 * watch a little before that (15% of the gap between deliveries, between 1 week and 1 month).
 */
export function supplyLimits(place: Place) {
  const { trip, cycle } = PLACE_INFO[place]
  if (place === 'earth') return { caution: 4, danger: 2 }
  if (trip == null) return { caution: 30, danger: 14 } // self-sufficient: time to regrow crops / fix recyclers
  return { caution: Math.round(trip + 7 + Math.min(30, Math.max(7, cycle * 0.15))), danger: trip + 7 }
}

export function checkSupply(days: number, place: Place): Check {
  const l = supplyLimits(place)
  const where = BODY_LABELS[place]
  if (days < l.danger) return { level: 'danger', reason: `Under ${l.danger} days: help can't reach ${where} in time` }
  if (days < l.caution) return { level: 'caution', reason: `Under ${l.caution} days: low for ${where}` }
  return { level: 'ok', reason: 'Stocked' }
}

/** Places sorted for the limits table and tests. */
export const PLACES = ALL_PLACES

/** Mission radiation for someone, from their first reading until now, following where each reading was taken. */
export function missionDoseFromRecords(
  records: { createdAt: string; data: { body?: Place } }[],
  fallback: Place,
  nowMs: number = Date.now(),
): number | null {
  if (records.length === 0) return null
  const stays = records.map((r) => ({ at: Date.parse(r.createdAt), place: r.data.body ?? fallback }))
  const first = Math.min(...stays.map((s) => s.at))
  return missionDose(stays, fallback, first, nowMs)
}
