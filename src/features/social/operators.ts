// AI operators: one per location, reachable by DM like any user (@hab-os, @capcom, ...).
// Their replies come from DeepSpace AI (src/features/comms/ai.ts), sent by the scheduled job in src/cron.ts.
// Must stay free of React/browser code because the worker imports it.
import type { Body } from '../../lib/space'

export type Operator = {
  id: `op:${string}` // used as the DM recipient id
  handle: string // the @username people type
  name: string
  body: Body
  place: string
  voice: string // how it talks (used in its AI instructions)
  accent: string
}

export const OPERATORS: Operator[] = [
  {
    id: 'op:hab-os',
    handle: 'hab-os',
    name: 'HAB-OS',
    body: 'mars',
    place: 'Jezero Base, Mars',
    voice: 'the calm, slightly dry habitat computer of a 6-person base in Jezero Crater on Mars',
    accent: '#e4572e',
  },
  {
    id: 'op:shackleton-ops',
    handle: 'shackleton-ops',
    name: 'Shackleton Ops',
    body: 'moon',
    place: 'Shackleton Outpost, Moon',
    voice: 'the upbeat operations AI of an ice-mining outpost at the lunar south pole',
    accent: '#a0a4b8',
  },
  {
    id: 'op:capcom',
    handle: 'capcom',
    name: 'CAPCOM',
    body: 'earth',
    place: 'Mission Control, Earth',
    voice: 'a professional, reassuring mission-control communicator on Earth',
    accent: '#3b82f6',
  },
  {
    id: 'op:station-ai',
    handle: 'station-ai',
    name: 'Station AI',
    body: 'station',
    place: 'Orbital Station',
    voice: 'the friendly AI of a space station in low Earth orbit that loves counting sunrises',
    accent: '#22c55e',
  },
]

export function findOperator(idOrHandle: string): Operator | undefined {
  return OPERATORS.find((o) => o.id === idOrHandle || o.handle === idOrHandle)
}

export function isOperatorId(id: string): boolean {
  return id.startsWith('op:')
}
