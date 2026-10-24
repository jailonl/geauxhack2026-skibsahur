// The "pois" collection: points of interest and hazards on the shared map.
// Register it by adding poiSchema to the array in src/schemas.ts.
import type { CollectionSchema } from 'deepspace/schema'

export const poiSchema: CollectionSchema = {
  name: 'pois',
  columns: [
    { name: 'name', storage: 'text', interpretation: 'plain', required: true },
    { name: 'description', storage: 'text', interpretation: 'plain' },
    {
      name: 'type',
      storage: 'text',
      interpretation: { kind: 'select', options: ['colony', 'hazard', 'resource', 'unknown'] },
    },

    // Location. Same format as posts: { body, lat, lng }.
    {
      name: 'body',
      storage: 'text',
      interpretation: { kind: 'select', options: ['earth', 'moon', 'mars', 'station'] },
    },
    { name: 'lat', storage: 'number', interpretation: 'plain' },
    { name: 'lng', storage: 'number', interpretation: 'plain' },

    // True/false flags. DeepSpace has no boolean storage, so these are numbers shown as booleans.
    { name: 'safe', storage: 'number', interpretation: { kind: 'boolean' } },
    { name: 'discovered', storage: 'number', interpretation: { kind: 'boolean' } },
  ],
  permissions: {
    // Guests can view the map but not add markers.
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: true, update: 'own', delete: 'own' },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
