// The "profiles" collection: one public profile per account (username, picture, bio, home planet, color).
// Usernames are unique, enforced by the server. userId is filled in by the server with the signed-in
// user's id, so nobody can create a profile for someone else.
import type { CollectionSchema } from 'deepspace/schema'

const EDITABLE = ['username', 'displayName', 'bio', 'homeBody', 'avatarKey', 'accent']

export const profilesSchema: CollectionSchema = {
  name: 'profiles',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'username', storage: 'text', interpretation: 'plain', required: true },
    { name: 'displayName', storage: 'text', interpretation: 'plain' },
    { name: 'bio', storage: 'text', interpretation: 'plain' },
    {
      name: 'homeBody',
      storage: 'text',
      interpretation: { kind: 'select', options: ['earth', 'moon', 'mars', 'station'] },
      default: 'earth',
    },
    { name: 'avatarKey', storage: 'text', interpretation: 'plain' }, // uploaded profile picture
    { name: 'accent', storage: 'text', interpretation: 'plain' }, // personal color, e.g. #7c83fd
  ],
  uniqueOn: ['username'],
  permissions: {
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: true, update: 'own', delete: 'own', writableFields: EDITABLE },
    member: { read: true, create: true, update: 'own', delete: 'own', writableFields: EDITABLE },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
