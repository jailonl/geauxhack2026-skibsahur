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
- **Chat:** colony channels with real light-delay for interplanetary messages (calculated from where Earth and Mars are today), plus an AI operator on each channel whose reply returns after the full round trip
- **Colony bots:** habitat computers, rovers, a network relay, and alien signals post to the feed every few minutes in character, written by DeepSpace AI and clearly badged as bots
- **Vitals:** personal health and supply readings with color-coded warnings
- **Accessibility:** alt text on every photo/video, labeled form fields, keyboard-friendly controls

### Tech stack

- [DeepSpace](https://docs.deep.space/) — React + Vite frontend, real-time database, logins, file storage, and hosting (TypeScript, Tailwind)

### External tools and APIs

Rule 1 limit: 2 external APIs. DeepSpace is our backend-as-a-service and does not count toward the limit.

| API | Used for |
| --- | --- |
| DeepSpace AI (Claude Haiku via DeepSpace) | Writing colony bot posts and channel operator replies at runtime |
| _API #2 (e.g. NASA DONKI)_ | _what it's used for_ |

AI is used only for text. No AI-generated images or videos appear anywhere in the app (Rule 3). If an AI call fails, bots fall back to scripted lines in `src/features/comms/bots.ts`.

### Boilerplate

- Project scaffolding generated with `npm create deepspace@latest` ([DeepSpace docs](https://docs.deep.space/get-started/installation)). This includes the router, auth pages, navigation, UI primitives, config files, and the bundled `.agents/`, `AGENTS.md`, and `CLAUDE.md` files.

### AI-generated and AI-assisted code

No AI was used to generate any image or video assets. All images in the app are created by our team. No external code sources were given to AI to reference.


**Tool:** Claude (Anthropic), through the claude.ai chat app and Claude Code.



**Planning (no code):** brainstorming ideas for the prompt, choosing the stack, checking our plan against the rules and rubric, writing a build plan, and drafting this README.

**Code (Comms, Vilarian Breaux):**

| File | What AI did |
| --- | --- |
| `src/schemas/posts-schema.ts` | Generated the posts collection schema |
| `src/features/comms/types.ts` | Generated the Post type |
| `src/features/comms/PostComposer.tsx` | Generated starter code for the post form: guest posting, photo/video upload, location tag |
| `src/features/comms/Feed.tsx` | Generated starter code for the live feed with delete for owners and admins |
| `src/pages/(app)/feed.tsx` | Generated the feed page |
| `src/features/comms/Feed.tsx` (update) | Added planet filter, bot badges, "Show bots" toggle, admin "Summon a bot" button |
| `src/lib/space.ts` | Generated light-delay math (Earth/Mars circular-orbit approximation) and formatting helpers |
| `src/features/comms/bots.ts` | Generated bot personas and scripted fallback lines |
| `src/features/comms/ai.ts` | Generated DeepSpace AI calls for bot posts and operator replies |
| `src/features/comms/channels.ts` | Generated chat channel and AI operator definitions |
| `src/features/comms/Chat.tsx` | Generated the chat screen with light-delay countdowns and the "Ask operator" option |
| `src/pages/(app)/chat.tsx` | Generated the chat page |
| `src/schemas/transmissions-schema.ts` | Generated the chat messages schema |
| `src/schemas/posts-schema.ts` (update) | Added the bot column and locked it from users |
| `src/cron.ts` | Generated the scheduled job that posts a bot message every 10 minutes |
| `src/actions/index.ts` | Generated server actions `summonBot` (admin) and `askOperator` (AI reply) |

**Code (Vitals):** _list AI-assisted files, or write "No AI used."_

**Code (Points of interest, Jailon Living):**

| File | What AI did |
| --- | --- |
| `src/schemas/poi-schema.ts` | Converted my Java `PointOfInterest` class (my fields: name, type, lat/lon, safe, discovered) into DeepSpace's schema format. AI added the `description` and `body` fields and the permissions. |
| `src/features/map/types.ts` | Converted the same fields from my Java class into a TypeScript type |
| `src/features/map/poi-logic.ts` | Ported my Java rules (discovered check, valid types, off-map check) to TypeScript |
| `src/features/map/PoiForm.tsx` | Generated the React form from my Java `PoiForm` flow |
| `src/features/map/MapView.tsx` | Generated the clickable map that plots POIs by lat/lng |
| `src/pages/(app)/map.tsx` | Generated the map page with planet tabs, the form, and the POI list |
| `src/nav.ts` | Added the Map link |

I designed the POI data and logic in Java first (including the idea to work out "discovered" automatically from nearby POIs); AI turned it into React and TypeScript for this stack.

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

**Science behind the light-delay:** Earth and Mars positions use circular-orbit approximations from their mean longitudes at J2000 (within about 10% of the true distance). One-way delay = distance ÷ speed of light. Earth–Moon delay uses the average distance of 384,400 km.

**Facts the bots use:** Mars sol length (24 h 39 min 35 s), Curiosity's measured surface radiation (~0.67 mSv/day), ISS water recovery (~98%).

**Known limitations:** local dev keeps its own data, so use the deployed link to see shared posts; photo/video uploads need one deploy before they work locally.
