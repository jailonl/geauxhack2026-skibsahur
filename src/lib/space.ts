// Shared space math, used by both the browser and the worker (bots).
// Light-delay is calculated from where every place actually is on a given date, using circular-orbit
// approximations (accurate to within ~10%, good enough for comms timing).

/** The four home worlds: used for post location tags, feed tabs, and the main forums. */
export type Body = 'earth' | 'moon' | 'mars' | 'station'

/** Every place a colonist can live: the home worlds, the outer colonies, and two other star systems. */
export type Place = Body | 'ceres' | 'europa' | 'ganymede' | 'io' | 'titan' | 'enceladus' | 'kuiper' | 'proxima' | 'alphacen'

export const BODY_LABELS: Record<Place, string> = {
  earth: 'Earth',
  moon: 'Moon',
  mars: 'Mars',
  station: 'Orbital Station',
  ceres: 'Ceres',
  europa: 'Europa',
  ganymede: 'Ganymede',
  io: 'Io',
  titan: 'Titan',
  enceladus: 'Enceladus',
  kuiper: 'Kuiper Belt',
  proxima: 'Proxima b',
  alphacen: 'Alpha Centauri B',
}

/** Places grouped for pickers (profile home, signal map). */
export const PLACE_GROUPS: { label: string; places: Place[] }[] = [
  { label: 'Home worlds', places: ['earth', 'moon', 'station', 'mars'] },
  { label: 'Outer colonies', places: ['ceres', 'europa', 'ganymede', 'io', 'titan', 'enceladus', 'kuiper'] },
  { label: 'Other stars', places: ['proxima', 'alphacen'] },
]
export const ALL_PLACES: Place[] = PLACE_GROUPS.flatMap((g) => g.places)

// Each place's color. Used as meaning (which world), never as decoration.
export const PLANET_COLORS: Record<Place, string> = {
  earth: '#3b82f6',
  moon: '#a0a4b8',
  mars: '#e4572e',
  station: '#22c55e',
  ceres: '#a78bfa',
  europa: '#7dd3fc',
  ganymede: '#4ade80',
  io: '#facc15',
  titan: '#f59e0b',
  enceladus: '#c4b5fd',
  kuiper: '#94a3b8',
  proxima: '#f472b6',
  alphacen: '#fb7185',
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

/** One-way light travel time in seconds between any two places on the given date. */
export function lightDelaySeconds(from: Place, to: Place, atMs: number = Date.now()): number {
  if (from === to) return 0
  const pair = [from, to].sort().join('-')
  if (pair === 'earth-moon') return EARTH_MOON_LIGHT_SECONDS // the well-known average
  return distanceAU(positionAU(from, atMs), positionAU(to, atMs)) * LIGHT_SECONDS_PER_AU
}

/** "10 min 23 s", "1.3 s", "instant" (an hour or more: "1 h 12 min", "4.2 years") */
export function formatDelay(seconds: number): string {
  if (seconds < 0.05) return 'instant'
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  if (seconds >= 3600) return formatLongDelay(seconds)
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes} min ${secs} s`
}

/** "09:41" countdown style (long waits: "3 d 4 h", "4.2 years") */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  if (total >= 365.25 * 86_400) return `${(total / (365.25 * 86_400)).toFixed(1)} years`
  if (total >= 86_400) return `${Math.floor(total / 86_400)} d ${Math.floor((total % 86_400) / 3600)} h`
  if (total >= 3600) return `${Math.floor(total / 3600)} h ${String(Math.floor((total % 3600) / 60)).padStart(2, '0')} min`
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

/** Longer format for big delays: "1 h 12 min", "75 days", "4.2 years". */
export function formatLongDelay(seconds: number): string {
  if (seconds >= SECONDS_PER_LIGHT_YEAR) return `${(seconds / SECONDS_PER_LIGHT_YEAR).toFixed(1)} years`
  if (seconds >= 2 * 86_400) return `${Math.round(seconds / 86_400)} days`
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} h ${Math.round((seconds % 3600) / 60)} min`
  return formatDelay(seconds)
}

// ---- Positions of every place (for any-to-any light delay and the signal map) ----
// x, y in the plane of Earth's orbit, z up; in AU (Earth–Sun distance). The Sun is at 0, 0, 0.
export type Vec = [number, number, number]

