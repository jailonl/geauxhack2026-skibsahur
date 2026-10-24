# Colony Comms

A social network for people living off Earth: colonists post photos, videos, and reports from their surroundings, chat across planets with real light-delay, track their own vitals, and mark hazards and points of interest on a shared map.

## Team

- [Vilarian Breaux](https://github.com/) — Comms (feed, posts, media, chat)
- [Brandon Richard](https://github.com/) — Vitals
- [Jailon Living](https://github.com/) — Points of interest map

## About

**Team name:Skib Sahur **Prompt:** _#_

### What we built and the problem it solves

People living on the Moon, Mars, or a space station are isolated, face hazards that change daily, and can wait many minutes for a message to reach Earth. Colony Comms gives them one place to share what they see, warn each other about hazards, and keep an eye on their own health and supplies.

**Goals**

- [ ] Colonists can post text, photos, and videos that everyone sees live
- [ ] Posts can be tagged with a location (body, latitude, longitude) and appear on the shared map
- [ ] Users can mark points of interest and hazards on the map with a description
- [ ] Users can see their own vitals, with warnings at real safety limits
- [ ] Chat between colonies shows realistic light-delay for messages sent to other planets

### Features

- **Feed:** posts with photos/videos and optional location tags, updated in real time
- **Map:** points of interest and hazards marked by coordinates (colony, hazard, resource, unknown moving object)
- **Chat:** colony channels with light-delay for interplanetary messages
- **Vitals:** personal health and supply readings with color-coded warnings
- **Accessibility:** alt text on every photo/video, labeled form fields, keyboard-friendly controls

### Tech stack

- [DeepSpace](https://docs.deep.space/) — React + Vite frontend, real-time database, logins, file storage, and hosting (TypeScript, Tailwind)

### External tools and APIs

Rule 1 limit: 2 external APIs. DeepSpace is our backend-as-a-service and does not count toward the limit.

| API | Used for |
| --- | --- |
| _API #1 (e.g. NASA DONKI)_ | _what it's used for_ |
| _API #2_ | _what it's used for_ |

We do not use DeepSpace's built-in AI chat.

### Boilerplate

- Project scaffolding generated with `npm create deepspace@latest` ([DeepSpace docs](https://docs.deep.space/get-started/installation)). This includes the router, auth pages, navigation, UI primitives, config files, and the bundled `.agents/`, `AGENTS.md`, and `CLAUDE.md` files.

### AI-generated and AI-assisted code

No AI was used to generate any image or video assets. All images in the app are created by our team. No external code sources were given to AI to reference.


**Tool:** Claude (Anthropic), through the claude.ai chat app



**Planning (no code):** brainstorming ideas for the prompt, choosing the stack, checking our plan against the rules and rubric, writing a build plan, and drafting this README.

**Code (Comms, Vilarian Breaux):**

| File | What AI did |
| --- | --- |
| `src/schemas/posts-schema.ts` | Generated the posts collection schema |
| `src/features/comms/types.ts` | Generated the Post type |
| `src/features/comms/PostComposer.tsx` | Generated starter code for the post form: guest posting, photo/video upload, location tag |
| `src/features/comms/Feed.tsx` | Generated starter code for the live feed with delete for owners and admins |
| `src/pages/(app)/feed.tsx` | Generated the feed page |

**Code (Vitals):** _list AI-assisted files, or write "No AI used."_

**Code (Points of interest, Jailon Living):**

| File | What AI did |
| --- | --- |
| `src/schemas/poi-schema.ts` | Generated starter code for the points of interest collection schema, based on my Java `PointOfInterest` class |

Every team member has read and can explain all AI-assisted code. Changes made after the starter code are our own unless listed above.

## Prerequisites

- [Node.js](https://nodejs.org/) 22.15 or newer on the 22 line, or Node.js 24 or 26
- npm
- A GitHub or Google account (to sign in to DeepSpace)

## Build from source

```bash
git clone https://github.com/jailonl/geauxhack2026-skibsahur.git
cd geauxhack2026-skibsahur
npm install
npx deepspace dev start
```

Open the local link it prints and go to **Feed**. Guests can post text; sign in to attach photos or videos.

Photo and video uploads only work after the app has been deployed once (`npx deepspace deploy`), because local uploads need a token that the first deploy creates.

## Extras

_Data sources, credits for anything else used, and known limitations._
