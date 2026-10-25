/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { postsSchema } from './schemas/posts-schema'
import { profilesSchema } from './schemas/profiles-schema'
import { dmsSchema } from './schemas/dms-schema'
import { commentsSchema, reactionsSchema, threadsSchema, votesSchema } from './schemas/social-schemas'
import { poiSchema } from './schemas/poi-schema'
import { vitalsSchema } from './schemas/vitals-schema'
import { vitalsPublicSchema } from './schemas/vitals-public-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  postsSchema,
  profilesSchema,
  reactionsSchema,
  dmsSchema,
  threadsSchema,
  commentsSchema,
  votesSchema,
  poiSchema,
  vitalsSchema,
  vitalsPublicSchema,
]