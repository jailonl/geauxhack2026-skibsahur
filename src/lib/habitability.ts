// Can humans live there? Real conditions for every place in src/lib/space.ts, rounded, from NASA fact sheets
// and mission measurements (radiation: Curiosity on Mars, Chang'e 4 on the Moon, ISS dosimeters; Jupiter's
// moons: Galileo-era estimates). Only Earth is livable outdoors; everywhere else people survive only inside
// a sealed, shielded habitat, which is exactly why reliable communication matters.
import type { Place } from './space'

export type Verdict = 'livable' | 'habitat' | 'below-ice' | 'deadly' | 'ship' | 'unknown'

export const VERDICT_LABELS: Record<Verdict, { label: string; color: string }> = {
  livable: { label: 'Livable outdoors', color: '#22c55e' },
  habitat: { label: 'Only inside a sealed habitat', color: '#ffb454' },
  'below-ice': { label: 'Surface deadly; possible under the ice', color: '#fb923c' },
  deadly: { label: 'Not survivable', color: '#ff6b6b' },
  ship: { label: 'Only aboard a ship', color: '#94a3b8' },
  unknown: { label: 'Unknown: never visited', color: '#c084fc' },
}

export type Habitability = {
  verdict: Verdict
  gravity: string // compared with Earth
  temperature: string
  air: string // atmosphere and pressure
  radiation: string
  water: string
  danger: string // the thing most likely to kill you
}

export const HABITABILITY: Record<Place, Habitability> = {
  earth: {
    verdict: 'livable',
    gravity: '1 g',
    temperature: 'about 15 °C on average',
    air: '1 atmosphere, 21% oxygen',
    radiation: 'about 0.008 mSv a day',
    water: 'oceans, rivers, rain',
    danger: 'nothing special',
  },
  moon: {
    verdict: 'habitat',
    gravity: '0.17 g',
    temperature: '-173 °C at night to 127 °C in sunlight',
    air: 'none (vacuum)',
    radiation: 'about 1.4 mSv a day, roughly 200 times Earth',
    water: 'ice in shadowed craters at the poles',
    danger: 'vacuum, two-week nights, sharp dust',
  },
  station: {
    verdict: 'habitat',
    gravity: 'weightless',
    temperature: 'kept near 22 °C inside',
    air: 'only what the station makes',
    radiation: 'about 0.5 mSv a day',
    water: 'about 98% recycled',
    danger: 'leaks, fire, bone and muscle loss',
  },
  mars: {
    verdict: 'habitat',
    gravity: '0.38 g',
    temperature: 'about -63 °C on average (-125 °C to 20 °C)',
    air: 'under 1% of Earth\'s pressure, mostly carbon dioxide',
    radiation: 'about 0.67 mSv a day (measured by Curiosity)',
    water: 'ice under the ground and at the poles',
    danger: 'thin air, cold, dust storms, radiation',
  },
  ceres: {
    verdict: 'habitat',
    gravity: '0.03 g',
    temperature: 'about -105 °C',
    air: 'none',
    radiation: 'high (no magnetic field or air)',
    water: 'ice in the crust, possible salty brine below',
    danger: 'vacuum, almost no gravity',
  },
  europa: {
    verdict: 'below-ice',
    gravity: '0.13 g',
    temperature: 'about -160 °C',
    air: 'almost none',
    radiation: 'about 5,400 mSv a day at the surface: deadly within days',
    water: 'a salty ocean under the ice',
    danger: 'Jupiter\'s radiation belts',
  },
  ganymede: {
    verdict: 'habitat',
    gravity: '0.15 g',
    temperature: 'about -160 °C',
    air: 'a trace of oxygen',
    radiation: 'about 80 mSv a day: heavy shielding needed',
    water: 'a buried ocean under thick ice',
    danger: 'radiation and extreme cold',
  },
  io: {
    verdict: 'deadly',
    gravity: '0.18 g',
    temperature: 'about -130 °C, with lava over 1,000 °C',
    air: 'a trace of sulfur dioxide',
    radiation: 'about 36,000 mSv a day: lethal in hours',
    water: 'none',
    danger: 'radiation and constant volcanoes',
  },
  titan: {
    verdict: 'habitat',
    gravity: '0.14 g',
    temperature: 'about -179 °C',
    air: '1.5 times Earth\'s pressure, nitrogen (no suit needed, just heat and oxygen)',
    radiation: 'low: the thick air shields you',
    water: 'ice everywhere; lakes are liquid methane',
    danger: 'extreme cold, no oxygen',
  },
  enceladus: {
    verdict: 'habitat',
    gravity: '0.01 g',
    temperature: 'about -200 °C',
    air: 'none',
    radiation: 'moderate',
    water: 'an ocean that sprays out of geysers',
    danger: 'vacuum, cold, almost no gravity',
  },
  kuiper: {
    verdict: 'ship',
    gravity: 'weightless (no ground to stand on)',
    temperature: 'about -230 °C outside',
    air: 'only what the ship makes',
    radiation: 'high cosmic rays',
    water: 'ice in the small worlds out there',
    danger: 'distance: help is hours away at light speed',
  },
  proxima: {
    verdict: 'unknown',
    gravity: 'about 1.1 g (estimated from its mass)',
    temperature: 'about -40 °C if it has no air (estimate)',
    air: 'unknown',
    radiation: 'strong flares from its red dwarf star',
    water: 'possible: it orbits in the star\'s habitable zone',
    danger: 'stellar flares; one side may always face the star',
  },
  alphacen: {
    verdict: 'unknown',
    gravity: 'no confirmed planet yet (this colony is an orbiting habitat)',
    temperature: 'depends on the habitat',
    air: 'only what the habitat makes',
    radiation: 'a Sun-like star, so calmer than Proxima',
    water: 'unknown',
    danger: 'distance: a message home takes 4.4 years',
  },
}
