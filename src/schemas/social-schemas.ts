// Social collections: planet forum threads, comments, up/down votes, and feed likes/reposts.
import type { CollectionSchema } from 'deepspace/schema'

// Every forum slug in src/features/forums/forums.ts. The server rejects threads for any other forum.
const FORUM_SLUGS = [
  'mars', 'moon', 'earth', 'station',
  'europa', 'titan', 'ceres', 'ganymede', 'kuiper', 'proxima',
  'random', 'askacolonist', 'spacekitchen', 'hydroponics', 'signals', 'zerogmemes',
]

export const threadsSchema: CollectionSchema = {
  name: 'threads',
  columns: [
    { name: 'forum', storage: 'text', interpretation: { kind: 'select', options: FORUM_SLUGS }, required: true },
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'text', storage: 'text', interpretation: 'plain' },
    { name: 'authorName', storage: 'text', interpretation: 'plain' },
    // Set only by the server for bot colonists (their handle). Users can't set it, so nobody can pose as a bot.
    { name: 'botName', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: true, update: 'own', delete: 'own', writableFields: ['forum', 'title', 'text', 'authorName'] },
    member: { read: true, create: true, update: 'own', delete: 'own', writableFields: ['forum', 'title', 'text', 'authorName'] },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

export const commentsSchema: CollectionSchema = {
  name: 'comments',
  columns: [
    { name: 'threadId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'parentId', storage: 'text', interpretation: 'plain' }, // set when replying to another comment
    { name: 'text', storage: 'text', interpretation: 'plain', required: true },
    { name: 'authorName', storage: 'text', interpretation: 'plain' },
    { name: 'botName', storage: 'text', interpretation: 'plain' }, // bot colonist handle, server-only
  ],
  permissions: {
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: true, update: 'own', delete: 'own', writableFields: ['threadId', 'parentId', 'text', 'authorName'] },
    member: { read: true, create: true, update: 'own', delete: 'own', writableFields: ['threadId', 'parentId', 'text', 'authorName'] },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

// One vote per person per thread/comment (server-enforced). value is 1 (up) or -1 (down).
export const votesSchema: CollectionSchema = {
  name: 'votes',
  columns: [
    { name: 'targetId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'value', storage: 'number', interpretation: 'plain', required: true },
  ],
  uniqueOn: ['targetId', 'userId'],
  permissions: {
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: true, update: 'own', delete: 'own', writableFields: ['targetId', 'value'] },
    member: { read: true, create: true, update: 'own', delete: 'own', writableFields: ['targetId', 'value'] },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

// Likes and reposts on feed posts. One of each per person per post (server-enforced).
export const reactionsSchema: CollectionSchema = {
  name: 'reactions',
  columns: [
    { name: 'targetId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'kind', storage: 'text', interpretation: { kind: 'select', options: ['like', 'repost'] }, required: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
  ],
  uniqueOn: ['targetId', 'userId', 'kind'],
  permissions: {
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: true, update: false, delete: 'own', writableFields: ['targetId', 'kind'] },
    member: { read: true, create: true, update: false, delete: 'own', writableFields: ['targetId', 'kind'] },
    admin: { read: true, create: true, update: false, delete: true },
  },
}
