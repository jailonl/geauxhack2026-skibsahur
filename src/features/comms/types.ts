// Shape of one post's data. Matches the columns in src/schemas/posts-schema.ts.
import type { Body } from '../../lib/space'

export type { Body }

export type Post = {
  text: string
  authorName?: string
  mediaKey?: string
  mediaType?: string
  mediaAlt?: string
  body?: Body
  lat?: number
  lng?: number
  botKind?: 'system' | 'alien' // set only by colony bots
}
