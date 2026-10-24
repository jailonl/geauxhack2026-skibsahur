// The "posts" collection: every post on the home feed, including replies and quote posts.
// Register it by adding postsSchema to the array in src/schemas.ts.
import type { CollectionSchema } from 'deepspace/schema'

// Fields signed-in users may set. botKind is left out so nobody can disguise a post as a bot.
const USER_FIELDS = [
  'text', 'authorName', 'mediaKey', 'mediaType', 'mediaAlt', 'body', 'lat', 'lng', 'replyToId', 'quoteOfId',
]

export const postsSchema: CollectionSchema = {
  name: 'posts',
  columns: [
    { name: 'text', storage: 'text', interpretation: 'plain', required: true },
    // Username at the time of posting. Bots use it for their name; people show their live profile instead.
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

    // Conversation links: a reply points at its parent post; a quote post points at the post it quotes.
    { name: 'replyToId', storage: 'text', interpretation: 'plain' },
    { name: 'quoteOfId', storage: 'text', interpretation: 'plain' },

    // Set only by the bot job / admin action, never by users: 'system' (habitat AIs, rovers) or 'alien'.
    { name: 'botKind', storage: 'text', interpretation: { kind: 'select', options: ['system', 'alien'] } },
  ],
  permissions: {
    // Anyone can read the feed. Posting, replying, and quoting need an account.
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: true, update: 'own', delete: 'own', writableFields: USER_FIELDS },
    member: { read: true, create: true, update: 'own', delete: 'own', writableFields: USER_FIELDS },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