const KM_PER_AU = 149_597_870.7
const AU_PER_LIGHT_YEAR = 63_241.077

// Planets (and the fictional Kuiper freighter) on circular orbits around the Sun.
// Ceres and the freighter use approximate starting positions.
const SUN_ORBITS = {
  earth: EARTH_ORBIT,
  mars: MARS_ORBIT,
  jupiter: OUTER_ORBITS.jupiter,
  saturn: OUTER_ORBITS.saturn,
  ceres: { l0: 160, rate: 0.2141, radius: 2.767 },
  kuiper: { l0: 270, rate: 0.003496, radius: 43 },
}

// Moons and the station circle their planet: distance (km) and how long one orbit takes (days).
const MOONS: Partial<Record<Place, { around: keyof typeof SUN_ORBITS; km: number; days: number }>> = {
  moon: { around: 'earth', km: 384_400, days: 27.32 },
  station: { around: 'earth', km: 6_771, days: 0.0644 },
  europa: { around: 'jupiter', km: 671_034, days: 3.551 },
  ganymede: { around: 'jupiter', km: 1_070_412, days: 7.155 },
  io: { around: 'jupiter', km: 421_700, days: 1.769 },
  titan: { around: 'saturn', km: 1_221_870, days: 15.945 },
  enceladus: { around: 'saturn', km: 238_020, days: 1.37 },
}

// Other stars: direction on the sky (right ascension and declination, degrees) and distance (light-years).
const STARS: Partial<Record<Place, { ra: number; dec: number; ly: number }>> = {
  proxima: { ra: 217.429, dec: -62.68, ly: 4.2465 },
  alphacen: { ra: 219.896, dec: -60.838, ly: 4.37 },
}

function orbitPoint(orbit: { l0: number; rate: number; radius: number }, days: number): Vec {
  const angle = longitudeRad(orbit, days)
  return [orbit.radius * Math.cos(angle), orbit.radius * Math.sin(angle), 0]
}

export type Host = keyof typeof SUN_ORBITS

/** Where a planet (or the Kuiper freighter) is on its orbit, in AU. */
export function hostPositionAU(host: Host, atMs: number = Date.now()): Vec {
  return orbitPoint(SUN_ORBITS[host], (atMs - J2000_MS) / 86_400_000)
}

/** Which planet a place belongs to (for drawing it on the map): Europa → Jupiter, and so on. */
export function hostOf(place: Place): Host | 'star' {
  if (STARS[place]) return 'star'
  const moon = MOONS[place]
  if (moon) return moon.around
  return place as keyof typeof SUN_ORBITS
}

export function positionAU(place: Place, atMs: number = Date.now()): Vec {
  const days = (atMs - J2000_MS) / 86_400_000
  const star = STARS[place]
  if (star) {
    // Sky direction → x, y, z, then tilt from Earth's equator to the plane of its orbit (23.44°).
    const ra = (star.ra * Math.PI) / 180
    const dec = (star.dec * Math.PI) / 180
    const d = star.ly * AU_PER_LIGHT_YEAR
    const [x, yEq, zEq] = [d * Math.cos(dec) * Math.cos(ra), d * Math.cos(dec) * Math.sin(ra), d * Math.sin(dec)]
    const tilt = (23.44 * Math.PI) / 180
    return [x, yEq * Math.cos(tilt) + zEq * Math.sin(tilt), -yEq * Math.sin(tilt) + zEq * Math.cos(tilt)]
  }
  const moon = MOONS[place]
  if (moon) {
    const [px, py] = orbitPoint(SUN_ORBITS[moon.around], days)
    const angle = (2 * Math.PI * days) / moon.days
    const r = moon.km / KM_PER_AU
    return [px + r * Math.cos(angle), py + r * Math.sin(angle), 0]
  }
  return orbitPoint(SUN_ORBITS[place as keyof typeof SUN_ORBITS], days)
}

export function distanceAU(a: Vec, b: Vec): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** Orbit sizes (AU) for drawing the map. */
export const MAP_ORBITS = (Object.keys(SUN_ORBITS) as Host[]).map((name) => ({ name, radius: SUN_ORBITS[name].radius }))
