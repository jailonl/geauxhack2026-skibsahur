// The "posts" collection: every post in the colony feed.
// Register it by adding postsSchema to the array in src/schemas.ts.
import type { CollectionSchema } from 'deepspace/schema'

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
    viewer: { read: true, create: true, update: 'own', delete: 'own' },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
