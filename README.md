# Colony Comms

A social network for people living off Earth: colonists post photos, videos, and reports from their surroundings, reply to and quote each other, message across planets with real light-delay, discuss on per-planet forums, track their own vitals, and mark hazards and points of interest on a shared map.

## Team

- [Vilarian Breaux](https://github.com/) — Comms (feed, profiles, messages, forums, AI bots)
- [Brandon Richard](https://github.com/) — Vitals
- [Jailon Living](https://github.com/) — Points of interest map

## About

**Team name:** Skib Sahur · **Prompt:** _#_

### What we built and the problem it solves

People living on the Moon, Mars, or a space station are isolated, face hazards that change daily, and can wait many minutes for a message to reach Earth. Colony Comms gives them one place to share what they see, warn each other about hazards, and keep an eye on their own health and supplies.

**Goals**

- [ ] Colonists can post text, photos, and videos that everyone sees live
- [ ] Posts can be tagged with a location (body, latitude, longitude) and appear on the shared map
- [ ] Users can mark points of interest and hazards on the map with a description
- [ ] Users can see their own vitals, with warnings at real safety limits
- [ ] Direct messages between colonists show realistic light-delay based on each person's home planet
- [ ] Colonists have profiles and can reply to, quote, like, and repost each other's posts
- [ ] Each location has its own forum for longer discussions

### Features

- **Home feed:** posts with photos/videos and optional location tags, updated in real time. Reply, quote, like, and repost; reposts appear in the timeline. Anyone can read; posting needs an account.
- **Profiles:** unique @username, profile picture, bio, home planet, and accent color. Public profile pages list posts and replies, with a Message button.
- **Messages:** private DMs by @username. Messages travel at light speed between the sender's and recipient's home planets, with a live countdown. AI operators (@hab-os on Mars, @shackleton-ops on the Moon, @capcom on Earth, @station-ai in orbit) answer every DM in character and remember the conversation.
- **Forums:** 16 Reddit-style boards in three groups: home worlds (p/Mars, p/Moon, p/Earth, p/Orbit), fictional outer colonies (Europa, Titan, Ceres, Ganymede, the Kuiper Belt, Proxima b), and lounges (p/Random, p/AskAColonist, p/SpaceKitchen, and more). Threads, comments, replies, up/down votes, Top/New sorting, and trending threads.
- **Signal times:** a live panel showing how long a message from your home world takes to reach every colony right now, from 1.3 seconds (the Moon) to 4.2 years (Proxima b).
- **Settings:** theme (Night side / Day side), text size, high contrast, reduce motion, compact posts, bandwidth saver (photos load on tap), bot visibility, read-aloud buttons, and default message speed.
- **Map:** points of interest and hazards marked by coordinates (colony, hazard, resource, unknown moving object)
- **Colony bots:** habitat computers, rovers, a network relay, and alien signals post to the feed every 10 minutes in character and sometimes reply to people's posts, written by DeepSpace AI and clearly badged as bots
- **Living forums:** twelve bot colonists (a Europa ice diver, a Titan dock worker, a Ceres welder, and more) start threads and comment in the forums every 20 minutes, always badged as bots. Admins can fill every board with starter conversations instantly (fixed text, no AI credits).
- **Transmission cards:** every post shows which world it came from and how long its signal took to reach you.
- **Colony pulse:** a live log of the latest posts, replies, threads, and comments across every world.
- **Notifications:** a bell with an unread count for likes, reposts, quotes, replies, direct messages, and forum replies.
- **Search:** colonists, posts, forums, and threads.
- **Vitals:** personal health and supply readings with color-coded warnings
- **Accessibility:** a "Readable font" setting (Atkinson Hyperlegible, designed for low-vision readers), adjustable text size, high-contrast mode, reduce-motion, read-aloud for posts and messages (browser speech, no API), alt text on every photo/video, labeled form fields, visible keyboard focus

### Tech stack

- [DeepSpace](https://docs.deep.space/) — React + Vite frontend, real-time database, logins, file storage, and hosting (TypeScript, Tailwind)

### External tools and APIs

Rule 1 limit: 2 external APIs. DeepSpace is our backend-as-a-service and does not count toward the limit.

| API | Used for |
| --- | --- |
| DeepSpace AI (Claude Haiku via DeepSpace) | Writing colony bot posts and AI operator DM replies at runtime |
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
| `src/features/comms/ai.ts` | Generated DeepSpace AI calls for bot posts and operator replies (with recent conversation context) |
| `src/schemas/posts-schema.ts` (update) | Added the bot column, reply/quote links, and account-only posting |
| `src/cron.ts` | Generated scheduled jobs: a bot post every 10 minutes (live app only), and AI operator replies to arrived DMs every minute (max 3 per minute, using the last 8 messages as context) |
| `src/actions/index.ts` | Generated the admin server action `summonBot` |
| `src/features/comms/PostCard.tsx`, `feedData.ts` | Generated the post card (reply, repost, quote, like, delete) and the shared feed data/counts |
| `src/features/comms/PostComposer.tsx` (update) | Reworked for accounts, replies, and quote posts |
| `src/pages/(app)/home.tsx`, `post/[id].tsx` | Generated the home feed page and the post-with-replies page |
| `src/features/social/*` | Generated profiles (hooks, editor, avatar), GitHub/Google sign-in dialog, and AI operator definitions |
| `src/pages/(app)/profile.tsx`, `u/[username].tsx` | Generated the edit-profile and public profile pages |
| `src/features/messages/Messages.tsx`, `src/pages/(app)/messages.tsx` | Generated direct messages with light-delay and AI operator contacts |
| `src/features/forums/*`, `src/pages/(app)/forums/*`, `src/pages/(app)/thread/[id].tsx` | Generated the planet forums: boards, threads, comments, votes |
| `src/schemas/profiles-schema.ts`, `dms-schema.ts`, `social-schemas.ts` | Generated schemas for profiles, private DMs, likes/reposts, threads, comments, and votes |
| `src/components/Navigation.tsx` | Generated the left nav rail, phone tab bar, floating Post button, and account menu |
| `src/pages/index.tsx` (update) | Landing page opens the feed |
| `src/themes.css`, `src/themes.ts`, `index.html` (updates) | Generated the Night side / Day side themes, fonts, high-contrast and reduce-motion styles |
| `src/features/settings/settings.ts`, `src/pages/(app)/preferences.tsx` | Generated the settings store and Settings page |
| `src/features/home/SignalTimes.tsx`, `src/pages/(app)/home.tsx` (update) | Generated the Signal times panel and the home side column |
| `src/features/comms/ComposeDialog.tsx` | Generated the pop-up post composer |
| `src/lib/space.ts` (update) | Added Jupiter/Saturn light delays and planet colors |
| `src/features/notifications/notifications.ts`, `src/pages/(app)/notifications.tsx` | Generated notifications (derived from existing data) and the Notifications page |
| `src/pages/(app)/search.tsx` | Generated the search page |
| `src/features/social/SocialProvider.tsx` (update) | Shares profiles, posts, reactions, DMs, and forum activity app-wide (one subscription each) |
| `src/features/home/ColonyPulse.tsx` | Generated the live activity column |
| `src/features/forums/colonists.ts`, `seed.ts`, `ForumAuthor.tsx` | Generated the bot colonist cast, starter forum conversations, and bot-aware author labels |
| `src/features/comms/PostCard.tsx`, `Feed.tsx`, `src/components/Navigation.tsx` (redesign) | Generated the transmission-card design, world filter, and top navigation bar |
| `src/features/comms/ai.ts`, `src/cron.ts`, `src/actions/index.ts` (updates) | Added AI bot replies, forum chatter, and the admin `seedForums` action |

**Code (Vitals):** _list AI-assisted files, or write "No AI used."_

**Code (Points of interest, Jailon Living):**

| File | What AI did |
| --- | --- |
| `src/schemas/poi-schema.ts` | Converted my Java `PointOfInterest` class (my fields: name, type, lat/lon, safe, discovered) into DeepSpace's schema format. AI added the `description` and `body` fields and the permissions. |
| `src/features/map/types.ts` | Converted the same fields from my Java class into a TypeScript type |
| `src/features/map/poi-logic.ts` | Ported my Java rules (discovered check, valid types, off-map check) to TypeScript |
| `src/features/map/PoiForm.tsx` | Generated the React form from my Java `PoiForm` flow |
| `src/features/map/MapView.tsx` | Generated the clickable map that plots POIs by lat/lng |
| `src/pages/(app)/map.tsx` | Generated the map page with planet tabs, the form, the POI list, and remove for owners and admins |
| `src/features/map/types.ts`, `poi-logic.ts`, `PoiForm.tsx`, `map.tsx`, `src/schemas/poi-schema.ts` (update) | Added Europa, Titan, Ceres, and Ganymede as map tabs (map-only list), with tab icons and colors taken from the forums |
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

Open the local link it prints; it opens the feed. Guests can read everything; sign in to post, reply, message, or vote.

Sign in with GitHub or Google; the first sign-in creates your account, then you pick a @username.

Photo and video uploads only work after the app has been deployed once (`npx deepspace deploy`), because local uploads need a token that the first deploy creates.

## Extras

**Science behind the light-delay:** Earth and Mars positions use circular-orbit approximations from their mean longitudes at J2000 (within about 10% of the true distance). One-way delay = distance ÷ speed of light. Earth–Moon delay uses the average distance of 384,400 km.

**Facts the bots use:** Mars sol length (24 h 39 min 35 s), Curiosity's measured surface radiation (~0.67 mSv/day), ISS water recovery (~98%).

**Known limitations:** local dev keeps its own data, so use the deployed link to see shared posts; photo/video uploads need one deploy before they work locally.
