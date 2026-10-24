// POI rules with no UI, ported from my Java PoiForm (isAlreadyDiscovered, isValid, the off-map check).
import type { MapBody, PoiType, PointOfInterest } from './types'

export const MAP_BODIES: MapBody[] = ['moon', 'mars', 'station', 'europa', 'titan', 'ceres', 'ganymede'] // the map tabs
export const POI_TYPES: PoiType[] = ['colony', 'hazard', 'resource', 'unknown']
export const NEARBY = 1.0 // within 1 degree counts as the same spot

export function isOnMap(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// Was a POI already found near this spot on the same planet?
export function isAlreadyDiscovered(pois: PointOfInterest[], body: MapBody, lat: number, lng: number): boolean {
  return pois.some(
    (p) => p.body === body && Math.abs(p.lat - lat) <= NEARBY && Math.abs(p.lng - lng) <= NEARBY,
  )
}
