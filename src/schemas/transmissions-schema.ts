// The "transmissions" collection: chat messages between colonies.
// Each message stores where it was sent from and when it arrives (deliverAt),
// so messages between planets wait out the real light-delay before they can be read.
import type { CollectionSchema } from 'deepspace/schema'
import { CHANNEL_IDS } from '../features/comms/channels'

// Fields users may set. isOperator is left out so nobody can pose as a channel's AI.
const FIELDS = ['channel', 'content', 'authorName', 'fromBody', 'deliverAt', 'speed', 'wantsReply']

export const transmissionsSchema: CollectionSchema = {
  name: 'transmissions',
  columns: [
    { name: 'channel', storage: 'text', interpretation: { kind: 'select', options: [...CHANNEL_IDS] }, required: true },
    { name: 'content', storage: 'text', interpretation: 'plain', required: true },
    { name: 'authorName', storage: 'text', interpretation: 'plain' },
    {
      name: 'fromBody',
      storage: 'text',
      interpretation: { kind: 'select', options: ['earth', 'moon', 'mars', 'station'] },
      required: true,
    },
    // Arrival time in milliseconds since 1970 (Date.now() style).
    { name: 'deliverAt', storage: 'number', interpretation: 'plain', required: true },
    // Demo speed-up the sender used (1 = real time).
    { name: 'speed', storage: 'number', interpretation: 'plain', default: 1 },
    // Set only by the server when a channel's AI operator replies.
    { name: 'isOperator', storage: 'number', interpretation: 'boolean' },
    // 1 = waiting for the channel's AI operator to answer. The scheduled job sets it to 0 once handled.
    { name: 'wantsReply', storage: 'number', interpretation: 'plain', default: 0 },
  ],
  permissions: {
    // Same rules as the feed: guests can read and send, signed-in users can delete their own, admins anything.
    '*': { read: true, create: true, update: false, delete: false, writableFields: FIELDS },
    viewer: { read: true, create: true, update: false, delete: 'own', writableFields: FIELDS },
    member: { read: true, create: true, update: false, delete: 'own', writableFields: FIELDS },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
