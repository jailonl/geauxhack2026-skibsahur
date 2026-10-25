// Bot personas that post into the feed to make the colony feel alive.
// Normally DeepSpace AI writes each post in the persona's voice (src/features/comms/ai.ts).
// The scripted lines below are the fallback if an AI call fails, so the feed never goes quiet.
// This file must stay free of React/browser code because the worker imports it.
import { earthMarsDistanceAU, formatDelay, lightDelaySeconds, type Body } from '../../lib/space'
import { botImageFor } from './botImages'

export type BotKind = 'system' | 'alien'

export type BotPost = {
  text: string
  authorName: string
  botKind: BotKind
  body?: Body
  lat?: number
  lng?: number
  mediaKey?: string // a picture from public/bot-images/ (see botImages.ts)
  mediaType?: string
  mediaAlt?: string
}

export type Persona = {
  name: string
  kind: BotKind
  voice: string // personality description given to the AI
  location?: { body: Body; lat: number; lng: number }
  weight: number // higher = posts more often
  lines: Array<string | ((now: number) => string)>
}

// Real coordinates: Jezero Crater (Perseverance), Gale Crater (Curiosity), Shackleton Crater (lunar south pole),
// Olympus Mons, and the Phobos-facing side of Mars.
const JEZERO = { body: 'mars' as const, lat: 18.38, lng: 77.58 }
const GALE = { body: 'mars' as const, lat: -5.4, lng: 137.8 }
const SHACKLETON = { body: 'moon' as const, lat: -89.9, lng: 0.0 }
const OLYMPUS = { body: 'mars' as const, lat: 18.65, lng: -133.8 }

const PERSONAS: Persona[] = [
  {
    name: 'HAB-OS · Jezero Base',
    voice: 'the calm, slightly dry habitat computer of a Mars base in Jezero Crater, reporting life support, water, power, and greenhouse status',
    kind: 'system',
    location: JEZERO,
    weight: 3,
    lines: [
      'Scrubber cycle complete. Cabin CO2 at 0.3%. Oxygen at 21%. Breathe easy.',
      'Water recovery holding at 98%. Yesterday\'s coffee is today\'s coffee.',
      'Reminder: a Mars sol is 24 h 39 min 35 s. Adjust your sleep schedule accordingly.',
      'Solar array output down 6% from dust buildup. Panel cleaning crew requested.',
      'Greenhouse B: lettuce harvest ready. Radishes need 4 more sols.',
      'Pressure seal check passed on all airlocks. Nice work, everyone.',
    ],
  },
  {
    name: 'ROVER-3 Pathfinder',
    voice: 'a dutiful science rover exploring Gale Crater on Mars, reporting terrain, weather, samples, and radiation',
    kind: 'system',
    location: GALE,
    weight: 2,
    lines: [
      'Dust devil tracked 2 km northeast of camp. Holding position until it passes.',
      'Surface temperature -63 °C. Battery heaters engaged.',
      'Drill sample 14 sealed. Clay minerals detected. Possible ancient lakebed.',
      'Wheel 4 reporting extra wear. Requesting a gentler route back to base.',
      'Surface radiation today about 0.7 mSv, close to what Curiosity measured here. Limit EVA time.',
    ],
  },
  {
    name: 'Deep Space Network Relay',
    voice: 'the network relay that carries messages between Earth, the Moon, and Mars, reporting signal timing and link status',
    kind: 'system',
    weight: 2,
    lines: [
      (now) =>
        `Earth ⇄ Mars one-way light time is now ${formatDelay(lightDelaySeconds('earth', 'mars', now))}. ` +
        `Distance: ${(earthMarsDistanceAU(now) * 149.6).toFixed(0)} million km.`,
      (now) =>
        `Round trip for a question to Earth and back: ${formatDelay(2 * lightDelaySeconds('earth', 'mars', now))}. Plan accordingly.`,
      'Moon relay latency: 1.3 s each way. Lunar crews, you\'re practically next door.',
      'Store-and-forward queue flushed. All delayed transmissions delivered.',
    ],
  },
  {
    name: 'Shackleton Outpost',
    voice: 'an upbeat ice-mining outpost at the lunar south pole, reporting ice extraction, dust, and crew morale',
    kind: 'system',
    location: SHACKLETON,
    weight: 1,
    lines: [
      'Ice extraction rig online in the permanently shadowed crater floor. 40 L recovered today.',
      'Earth just rose over the ridge. Crew morale +10.',
      'Regolith on everything again. Please use the dust lock.',
    ],
  },
  {
    name: '◉ UNKNOWN SIGNAL',
    voice: 'a mysterious, unexplained repeating signal near Olympus Mons; short, eerie, partly garbled, sometimes using strange symbols',
    kind: 'alien',
    location: OLYMPUS,
    weight: 2,
    lines: [
      '⟁⟟⌇ ⋔⟒⌰⌰⍜ ⟒⏃⍀⏁⊑ ⋏⟒⟟☊⊑⏚⍜⍀⌇ ⟁⟟⌇',
      'Repeating pulse detected near Olympus Mons. Interval: 47.3 s. Origin: not ours.',
      '...SIGNAL STRENGTH RISING... 1 · 1 · 2 · 3 · 5 · 8 · 13 ...',
      '▚▞▚▞ YOUR WATER IS CURIOUS ▚▞▚▞',
      'We have watched your small machines for many cycles. The one with six wheels is our favorite.',
    ],
  },
  {
    name: '✶ The Choir of Phobos',
    voice: 'a harmless, curious alien collective living inside the moon Phobos; speaks in ALL CAPS, politely confused by human habits',
    kind: 'alien',
    weight: 1,
    lines: [
      'GREETINGS, SOFT CARBON TRAVELERS. YOUR SOL IS TOO SHORT. WE SUGGEST 31 HOURS.',
      'WE HAVE READ YOUR FEED. WE DO NOT UNDERSTAND "LOL" BUT WE ENJOY IT.',
      'A QUESTION: WHY DO YOU SEAL YOURSELVES IN SMALL BOXES OF AIR? IT LOOKS UNCOMFORTABLE.',
      'THE DUST WILL RISE IN THREE SOLS. THIS IS NOT A THREAT. IT IS A WEATHER REPORT.',
    ],
  },
]

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total
  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

/** Pick a random persona, weighted so busier bots post more often. */
export function pickPersona(): Persona {
  return pickWeighted(PERSONAS)
}

/** A random scripted line from this persona. `now` is passed in so light-delay lines use the current date. */
export function scriptedLine(persona: Persona, now: number = Date.now()): string {
  const line = persona.lines[Math.floor(Math.random() * persona.lines.length)]
  return typeof line === 'function' ? line(now) : line
}

/** Turn a persona + text into a feed post (adds the persona's name, badge type, location tag, and sometimes
 * one of the team's pictures). */
export function toBotPost(persona: Persona, text: string): BotPost {
  return {
    text,
    authorName: persona.name,
    botKind: persona.kind,
    ...(persona.location ?? {}),
    ...(botImageFor(persona.location?.body) ?? {}),
  }
}

/** One scripted bot post, no AI. */
export function makeBotPost(now: number = Date.now()): BotPost {
  const persona = pickPersona()
  return toBotPost(persona, scriptedLine(persona, now))
}
