// The "posts" collection: every post in the colony feed.
// Register it by adding postsSchema to the array in src/schemas.ts.
import type { CollectionSchema } from 'deepspace/schema'

// Fields signed-in users may set. Guests get the same minus the media fields.
const USER_FIELDS = ['text', 'authorName', 'mediaKey', 'mediaType', 'mediaAlt', 'body', 'lat', 'lng']

export const postsSchema: CollectionSchema = {
  name: 'posts',
  columns: [
    { name: 'text', storage: 'text', interpretation: 'plain', required: true },
    { name: 'authorName', storage: 'text', interpretation: 'plain' },

    // Photo/video: we store the uploaded file's key, its type, and alt text for screen readers.
    { name: 'mediaKey', storage: 'text', interpretation: 'plain' },
    { name: 'mediaType', storage: 'text', interpretation: 'plain' },
    { name: 'mediaAlt', storage: 'text', interpretation: 'plain' },

    // Optional location tag. Same format the POI map uses: { body, lat, lng }.
    {
      name: 'body',
      storage: 'text',
      interpretation: { kind: 'select', options: ['earth', 'moon', 'mars', 'station'] },
    },
    { name: 'lat', storage: 'number', interpretation: 'plain' },
    { name: 'lng', storage: 'number', interpretation: 'plain' },

    // Set only by the bot job / admin action, never by users: 'system' (habitat AIs, rovers) or 'alien'.
    { name: 'botKind', storage: 'text', interpretation: { kind: 'select', options: ['system', 'alien'] } },
  ],
  permissions: {
    // Signed-out guests can read and post text only (no media fields), and can't edit or delete.
    '*': {
      read: true,
      create: true,
      update: false,
      delete: false,
      writableFields: ['text', 'authorName', 'body', 'lat', 'lng'],
    },
    // New users start as "viewer", so viewers and members can post and edit/delete their own posts.
    // writableFields leaves out botKind so nobody can disguise a post as a bot.
    viewer: { read: true, create: true, update: 'own', delete: 'own', writableFields: USER_FIELDS },
    member: { read: true, create: true, update: 'own', delete: 'own', writableFields: USER_FIELDS },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
