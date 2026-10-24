// The "dms" collection: private direct messages, including conversations with the AI operators.
// Only the sender (createdBy) and the people in `participants` can read a message; the server enforces it.
// Each message stores when it arrives (deliverAt), so messages between planets wait out the light-delay.
import type { CollectionSchema } from 'deepspace/schema'

const FIELDS = ['toId', 'participants', 'content', 'fromBody', 'toBody', 'deliverAt', 'speed', 'wantsReply']

export const dmsSchema: CollectionSchema = {
  name: 'dms',
  columns: [
    // Recipient: a user id, or an operator id like "op:hab-os".
    { name: 'toId', storage: 'text', interpretation: 'plain', required: true },
    // JSON list of user ids (besides the sender) allowed to read this message: normally just the recipient.
    { name: 'participants', storage: 'text', interpretation: { kind: 'json' }, required: true },
    { name: 'content', storage: 'text', interpretation: 'plain', required: true },
    { name: 'fromBody', storage: 'text', interpretation: { kind: 'select', options: ['earth', 'moon', 'mars', 'station'] } },
    { name: 'toBody', storage: 'text', interpretation: { kind: 'select', options: ['earth', 'moon', 'mars', 'station'] } },
    // Arrival time in milliseconds since 1970 (Date.now() style).
    { name: 'deliverAt', storage: 'number', interpretation: 'plain', required: true },
    { name: 'speed', storage: 'number', interpretation: 'plain', default: 1 }, // demo speed-up (1 = real time)
    // 1 = a message to an AI operator that still needs an answer (handled by src/cron.ts).
    { name: 'wantsReply', storage: 'number', interpretation: 'plain', default: 0 },
    // Set only by the server on AI operator replies: which operator sent it.
    { name: 'isOperator', storage: 'number', interpretation: 'boolean' },
    { name: 'fromId', storage: 'text', interpretation: 'plain' },
  ],
  collaboratorsField: 'participants',
  permissions: {
    // Private for everyone, admins included: sender + participants only.
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'collaborator', create: true, update: false, delete: 'own', writableFields: FIELDS },
    member: { read: 'collaborator', create: true, update: false, delete: 'own', writableFields: FIELDS },
    admin: { read: 'collaborator', create: true, update: false, delete: true },
  },
}
