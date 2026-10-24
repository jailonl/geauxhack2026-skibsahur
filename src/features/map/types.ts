import type { Body } from '../comms/types'

// Places the map covers: the 4 home worlds plus outer colonies from the forums.
// Map-only on purpose, so posts, profiles, DMs, and light-delay keep using Body unchanged.
export type MapBody = Body | 'europa' | 'titan' | 'ceres' | 'ganymede'

export type PoiType = 'colony' | 'hazard' | 'resource' | 'unknown'

export type PointOfInterest = {
    name: string
    description?: string
    type: PoiType
    body: MapBody
    lat: number
    lng: number
    safe: number | boolean
    discovered: number | boolean
}

