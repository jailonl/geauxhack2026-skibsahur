// Shared space math, used by both the browser (chat) and the worker (bots).
// Light-delay is calculated from where Earth and Mars actually are on a given date,
// using circular-orbit approximations (accurate to within ~10%, good enough for comms timing).

export type Body = 'earth' | 'moon' | 'mars' | 'station'

export const BODY_LABELS: Record<Body, string> = {
  earth: 'Earth',
  moon: 'Moon',
  mars: 'Mars',
  station: 'Orbital Station',
}

const LIGHT_SECONDS_PER_AU = 499.004784 // 149,597,870.7 km ÷ 299,792.458 km/s
const EARTH_MOON_LIGHT_SECONDS = 1.282 // 384,400 km average distance
const J2000_MS = Date.UTC(2000, 0, 1, 12) // standard astronomy reference date

// Mean longitude at J2000 (degrees), daily motion (degrees/day), orbit radius (AU)
const EARTH_ORBIT = { l0: 100.464, rate: 0.9856091, radius: 1.0 }
const MARS_ORBIT = { l0: 355.453, rate: 0.52402068, radius: 1.52371 }

function longitudeRad(orbit: typeof EARTH_ORBIT, days: number): number {
  return ((orbit.l0 + orbit.rate * days) * Math.PI) / 180
}

/** Earth–Mars distance in AU on the given date (law of cosines on the two orbits). */
export function earthMarsDistanceAU(atMs: number = Date.now()): number {
  const days = (atMs - J2000_MS) / 86_400_000
  const angle = longitudeRad(EARTH_ORBIT, days) - longitudeRad(MARS_ORBIT, days)
  const r1 = EARTH_ORBIT.radius
  const r2 = MARS_ORBIT.radius
  return Math.sqrt(r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(angle))
}

/** One-way light travel time in seconds between two bodies on the given date. */
export function lightDelaySeconds(from: Body, to: Body, atMs: number = Date.now()): number {
  if (from === to) return 0
  const pair = [from, to].sort().join('-')

  if (pair === 'earth-moon' || pair === 'moon-station') return EARTH_MOON_LIGHT_SECONDS
  if (pair === 'earth-station') return 0.002 // low Earth orbit: ~400 km up

  // Any pair involving Mars: the Moon and the station sit next to Earth at this scale.
  return earthMarsDistanceAU(atMs) * LIGHT_SECONDS_PER_AU
}

/** "10 min 23 s", "1.3 s", "instant" */
export function formatDelay(seconds: number): string {
  if (seconds < 0.05) return 'instant'
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes} min ${secs} s`
}

/** "09:41" countdown style */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
