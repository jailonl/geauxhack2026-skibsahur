// The alien species. Each one lives on a real world, has its own sounds (for its language), its own
// names, and its own words for the sentence generator (weather, dishes, places, sports, teams).
// Light delay to Earth uses the real orbital math in src/lib/space.ts.
import { PROXIMA_SECONDS, earthToOuterPlanetSeconds, lightDelaySeconds } from '../../lib/space'
import type { Phonology } from './alienLang'
import type { Grammar } from './generator'

export type Species = {
  id: string
  name: string // what humans call them
  world: string // where they live
  feedTab?: 'mars' // aliens on Mars also show under the feed's Mars tab
  color: string
  sounds: Phonology
  places: string[] // where individual aliens say they're from
  delayToEarth: (atMs: number) => number // seconds for their signal to reach Earth
  words: Grammar // this species' own words; merged over the shared ones in generator.ts
}

export const SPECIES: Species[] = [
  {
    id: 'rhul',
    name: 'Rhul',
    world: 'Mars',
    feedTab: 'mars',
    color: '#e4572e',
    sounds: {
      onsets: ['k', 'kr', 'r', 'rh', 'g', 'gr', 'd', 'z', 'zh', 'v', 'th'],
      vowels: ['a', 'u', 'o', 'aa', 'uu', 'ou'],
      codas: ['k', 'rr', 'sh', 'g', 'z', 'th'],
    },
    places: ['the Tharsis lava tubes', 'Olympus Deep', 'the Hellas caves', 'the Jezero tunnels'],
    delayToEarth: (at) => lightDelaySeconds('mars', 'earth', at),
    words: {
      weather: [
        'Dust storm overhead again. Down in the tubes it is warm and quiet.',
        'The surface dropped to minus #num0# tonight. Good night to stay underground.',
        'Felt a marsquake at #time#. My shelf of shiny rocks fell over.',
      ],
      dish: ['roasted iron moss', 'cave lichen stew', 'salty perchlorate crisps'],
      sport: ['tube racing', 'crater rolling'],
      team: ['Hellas Diggers', 'Tharsis Rumblers', 'Valles Drifters'],
    },
  },
  {
    id: 'vellii',
    name: 'Vellii',
    world: 'Europa',
    color: '#7dd3fc',
    sounds: {
      onsets: ['l', 'v', 'm', 'n', 'w', 's', 'y', 'h', 'sh'],
      vowels: ['ee', 'ii', 'oo', 'ae', 'ei', 'ui', 'a'],
      codas: ['l', 'n', 'sh', 'm', 'h'],
    },
    places: ['the warm vents', 'the deep current', 'the cracked ice shelf', 'the glowing reef'],
    delayToEarth: (at) => earthToOuterPlanetSeconds('jupiter', at),
    words: {
      weather: [
        'The ice ceiling groaned all cycle. Tide season is here.',
        'Jupiter pulled the ocean extra hard today. Everyone is dizzy.',
        'A new crack opened in the ice above #place#. So bright!',
      ],
      dish: ['vent shrimp', 'glow kelp', 'warm mineral soup'],
      sport: ['current surfing', 'bubble chasing'],
      team: ['Vent Swimmers', 'Deep Glowers', 'Ice Tappers'],
    },
  },
  {
    id: 'ossk',
    name: 'Ossk',
    world: 'Titan',
    color: '#f59e0b',
    sounds: {
      onsets: ['s', 'sk', 't', 'th', 'n', 'ss', 'x', 'k'],
      vowels: ['o', 'e', 'oe', 'y', 'u'],
      codas: ['sk', 'ss', 'th', 'n', 'x'],
    },
    places: ['the Kraken Sea', 'Ligeia shore', 'the orange dunes', 'the methane marsh'],
    delayToEarth: (at) => earthToOuterPlanetSeconds('saturn', at),
    words: {
      weather: [
        'Methane drizzle all cycle. Perfect lake weather.',
        'The orange haze is thick today. Cannot see my own fins.',
        'Minus 179 and sunny. A beautiful day on #place#.',
      ],
      dish: ['frozen hydrocarbon jerky', 'ethane noodles', 'dune grit cakes'],
      sport: ['lake skimming', 'haze gliding'],
      team: ['Kraken Paddlers', 'Dune Crawlers', 'Haze Hoppers'],
    },
  },
  {
    id: 'pyrrax',
    name: 'Pyrrax',
    world: 'Io',
    color: '#facc15',
    sounds: {
      onsets: ['p', 'b', 'f', 'ph', 'tz', 'br', 'pr'],
      vowels: ['a', 'i', 'y', 'ai', 'e'],
      codas: ['x', 'tz', 'f', 'p', 'r'],
    },
    places: ['Loki Patera', 'the sulfur plains', 'the Pele vent', 'the lava lake'],
    delayToEarth: (at) => earthToOuterPlanetSeconds('jupiter', at),
    words: {
      weather: [
        'Volcano erupted at #time#. Great for warming my feet.',
        'Sulfur snow again. My shell is yellow now.',
        '#num# volcanoes going at once today. Very cozy.',
      ],
      dish: ['hot sulfur crumbs', 'lava-baked rock buns', 'spicy ash'],
      sport: ['lava hopping', 'plume diving'],
      team: ['Loki Burners', 'Pele Sparks', 'Ash Rollers'],
    },
  },
  {
    id: 'glim',
    name: 'Glim',
    world: 'Enceladus',
    color: '#c4b5fd',
    sounds: {
      onsets: ['gl', 'bl', 'pl', 'fl', 'm', 'b', 'p'],
      vowels: ['i', 'ee', 'u', 'oo', 'ip'],
      codas: ['m', 'b', 'p', 'mp', 'b'],
    },
    places: ['the tiger stripes', 'the south geysers', 'the ice plume', 'the snowfields'],
    delayToEarth: (at) => earthToOuterPlanetSeconds('saturn', at),
    words: {
      weather: [
        'A geyser launched #num# of us into space again. Wheee.',
        'Fresh snow from the plume today. Everything is sparkly.',
        'Saturn looks huge tonight. I waved at the rings.',
      ],
      dish: ['snowflake soup', 'frozen salt drops', 'plume sprinkles'],
      sport: ['geyser riding', 'snow sliding'],
      team: ['Stripe Sliders', 'Plume Poppers', 'Snow Bouncers'],
    },
  },
  {
    id: 'qthari',
    name: "Q'thari",
    world: 'Proxima b',
    color: '#f472b6',
    sounds: {
      onsets: ["q'", "t'", 'x', 'ch', "k'", 'th', 'r'],
      vowels: ['ah', 'eh', 'ih', 'a', 'o'],
      codas: ["'", 'n', 'r', 'ch'],
    },
    places: ['the twilight ring', 'the shade caves', 'the red dawn line', 'the night side'],
    delayToEarth: () => PROXIMA_SECONDS,
    words: {
      weather: [
        'Flare day. Everyone stay in the shade caves.',
        'Our red sun never sets here. #mood#',
        'Wind from the night side is freezing today.',
      ],
      dish: ['red-light berries', 'shade moss', 'flare-toasted seeds'],
      sport: ['dawn racing', 'shadow tag'],
      team: ['Twilight Runners', 'Shade Keepers', 'Dawn Chasers'],
    },
  },
]

export function findSpecies(id: string): Species | undefined {
  return SPECIES.find((s) => s.id === id)
}
