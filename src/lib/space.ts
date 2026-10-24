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

// Each world's color. Used as meaning (which planet), never as decoration.
export const PLANET_COLORS: Record<Body, string> = {
  earth: '#3b82f6',
  moon: '#a0a4b8',
  mars: '#e4572e',
  station: '#22c55e',
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

// ---- Signal times to the wider solar system (for the "Signal times" panel) ----
// Same circular-orbit approximation as Earth/Mars above, for Jupiter (Europa, Ganymede) and Saturn (Titan).
const OUTER_ORBITS = {
  jupiter: { l0: 34.396, rate: 0.0830853, radius: 5.2028 },
  saturn: { l0: 49.954, rate: 0.0334442, radius: 9.5388 },
}
const SECONDS_PER_LIGHT_YEAR = 365.25 * 86_400

/** One-way light time in seconds from Earth's neighborhood to Jupiter or Saturn on the given date. */
export function earthToOuterPlanetSeconds(planet: keyof typeof OUTER_ORBITS, atMs: number = Date.now()): number {
  const days = (atMs - J2000_MS) / 86_400_000
  const outer = OUTER_ORBITS[planet]
  const angle = longitudeRad(EARTH_ORBIT, days) - longitudeRad(outer, days)
  const r1 = EARTH_ORBIT.radius
  const r2 = outer.radius
  return Math.sqrt(r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(angle)) * LIGHT_SECONDS_PER_AU
}

/** Proxima Centauri b is 4.24 light-years away, so a message takes 4.24 years. */
export const PROXIMA_SECONDS = 4.2465 * SECONDS_PER_LIGHT_YEAR

/** Longer format for big delays: "1 h 12 min", "4.2 years". */
export function formatLongDelay(seconds: number): string {
  if (seconds >= SECONDS_PER_LIGHT_YEAR) return `${(seconds / SECONDS_PER_LIGHT_YEAR).toFixed(1)} years`
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} h ${Math.round((seconds % 3600) / 60)} min`
  return formatDelay(seconds)
}
