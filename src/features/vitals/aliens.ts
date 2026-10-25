// Who you are depends on where you live: on Earth, the Moon, and the station you're human and get
// real medical limits. Everywhere else you're the alien that lives there, with that species' own
// limits. Six species match the alien chatter (src/features/aliens/species.ts); the other
// four worlds got new ones here.
import type { Place } from '../../lib/space'

/** Worlds where colonists are human. Change this list to move a world between humans and aliens. */
export const HUMAN_WORLDS: Place[] = ['earth', 'moon', 'station']

export const isHumanWorld = (place: Place) => HUMAN_WORLDS.includes(place)

/** A normal range with a watch zone and a danger zone on each side. */
export type Band = { dangerLow: number; cautionLow: number; cautionHigh: number; dangerHigh: number }

export type AlienProfile = {
  name: string // species
  about: string // one line for the page
  heartRate: Band // beats per minute
  gasName: string // what their blood carries instead of (or as well as) oxygen
  gas: Band // % saturation
  systolic: Band // body pressure, mmHg
  diastolic: Band
  temperature: Band // body temperature, °C
  radiation: { caution: number; danger: number } // mSv in one day
  careerDose: number // mSv over a lifetime
}

const band = (dangerLow: number, cautionLow: number, cautionHigh: number, dangerHigh: number): Band => ({
  dangerLow, cautionLow, cautionHigh, dangerHigh,
})

export const ALIENS: Partial<Record<Place, AlienProfile>> = {
  mars: {
    name: 'Rhul', about: 'Slow, cold-blooded diggers from the lava tubes',
    heartRate: band(10, 18, 42, 60), gasName: 'CO₂ saturation', gas: band(45, 60, 92, 98),
    systolic: band(40, 55, 90, 110), diastolic: band(20, 30, 55, 70), temperature: band(-55, -35, -8, 5),
    radiation: { caution: 4, danger: 15 }, careerDose: 3000,
  },
  europa: {
    name: 'Vellii', about: 'Deep-ocean swimmers under the ice, built for crushing pressure',
    heartRate: band(2, 4, 12, 18), gasName: 'Dissolved O₂', gas: band(25, 40, 75, 90),
    systolic: band(150, 200, 300, 360), diastolic: band(100, 140, 220, 260), temperature: band(-3, 0, 5, 9),
    radiation: { caution: 0.8, danger: 3 }, careerDose: 300,
  },
  ganymede: {
    name: 'Thalum', about: 'Magnetic-sensing burrowers in the salty ice',
    heartRate: band(6, 10, 26, 36), gasName: 'Brine-salt balance', gas: band(30, 45, 80, 92),
    systolic: band(60, 80, 130, 160), diastolic: band(35, 50, 85, 105), temperature: band(-25, -15, -2, 4),
    radiation: { caution: 2, danger: 7 }, careerDose: 800,
  },
  io: {
    name: 'Pyrrax', about: 'Lava-lake dwellers who soak up radiation like sunlight',
    heartRate: band(220, 300, 520, 640), gasName: 'SO₂ saturation', gas: band(35, 50, 85, 95),
    systolic: band(300, 380, 600, 700), diastolic: band(180, 240, 360, 420), temperature: band(300, 360, 460, 520),
    radiation: { caution: 60, danger: 200 }, careerDose: 50000,
  },
  titan: {
    name: 'Ossk', about: 'Methane-breathers who melt if they get too warm',
    heartRate: band(1, 2, 6, 9), gasName: 'Methane saturation', gas: band(55, 70, 96, 100),
    systolic: band(10, 18, 40, 55), diastolic: band(5, 9, 22, 30), temperature: band(-192, -186, -174, -168),
    radiation: { caution: 0.2, danger: 1 }, careerDose: 100,
  },
  enceladus: {
    name: 'Glim', about: 'Geyser-riders that glow when they are healthy',
    heartRate: band(18, 30, 64, 85), gasName: 'Water-vapor saturation', gas: band(40, 55, 88, 96),
    systolic: band(25, 40, 72, 90), diastolic: band(12, 20, 42, 55), temperature: band(-20, -10, 3, 8),
    radiation: { caution: 1, danger: 4 }, careerDose: 500,
  },
  ceres: {
    name: 'Duskari', about: 'Tiny dust-gliders that barely feel gravity',
    heartRate: band(60, 90, 180, 230), gasName: 'Ammonia saturation', gas: band(35, 50, 82, 94),
    systolic: band(8, 15, 35, 48), diastolic: band(4, 8, 20, 28), temperature: band(-110, -95, -60, -45),
    radiation: { caution: 3, danger: 10 }, careerDose: 1500,
  },
  kuiper: {
    name: 'Nivvik', about: 'Frozen drifters that wake up once a century',
    heartRate: band(0.1, 0.3, 2, 4), gasName: 'Nitrogen-ice balance', gas: band(20, 35, 70, 85),
    systolic: band(2, 5, 15, 22), diastolic: band(1, 2, 8, 12), temperature: band(-235, -228, -210, -200),
    radiation: { caution: 2.5, danger: 9 }, careerDose: 20000,
  },
  proxima: {
    name: "Q'thari", about: 'Twilight-ring hunters hardened by their flaring star',
    heartRate: band(70, 90, 140, 170), gasName: 'O₂ saturation', gas: band(70, 80, 99, 100),
    systolic: band(110, 140, 185, 210), diastolic: band(70, 90, 125, 145), temperature: band(38, 42, 49, 53),
    radiation: { caution: 8, danger: 30 }, careerDose: 5000,
  },
  alphacen: {
    name: 'Aurenne', about: 'Tall grassland grazers under a Sun-like star',
    heartRate: band(25, 35, 70, 90), gasName: 'O₂ saturation', gas: band(80, 88, 100, 100),
    systolic: band(140, 170, 230, 260), diastolic: band(90, 110, 150, 175), temperature: band(31, 33, 37, 40),
    radiation: { caution: 1.5, danger: 6 }, careerDose: 1200,
  },
}

/** The alien living on a world, or null if colonists there are human. */
export function alienFor(place: Place): AlienProfile | null {
  return isHumanWorld(place) ? null : ALIENS[place] ?? null
}

/** "a Rhul", "an Ossk" */
export const withArticle = (name: string) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`
