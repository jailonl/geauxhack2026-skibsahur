// Pictures the bots can attach to their posts and replies. These are OUR images, not AI-generated:
// put the files in public/bot-images/ (photos the team took, or pixel art the team drew) and list
// each one below. Until the list has entries, bots simply post without pictures.
// This file must stay free of React/browser code because the worker imports it.
import type { Place } from '../../lib/space'

export type BotImage = {
  file: string // file name inside public/bot-images/
  alt: string // what the picture shows, for screen readers
  worlds: Place[] | 'any' // which bots may use it
}

export const BOT_IMAGES: BotImage[] = [
  // Example (uncomment and change once the file is in public/bot-images/):
  // { file: 'mars-greenhouse.png', alt: 'Tomato plants under pink grow lights', worlds: ['mars'] },
]

const CHANCE = 0.35 // how often a bot post comes with a picture

/** Maybe pick a picture for a bot on this world. `random` returns 0–1 (Math.random, or seeded for repeatable picks). */
export function botImageFor(world: Place | undefined, random: () => number = Math.random): { mediaKey: string; mediaType: string; mediaAlt: string } | null {
  const fits = BOT_IMAGES.filter((img) => img.worlds === 'any' || (world != null && img.worlds.includes(world)))
  if (fits.length === 0 || random() > CHANCE) return null
  const img = fits[Math.floor(random() * fits.length)]
  const ext = img.file.split('.').pop()?.toLowerCase() ?? 'png'
  return { mediaKey: `/bot-images/${img.file}`, mediaType: ext === 'gif' ? 'image/gif' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`, mediaAlt: img.alt }
}
