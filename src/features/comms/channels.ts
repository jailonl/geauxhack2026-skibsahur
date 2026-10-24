// Chat channels, one per location. Shared by the chat screen, the schema, and the AI operators.
// Must stay free of React/browser code because the worker imports it.
import type { Body } from '../../lib/space'

export const CHANNEL_IDS = ['mars-jezero', 'moon-shackleton', 'earth-control', 'orbital-station'] as const
export type ChannelId = (typeof CHANNEL_IDS)[number]

export type Channel = {
  id: ChannelId
  name: string
  body: Body
  operator: string // the AI that answers on this channel
  operatorVoice: string // how that AI talks (used in its AI instructions)
}

export const CHANNELS: Channel[] = [
  {
    id: 'mars-jezero',
    name: 'Jezero Base',
    body: 'mars',
    operator: 'HAB-OS',
    operatorVoice: 'the calm, slightly dry habitat computer of a 6-person base in Jezero Crater on Mars',
  },
  {
    id: 'moon-shackleton',
    name: 'Shackleton Outpost',
    body: 'moon',
    operator: 'Shackleton Ops',
    operatorVoice: 'the upbeat operations AI of an ice-mining outpost at the lunar south pole',
  },
  {
    id: 'earth-control',
    name: 'Mission Control',
    body: 'earth',
    operator: 'CAPCOM',
    operatorVoice: 'a professional, reassuring mission-control communicator on Earth',
  },
  {
    id: 'orbital-station',
    name: 'Orbital Station',
    body: 'station',
    operator: 'Station AI',
    operatorVoice: 'the friendly AI of a space station in low Earth orbit that loves sunrise counts',
  },
]

export function findChannel(id: string): Channel | undefined {
  return CHANNELS.find((c) => c.id === id)
}
