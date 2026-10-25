// The "vitals" collection: one row per reading a colonist logs (health, radiation, supplies).
// Health data is private: only the person who logged a reading can read it. Admins included,
// same as DMs. Every number is optional so you can log just one thing (say, a temperature).
import type { CollectionSchema } from 'deepspace/schema'
import { ALL_PLACES } from '../lib/space'

const FIELDS = [
  'body', 'heartRate', 'spo2', 'systolic', 'diastolic', 'temperature',
  'radiation', 'oxygenDays', 'waterDays', 'foodDays', 'note', 'source',
]

export const vitalsSchema: CollectionSchema = {
  name: 'vitals',
  columns: [
    // Where the reading was taken (the colonist's home world at the time).
    { name: 'body', storage: 'text', interpretation: { kind: 'select', options: ALL_PLACES } },

    // Health
    { name: 'heartRate', storage: 'number', interpretation: 'plain' }, // beats per minute, resting
    { name: 'spo2', storage: 'number', interpretation: 'plain' }, // blood oxygen, %
    { name: 'systolic', storage: 'number', interpretation: 'plain' }, // blood pressure, mmHg
    { name: 'diastolic', storage: 'number', interpretation: 'plain' }, // blood pressure, mmHg
    { name: 'temperature', storage: 'number', interpretation: 'plain' }, // body temperature, °C

    // Exposure
    { name: 'radiation', storage: 'number', interpretation: 'plain' }, // dose received today, mSv

    // Supplies: days left at the current use rate
    { name: 'oxygenDays', storage: 'number', interpretation: 'plain' },
    { name: 'waterDays', storage: 'number', interpretation: 'plain' },
    { name: 'foodDays', storage: 'number', interpretation: 'plain' },

    { name: 'note', storage: 'text', interpretation: 'plain' },
    // 'manual' (typed in) or 'sensor' (filled by the Read sensors button)
    { name: 'source', storage: 'text', interpretation: { kind: 'select', options: ['manual', 'sensor'] } },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'own', create: true, update: 'own', delete: 'own', writableFields: FIELDS },
    member: { read: 'own', create: true, update: 'own', delete: 'own', writableFields: FIELDS },
    admin: { read: 'own', create: true, update: 'own', delete: 'own', writableFields: FIELDS },
  },
}
