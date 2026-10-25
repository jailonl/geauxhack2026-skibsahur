// The "vitalsPublic" collection: the latest vitals of colonists who chose "Public" on the Vitals page.
// One row per person. It exists only while they're public: switching back to private deletes it, so
// nothing is left for others to read. Their full history in "vitals" always stays private.
import type { CollectionSchema } from 'deepspace/schema'

const FIELDS = [
  'body', 'heartRate', 'spo2', 'systolic', 'diastolic', 'temperature',
  'radiation', 'missionDose', 'oxygenDays', 'waterDays', 'foodDays', 'takenAt',
]

export const vitalsPublicSchema: CollectionSchema = {
  name: 'vitalsPublic',
  columns: [
    // Filled in by the server with the signed-in user's id, so nobody can publish for someone else.
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'body', storage: 'text', interpretation: { kind: 'select', options: ['earth', 'moon', 'mars', 'station'] } },
    { name: 'heartRate', storage: 'number', interpretation: 'plain' },
    { name: 'spo2', storage: 'number', interpretation: 'plain' },
    { name: 'systolic', storage: 'number', interpretation: 'plain' },
    { name: 'diastolic', storage: 'number', interpretation: 'plain' },
    { name: 'temperature', storage: 'number', interpretation: 'plain' },
    { name: 'radiation', storage: 'number', interpretation: 'plain' },
    { name: 'missionDose', storage: 'number', interpretation: 'plain' }, // total mSv so far
    { name: 'oxygenDays', storage: 'number', interpretation: 'plain' },
    { name: 'waterDays', storage: 'number', interpretation: 'plain' },
    { name: 'foodDays', storage: 'number', interpretation: 'plain' },
    { name: 'takenAt', storage: 'number', interpretation: 'plain' }, // newest reading, ms since 1970
  ],
  uniqueOn: ['userId'],
  permissions: {
    // Anyone (guests too) can see public vitals, like a public profile.
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: true, update: 'own', delete: 'own', writableFields: FIELDS },
    member: { read: true, create: true, update: 'own', delete: 'own', writableFields: FIELDS },
    admin: { read: true, create: true, update: 'own', delete: true, writableFields: FIELDS },
  },
}
