// Colony chatter: everyday posts from the bot colonists on each home world, so every feed tab
// (Mars, Moon, Earth, Orbit) always has something to read. Same no-AI approach as the aliens:
// fill-in-the-blank sentences picked by a seeded random generator, one possible post per 3-second slot.
// Always shown with a "Bot" badge, and hidden by the "Show bots" setting.
import type { Body } from '../../lib/space'
import { hash, pick, seededRandom } from '../aliens/alienLang'
import { expand, type Grammar } from '../aliens/generator'
import { botImageFor } from '../comms/botImages'
import { findColonist, type Colonist } from '../forums/colonists'

type BotPicture = { mediaKey: string; mediaType: string; mediaAlt: string }
import { SLOT_MS, collect } from './stream'

export type ColonyPost = { id: string; at: number; world: Body; colonist: Colonist; text: string; image: BotPicture | null }

const WORLDS: Body[] = ['mars', 'moon', 'earth', 'station']

// Who posts from each world (bot colonists from src/features/forums/colonists.ts).
const POSTERS: Record<Body, string[]> = {
  mars: ['galley_gus', 'olympus_climber', 'newbie_niko'],
  moon: ['lunar_lou'],
  earth: ['capcom_casey'],
  station: ['orbit_ola'],
}

const SHARED: Grammar = {
  wow: ['Never gets old.', 'Wish you could see it.', 'Unreal.', 'Took a picture for my family.'],
  rating: ['Not bad.', 'Surprisingly good.', 'Never again.', 'The crew loved it.'],
  mood: ['Good day.', 'Long shift.', 'Feeling lucky.', 'Tired but happy.'],
}

const WORLD_WORDS: Record<Body, Grammar> = {
  mars: {
    origin: [
      'Dust on the solar panels again. Swept #num# panels before breakfast. #mood#',
      'Sol #sol#: #marsDay#',
      'The greenhouse #crop# are finally ready. #wow#',
      'Made #dish# out of rations tonight. #rating#',
      'Suit check before you go out, everyone. #tip#',
      'Watched the sunset turn blue over Jezero. #wow#',
      'First week on Mars and I still bounce when I walk. Is that normal?',
    ],
    marsDay: ['rover maintenance all morning.', 'dust storm on the horizon, staying inside.', 'found a rock that looks like a face.', 'water recycler is humming again.'],
    crop: ['tomatoes', 'potatoes', 'peppers', 'lettuce'],
    dish: ['potato pancakes', 'spicy bean stew', 'greenhouse salad', 'freeze-dried tacos'],
    tip: ['Check your seals twice.', 'Never go out alone.', 'Top off your oxygen first.'],
  },
  moon: {
    origin: [
      'Earthrise over the crater rim. #wow#',
      'Mined #num0# kilos of ice from the crater floor today. #mood#',
      'Regolith in my boots, my bunk, and my coffee. #mood#',
      'Two weeks of night start soon. Charging every battery we have.',
      'Hopped #num# meters on a supply run. Low gravity is the best part of the job.',
    ],
  },
  earth: {
    origin: [
      'Mission Control here: all colonies are green tonight. #mood#',
      'The next launch window to Mars opens in #num# days. Get your cargo lists in.',
      'Clear skies at the launch site for the #num#:00 supply launch.',
      'Reminder to all colonies: send your weekly health reports by Friday.',
      'Your messages to Mars take minutes to arrive, so keep them short and clear.',
    ],
  },
  station: {
    origin: [
      'Sunrise number #num# today. We get 16 a day up here. #wow#',
      'Fixed a coolant leak in module #num#. #mood#',
      'Microgravity tip: Velcro your snacks to the wall.',
      'Watched a thunderstorm from above tonight. #wow#',
      'New crew docked this morning. Welcome aboard!',
    ],
  },
}

// Each slot's post is worked out once and reused, so the same post object comes back every time
// (that lets unchanged cards skip re-rendering). Cleared now and then so it can't grow forever.
const cache = new Map<number, ColonyPost | null>()

function cachedPostForSlot(slot: number): ColonyPost | null {
  if (!cache.has(slot)) {
    if (cache.size > 5000) cache.clear()
    cache.set(slot, colonyPostForSlot(slot))
  }
  return cache.get(slot) ?? null
}

/** The colony post for one time slot, or null if nobody posts then. */
export function colonyPostForSlot(slot: number): ColonyPost | null {
  const random = seededRandom(hash(`colony:${slot}`))
  if (random() > 0.25) return null // about one post every 12 seconds
  const world = pick(WORLDS, random)
  const colonist = findColonist(pick(POSTERS[world], random))
  if (!colonist) return null
  const grammar: Grammar = { ...SHARED, ...WORLD_WORDS[world], sol: [String(400 + (slot % 300))] }
  const text = expand('#origin#', grammar, random)
  // Sometimes attach one of the team's pictures (src/features/comms/botImages.ts).
  return { id: `colony-${slot}`, at: slot * SLOT_MS, world, colonist, text, image: botImageFor(world, random) }
}

/** Recent colony posts: at least `perWorld` for every world, so each feed tab has something. */
export function latestColonyPosts(slot: number, perWorld: number): ColonyPost[] {
  return collect(slot, cachedPostForSlot, (list) =>
    WORLDS.every((w) => list.filter((p) => p.world === w).length >= perWorld),
  )
}
