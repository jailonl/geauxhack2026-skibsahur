// predetermend lanmarks on each world
// harcoded

import type { MapBody } from './types'

export type Landmark = { body: MapBody; name: string; lat: number; lng: number; note: string }

export const LANDMARKS: Landmark[] = [
  { body: 'mars', name: 'Olympus Mons', lat: 18.6, lng: -134, note: 'Largest volcano in the solar system' },
  { body: 'mars', name: 'Jezero Crater', lat: 18.4, lng: 77.6, note: 'Perseverance rover landing site' },
  { body: 'mars', name: 'Valles Marineris', lat: -14, lng: -59, note: 'Canyon system 4,000 km long' },

  { body: 'moon', name: 'Apollo 11 site', lat: 0.7, lng: 23.5, note: 'First crewed landing, 1969' },
  { body: 'moon', name: 'Tycho crater', lat: -43.3, lng: -11.4, note: 'Bright young crater with long rays' },
  { body: 'moon', name: 'Shackleton crater', lat: -89.9, lng: 0, note: 'South pole, likely water ice' },

  { body: 'titan', name: 'Huygens landing site', lat: -10.3, lng: 167.7, note: 'Only landing on an outer-planet moon, 2005' },
  { body: 'ceres', name: 'Occator crater', lat: 19.8, lng: -120.7, note: 'The famous bright salt spots' },
]
