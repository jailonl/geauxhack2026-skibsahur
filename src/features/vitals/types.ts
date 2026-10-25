// Shape of one vitals reading. Matches the columns in src/schemas/vitals-schema.ts.
import type { Body } from '../../lib/space'

export type Vitals = {
  body?: Body
  heartRate?: number
  spo2?: number
  systolic?: number
  diastolic?: number
  temperature?: number
  radiation?: number
  oxygenDays?: number
  waterDays?: number
  foodDays?: number
  note?: string
  source?: 'manual' | 'sensor'
}

/** A reading as it comes back from the database. */
export type VitalsRecord = {
  recordId: string
  data: Vitals
  createdBy: string
  createdAt: string
}

/** The number fields a colonist can log (everything except body, note, source). */
export type VitalKey =
  | 'heartRate' | 'spo2' | 'systolic' | 'diastolic' | 'temperature'
  | 'radiation' | 'oxygenDays' | 'waterDays' | 'foodDays'

export type Level = 'ok' | 'caution' | 'danger'

export type Check = { level: Level; reason: string }
