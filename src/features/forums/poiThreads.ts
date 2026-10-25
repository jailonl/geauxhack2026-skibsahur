// Forum threads about the points of interest on the map (Jailon's POIs). Each POI gets one thread in its
// world's forum, started by a bot colonist, with two replies. No AI: fill-in-the-blank text seeded by the
// POI's name, so the same POI always gets the same thread. Used by the admin "Seed the forums" button
// and by the forum-chatter cron job (which picks up new POIs). Must stay free of React/browser code.
import { hash, pick, seededRandom } from '../aliens/alienLang'
import { COLONISTS, type Colonist } from './colonists'

export type Poi = {
  name: string
  description?: string
  type: 'colony' | 'hazard' | 'resource' | 'unknown'
  body: string
  lat: number
  lng: number
  safe?: number | boolean
}

export type PoiThread = { forum: string; title: string; text: string; by: string; comments: { by: string; text: string }[] }

const WORLD_NAMES: Record<string, string> = {
  mars: 'Mars', moon: 'the Moon', earth: 'Earth', station: 'the station',
  europa: 'Europa', titan: 'Titan', ceres: 'Ceres', ganymede: 'Ganymede',
}

const TITLES: Record<Poi['type'], string> = {
  hazard: 'Hazard report',
  colony: 'Colony check-in',
  resource: 'Resource find',
  unknown: 'Unknown object',
}

const OPENERS: Record<Poi['type'], string[]> = {
  hazard: [
    'Heads up: {name} is marked as a hazard on the map. Give it a wide berth.',
    'Flagging {name} for everyone heading out this week. Not safe to cross alone.',
  ],
  colony: [
    'Checking in from {name}. Anyone else nearby? We have spare air filters to trade.',
    '{name} is up on the map now. Visitors welcome, just call ahead.',
  ],
  resource: [
    'Found something useful at {name}. Logged it on the map for the next supply run.',
    '{name} looks promising. Who wants to help haul samples back?',
  ],
  unknown: [
    'Something strange at {name}. Our sensors cannot explain it. Has anyone else seen this?',
    'Logging {name} as unknown. It moved between two of our scans.',
  ],
}

const REPLIES: Record<Poi['type'], string[]> = {
  hazard: ['Thanks for the warning. Rerouting our rover.', 'Went past it last month. Can confirm, stay clear.', 'Adding it to the safety briefing.'],
  colony: ['Waving from the next ridge over!', 'We could use those filters. Sending a message now.', 'Great to see more neighbors on the map.'],
  resource: ['Count me in for the haul.', 'Nice find. Does it need special tools?', 'This could save us a resupply launch.'],
  unknown: ['Probably sensor glare. Probably.', 'Nope. Not going near that.', 'Send coordinates to the science team.'],
}

export function poiThreadTitle(poi: Poi): string {
  return `${TITLES[poi.type] ?? 'Map note'}: ${poi.name}`
}

/** People who live in or post about this POI's world, so the thread sounds local. */
function locals(forum: string): Colonist[] {
  const fits = COLONISTS.filter((c) => c.forums.includes(forum))
  return fits.length >= 3 ? fits : [...fits, ...COLONISTS.filter((c) => !fits.includes(c))]
}

export function makePoiThread(poi: Poi): PoiThread {
  const random = seededRandom(hash(`${poi.body}:${poi.name}`))
  const people = locals(poi.body)
  const starter = pick(people, random)
  const others = people.filter((c) => c.handle !== starter.handle)
  const where = `${WORLD_NAMES[poi.body] ?? poi.body}, latitude ${poi.lat.toFixed(2)}, longitude ${poi.lng.toFixed(2)}`
  const opener = pick(OPENERS[poi.type] ?? OPENERS.unknown, random).replace('{name}', poi.name)
  const text = [opener, poi.description ? `Notes: ${poi.description}` : '', `Location: ${where}. Open the Map tab to see it.`]
    .filter(Boolean)
    .join('\n\n')

  const replies = [...(REPLIES[poi.type] ?? REPLIES.unknown)]
  const pool = [...others] // two different people reply
  const comments = [0, 1].map(() => {
    const by = pool.splice(Math.floor(random() * pool.length), 1)[0] ?? starter
    const reply = replies.splice(Math.floor(random() * replies.length), 1)[0]
    return { by: by.handle, text: reply }
  })
  return { forum: poi.body, title: poiThreadTitle(poi), text, by: starter.handle, comments }
}

type Store = {
  pois: () => Promise<Poi[]>
  threadTitles: () => Promise<string[]>
  create: (collection: 'threads' | 'comments', data: Record<string, unknown>) => Promise<string | null> // new record id
}

/** Start a thread for every POI that doesn't have one yet (up to `max`). Returns how much was added. */
export async function addPoiThreads(store: Store, forumSlugs: string[], max: number): Promise<{ threads: number; comments: number }> {
  const titles = new Set(await store.threadTitles())
  const missing = (await store.pois()).filter((p) => forumSlugs.includes(p.body) && !titles.has(poiThreadTitle(p)))
  let threads = 0
  let comments = 0
  for (const poi of missing) {
    if (threads >= max) break
    if (titles.has(poiThreadTitle(poi))) continue
    const t = makePoiThread(poi)
    const threadId = await store.create('threads', { forum: t.forum, title: t.title, text: t.text, authorName: t.by, botName: t.by })
    if (!threadId) continue
    titles.add(t.title) // two POIs with the same name and type share one thread
    threads++
    for (const c of t.comments) {
      if (await store.create('comments', { threadId, text: c.text, authorName: c.by, botName: c.by })) comments++
    }
  }
  return { threads, comments }
}
