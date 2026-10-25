// "Read sensors" for the demo: makes a believable health reading for whoever lives on your world
// (a human on Earth, the Moon, or the station; that world's alien everywhere else), so you don't have
// to type every number. Mostly normal, with a small chance of one problem so the warnings show up.
// Radiation and supplies aren't here: they come from the colony itself (colony.ts).
import type { Place } from '../../lib/space'
import { alienFor, type Band } from './aliens'
import type { Vitals } from './types'

type Rng = () => number // returns 0 (inclusive) to 1 (exclusive), like Math.random

const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo)
const round = (n: number, places = 0) => Number(n.toFixed(places))

/** A value in the normal part of a band, or (if `off`) in one of its warning zones. */
function inBand(rng: Rng, b: Band, off: boolean, places = 0): number {
  if (!off) return round(between(rng, b.cautionLow, b.cautionHigh), places)
  return rng() < 0.5
    ? round(between(rng, b.dangerLow, b.cautionLow), places)
    : round(between(rng, b.cautionHigh, b.dangerHigh), places)
}

export function simulateReading(body: Place, rng: Rng = Math.random): Vitals {
  const problem = rng() < 0.2 ? Math.floor(rng() * 4) : -1 // about one reading in five has something off
  const alien = alienFor(body)

  if (alien) {
    const slow = alien.heartRate.cautionHigh < 10 // tiny heart rates need decimals
    const v: Vitals = {
      body,
      heartRate: inBand(rng, alien.heartRate, problem === 0, slow ? 1 : 0),
      spo2: inBand(rng, alien.gas, problem === 1),
      systolic: inBand(rng, alien.systolic, problem === 2),
      diastolic: inBand(rng, alien.diastolic, false),
      temperature: inBand(rng, alien.temperature, problem === 3, 1),
      source: 'sensor',
    }
    return v
  }

  const v: Vitals = {
    body,
    heartRate: round(between(rng, 58, 84)),
    spo2: round(between(rng, 96, 99.9)),
    systolic: round(between(rng, 104, 126)),
    diastolic: round(between(rng, 64, 79)),
    temperature: round(between(rng, 36.3, 37.3), 1),
    source: 'sensor',
  }
  if (problem === 0) v.heartRate = round(between(rng, 102, 125)) // stress, or a hard EVA
  else if (problem === 1) v.spo2 = round(between(rng, 91, 94)) // cabin pressure dip
  else if (problem === 2) { v.systolic = round(between(rng, 132, 145)); v.diastolic = round(between(rng, 82, 90)) } // fluid shift
  else if (problem === 3) v.temperature = round(between(rng, 38.0, 38.8), 1) // fever
  return v
}
