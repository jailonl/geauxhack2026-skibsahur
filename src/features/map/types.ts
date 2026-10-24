import type { Body } from '../comms/types'

export type PoiType = 'colony' | 'hazard' | 'resource' | 'unknown'

export type PointOfInterest = {
    name: string
    description?: string
    type: PoiType
    body: Body
    lat: number
    lng: number
    safe: number | boolean
    discovered: number | boolean
}

