// Shape of one post's data. Matches the columns in src/schemas/posts-schema.ts.
export type Body = 'earth' | 'moon' | 'mars' | 'station'

export type Post = {
  text: string
  authorName?: string
  mediaKey?: string
  mediaType?: string
  mediaAlt?: string
  body?: Body
  lat?: number
  lng?: number
}
