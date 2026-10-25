// Our own post generator for the aliens (no AI service, no API).
// It works like a fill-in-the-blank grammar: a sentence like "Ate #food# for #meal#. #rating#"
// has each #word# replaced by a random choice from that word's list, and choices can contain more #words#.
// The random choices come from a seeded random number generator, so a given time slot always produces
// the same post. That means everyone watching the app sees the same aliens say the same things at
// the same moment, without saving anything to the database.
import { formatLongDelay } from '../../lib/space'
import { alienWord, hash, pick, seededRandom, toAlien } from './alienLang'
import { SPECIES, type Species } from './species'

export type Grammar = Record<string, string[]>

/** Words every species shares. Each species adds its own weather, dishes, sports, and teams (species.ts). */
const SHARED: Grammar = {
  origin: ['#weather#', '#weather#', '#humans#', '#humans#', '#food#', '#daily#', '#question#', '#sports#', '#hello#', '#news#'],

  humans: [
    'The humans at #humanBase# lit up their dome again tonight. #reaction#',
    'Watched a human #humanAct# for #num# #units#. #reaction#',
    'Picked up a human transmission: "#humanQuote#" #reaction#',
    'The humans keep talking about #humanTopic#. #reaction#',
    'A human rover drove right past my #home#. #reaction#',
  ],
  humanBase: ['Jezero Base', 'Shackleton Outpost', 'the orbital station', 'Mission Control'],
  humanAct: ['drop a wrench', 'jog in a small circle', 'talk to a plant', 'fix a solar panel', 'take a picture of a rock', 'dance alone in a dome', 'eat soup through a straw'],
  humanTopic: ['oxygen', 'their light delay', 'something called coffee', 'dust on their solar panels', 'missing home', 'how slow their messages are'],
  reaction: ['Fascinating.', 'We do not understand them.', 'Adorable.', 'Concerning.', 'Should we say hello?', 'Not yet. Not yet.', 'The elders say be patient.', 'Ha!', 'Their antennae are so small.', 'I like this one.'],

  food: ['Ate #dish# for #meal#. #rating#', 'Who wants #dish#? I made too much.', 'Tried a new #dish# recipe. #rating#'],
  meal: ['first meal', 'second meal', 'the long-dark snack', 'tide feast'],
  rating: ['Delicious.', 'Never again.', 'Ten out of ten.', 'My grandmother made it better.', 'Still chewing.'],

  daily: ['#chore#. #mood#', 'Day #num0# of #chore2#. #mood#', 'My #family# is visiting from #place#. #mood#'],
  chore: ['Cleaned my shell', 'Reorganized my rock collection', 'Taught my hatchling to count to #num#', 'Fixed the hole in my #home#', 'Napped for #num# #units#'],
  chore2: ['learning the human alphabet', 'growing a new antenna', 'waiting for the humans to notice us'],
  family: ['cousin', 'hatchling', 'grandmother', 'third parent'],
  home: ['burrow', 'den', 'nest', 'shell', 'cave'],
  mood: ['Feeling good.', 'Very tired.', 'Life is strange.', 'All is calm.', 'Could be worse.', 'Happy cycle, everyone.'],

  question: ['Does anyone know #q#?', 'Quick question: #q#?', 'Is it true #q2#?'],
  q: ['why the humans sleep so much', 'how to get sulfur out of a shell', 'when the next eclipse is', 'what a "Monday" is', 'a good name for a hatchling'],
  q2: ['the humans can only see one color of light', 'humans have only two eyes', 'the humans built a whole station just to float'],

  sports: ['#team# beat #team# #num#-#numSmall# in #sport#! #cheer#', 'Big #sport# match tonight. Go #team#!'],
  cheer: ['What a game.', 'I lost my voice.', 'Robbed!', 'Champions again.'],

  hello: ['Sent a hello to the humans on Earth. It takes #delay# to get there. I will wait.', 'Our signals take #delay# to reach Earth. The humans are always hearing old news from us.'],

  news: ['The council of #place# voted to #policy#. #reaction#', 'Breaking news from #place#: #event#'],
  policy: ['stay hidden from the humans a little longer', 'build a bigger antenna', 'learn one human word per cycle', 'ban loud humming after the long dark'],
  event: ['a festival starts tonight.', 'everyone ran out of snacks.', 'it flooded again.', 'nothing happened. Very peaceful.'],

  units: ['cycles', 'tides', 'hours', 'orbits'],
  time: ['first light', 'the long dark', 'mid-cycle', 'the third tide'],
}

/** Pull one random number list entry: #num# (2-12), #numSmall# (0-6), #num0# (60-140). */
function numberFor(rule: string, random: () => number): string | null {
  if (rule === 'num') return String(2 + Math.floor(random() * 11))
  if (rule === 'numSmall') return String(Math.floor(random() * 7))
  if (rule === 'num0') return String(60 + Math.floor(random() * 81))
  return null
}

/** Replace every #rule# in the text with a random choice, up to 6 levels deep. Also used by the colony chatter. */
export function expand(text: string, grammar: Grammar, random: () => number, depth = 0): string {
  if (depth > 6) return text
  return text.replace(/#(\w+)#/g, (_, rule: string) => {
    const n = numberFor(rule, random)
    if (n) return n
    const options = grammar[rule]
    return options ? expand(pick(options, random), grammar, random, depth + 1) : rule
  })
}

export type AlienPost = {
  id: string
  at: number // when it was "posted" (ms)
  species: Species
  name: string
  from: string
  english: string
  alien: string
  signalSeconds: number // how long the signal took to reach Earth
}

/** The same alien always has the same name and home for a given number. */
function alienName(species: Species, n: number): { name: string; from: string } {
  const word = alienWord(`name${n}`, species.id, species.sounds)
  const name = word[0].toUpperCase() + word.slice(1)
  const from = species.places[hash(name) % species.places.length]
  return { name, from }
}

/**
 * The post for one time slot, or null if nobody posts in that slot.
 * chance = how often a slot has a post (0 to 1). humanQuotes = a few recent human post texts the aliens can "intercept".
 */
export function alienPostForSlot(slot: number, slotMs: number, chance: number, humanQuotes: string[]): AlienPost | null {
  const random = seededRandom(hash(`slot:${slot}`))
  if (random() > chance) return null

  const species = pick(SPECIES, random)
  const at = slot * slotMs
  const signalSeconds = species.delayToEarth(at)
  const { name, from } = alienName(species, Math.floor(random() * 40))

  const grammar: Grammar = {
    ...SHARED,
    ...species.words,
    place: species.places,
    delay: [formatLongDelay(signalSeconds)],
    // If there are no human posts to quote yet, quote something humans say a lot.
    humanQuote: humanQuotes.length > 0 ? humanQuotes : ['Is anyone out there?', 'Comms check, over.'],
  }
  const raw = expand('#origin#', grammar, random)
  const english = raw[0].toUpperCase() + raw.slice(1)
  return { id: `alien-${slot}`, at, species, name, from, english, alien: toAlien(english, species.id, species.sounds), signalSeconds }
}
