// "Read sensors" for the demo: makes a believable reading for where you live, so you don't have to
// type every number. Mostly normal values, with a small chance of one problem so the warnings show up.
// Nothing here is saved by itself: it only fills in the form, and you press Save.
import type { Place } from '../../lib/space'
import { BACKGROUND_DOSE, DOSE_MEASURED } from './limits'
import type { Vitals } from './types'

type Rng = () => number // returns 0 (inclusive) to 1 (exclusive), like Math.random

const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo)
const round = (n: number, places = 0) => Number(n.toFixed(places))

/** Supplies left last time (if any), so the numbers count down between readings. */
export type PreviousSupplies = { oxygenDays?: number; waterDays?: number; foodDays?: number }

export function simulateReading(body: Place, previous: PreviousSupplies = {}, rng: Rng = Math.random): Vitals {
  const v: Vitals = {
    body,
    heartRate: round(between(rng, 58, 84)),
    spo2: round(between(rng, 96, 99.9)),
    systolic: round(between(rng, 104, 126)),
    diastolic: round(between(rng, 64, 79)),
    temperature: round(between(rng, 36.3, 37.3), 1),
    // Measured worlds vary ±15%. Elsewhere we only have the deep-space level, and a colony habitat's
    // shielding (ice, rock, water walls) keeps people below it.
    radiation: round(BACKGROUND_DOSE[body] * (DOSE_MEASURED.has(body) ? between(rng, 0.85, 1.15) : between(rng, 0.5, 0.9)), 3),
    source: 'sensor',
  }

  // Supplies tick down about a day per reading; first reading starts with a fresh stock.
  const next = (prev: number | undefined, fresh: number) =>
    prev == null ? round(between(rng, fresh * 0.7, fresh)) : Math.max(0, round(prev - between(rng, 0.5, 1.5)))
  v.oxygenDays = next(previous.oxygenDays, 120)
  v.waterDays = next(previous.waterDays, 90)
  v.foodDays = next(previous.foodDays, 180)

  // About one reading in five has something worth a warning.
  if (rng() < 0.2) {
    const pick = Math.floor(rng() * 5)
    if (pick === 0) v.heartRate = round(between(rng, 102, 125)) // stress, or a hard EVA
    else if (pick === 1) v.spo2 = round(between(rng, 91, 94)) // cabin pressure dip
    else if (pick === 2) v.temperature = round(between(rng, 38.0, 38.8), 1) // fever
    else if (pick === 3) { v.systolic = round(between(rng, 132, 145)); v.diastolic = round(between(rng, 82, 90)) } // fluid shift
    else if (body !== 'earth') v.radiation = round(between(rng, 2, 12), 2) // solar particle event (Earth's surface is shielded)
  }
  return v
}
