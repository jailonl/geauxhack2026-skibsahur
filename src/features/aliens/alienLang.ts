// The alien languages. No AI and no API: each species has its own sounds (syllable lists), and every
// English word is turned into an alien word by hashing it. The same word always gives the same alien
// word for that species, so the languages are consistent: "water" is always the same word on Europa.

/** FNV-1a hash: turns a string into a 32-bit number. Same input, same number, every time. */
export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Mulberry32: a tiny seeded random number generator. Same seed, same sequence of numbers. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.floor(random() * list.length)]
}

/** The sounds one species uses. */
export type Phonology = {
  onsets: string[] // sounds that start a syllable
  vowels: string[]
  codas: string[] // sounds that can end a word
}

/** Turn one English word into this species' word for it. */
export function alienWord(english: string, speciesId: string, sounds: Phonology): string {
  const word = english.toLowerCase()
  const random = seededRandom(hash(`${speciesId}:${word}`))
  // Longer English words get longer alien words (1 to 3 syllables).
  const syllables = word.length <= 3 ? 1 : word.length <= 6 ? 2 : 3
  let out = ''
  for (let i = 0; i < syllables; i++) out += pick(sounds.onsets, random) + pick(sounds.vowels, random)
  if (random() < 0.45) out += pick(sounds.codas, random)
  return out
}

/** Translate a whole English sentence, keeping punctuation, numbers, and capital letters where they were. */
export function toAlien(english: string, speciesId: string, sounds: Phonology): string {
  return english.replace(/[A-Za-z']+/g, (word) => {
    const alien = alienWord(word.replace(/'/g, ''), speciesId, sounds)
    return word[0] === word[0].toUpperCase() ? alien[0].toUpperCase() + alien.slice(1) : alien
  })
}
