# Stellar

Off Earth, staying alive depends on staying in touch. Stellar is a communication app for colonists on the Moon, Mars, orbital stations, and the outer colonies: warn each other about hazards on a shared map, reach mission operators for help, share vitals checked against real safety limits, and talk in planet forums, with every message timed to the real speed of light from where the planets are today. It also shows whether humans can survive at each place.

## Team

[Vilarian Breaux](https://github.com/commonvtake), [Jailon Living](https://github.com/jailonl), [Brandon Richard](https://github.com/bjrichard05)

Vilarian: comms (feed, profiles, messages, forums, bots, signal map). Jailon: points of interest map. Brandon: vitals.

## About

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=Cloudflare&logoColor=white)
![DeepSpace](https://img.shields.io/badge/DeepSpace-10132B?style=for-the-badge&logoColor=white)

**Team name:** Skib Sahur · **Prompt:** _#_

### What we built and the problem it solves

People living on the Moon, Mars, or a space station are isolated, face hazards that change daily, and can wait many minutes for a message to reach Earth. Stellar gives them one place to share what they see, warn each other about hazards, watch their own health and supplies, and keep in touch across the solar system, with every delay worked out from real orbital positions so they always know how long a reply will take.

**Goals**

- [x] Colonists can post text, photos, and videos that everyone sees live
- [x] Posts can be tagged with a location (body, latitude, longitude) and opened on the shared map
- [x] Users can mark points of interest and hazards on the map with a description
- [x] Users can see their own vitals, with warnings at real safety limits
- [x] Direct messages between colonists show realistic light-delay based on each person's home world
- [x] Colonists have profiles and can reply to, quote, like, and repost each other's posts
- [x] Each location has its own forum for longer discussions

### Tech stack

[DeepSpace](https://docs.deep.space/): React + Vite frontend, real-time database, logins, file storage, scheduled jobs, and hosting on Cloudflare Workers (TypeScript, Tailwind CSS).

### Features

- **Can humans live there?:** gravity, temperature, air, radiation, water, and the biggest danger for all 13 places, with a verdict (only Earth is livable outdoors; Io is not survivable; Europa's surface is deadly from radiation). Shown for the destination on the Signal map and as a list on the welcome page. Data in `src/lib/habitability.ts`.
- **Welcome page:** a "Press Enter: Stellar" title screen (enter Stellar: interstellar) over a twinkling pixel starfield (tiny squares placed by code, no image). Press Enter anywhere, or the button, to go in. Below it, the page explains why communication keeps colonists alive, shows how far help is right now (signal map) and whether humans can survive each place, previews the alien chatter, and offers GitHub/Google sign-in or a look around without an account.
- **Home feed:** posts with photos/videos and optional location tags, updated in real time. Reply, quote, like, and repost; reposts appear in the timeline. Anyone can read; posting needs an account.
- **Signal map:** pick any two of 13 places (Earth, Moon, the station, Mars, Ceres, Europa, Ganymede, Io, Titan, Enceladus, a Kuiper Belt freighter, Proxima b, Alpha Centauri B) and see the light delay between them right now, when a message sent now arrives, and how soon a reply could come back, on a solar-system map drawn from the same orbit math. On the welcome page and at /signals.
- **Live anywhere:** profiles can choose any of those 13 places as home, and every light delay (posts, messages, profiles) uses the real distance between them.
- **Photos:** posts and replies show a preview of the attached photo or video before sending, and a post can be just a photo.
- **Bot pictures:** bots (feed posts, replies, colony chatter, and AI operators in messages) sometimes attach a picture from `public/bot-images/`. These are the team's own pictures, listed in `src/features/comms/botImages.ts`; nothing is AI-generated.
- **Prompt-injection protection:** everything users write is fenced off as untrusted text before an AI sees it, every AI prompt carries security rules, user text is length-limited, and every AI answer is checked (no links, code, HTML, emails, or talk about its instructions) before it is posted; anything that fails falls back to a safe scripted line. See `src/features/comms/aiSafety.ts`.
- **World tabs and sort:** each tab (Mars, Moon, Earth, Orbit) shows posts from that world, by location tag or else where the author lives. Sort by newest, most liked, or most replies. Only 30 posts are drawn at a time ("Show more" adds 30), so the feed stays smooth on slow phones.
- **Colony chatter:** the bot colonists on each world post everyday life updates (greenhouse harvests, Earthrise, launch windows) about every 12 seconds, so every tab always has something to read. Our own fill-in-the-blank generator, no AI and nothing saved; always badged "Bot".
- **Forum threads from the map:** every point of interest on the map gets a forum thread in its world's board (hazard reports, colony check-ins, resource finds, unknown objects), started by a bot colonist with two replies. New POIs get a thread within 20 minutes; admins can also add them right away with "Seed the forums".
- **Guest view:** visitors who are not signed in see everything but the account controls: no "Show bots" switch, no notifications, no admin tools. Forums with no threads yet are hidden.
- **Feed refresh:** new posts flow in live while you are at the top of the feed. If you have scrolled down to read, they wait (so nothing jumps under you) and a "new transmissions" button and the Refresh button show how many are waiting.
- **Alien chatter:** six alien species on real worlds (Mars, Europa, Titan, Io, Enceladus, Proxima b) post in their own languages about every 10 seconds (Lively, Calm, or Off in Settings), with a Translate button. Written by our own generator, with no AI service (see "How the aliens work" under Extras). Every viewer sees the same aliens at the same moment, and nothing is saved to the database.
- **Pixel look:** pixel fonts, chunky pixel frames, and buttons that press down, made entirely with CSS and fonts (no images). The logo is the word "Stellar" in a pixel font.
- **Moodle-style layout:** a left navigation drawer, breadcrumbs (Stellar > Forums > p/Mars > thread), and info blocks down the right side (signal times, colonists). On phones these become a bottom tab bar and blocks below the page.
- **Profiles:** unique @username, profile picture, bio, home world (any of 13 places), and accent color. Public profile pages list posts and replies, with a Message button.
- **Messages:** private DMs by @username. Messages travel at light speed between the sender's and recipient's home planets, with a live countdown. AI operators (@hab-os on Mars, @shackleton-ops on the Moon, @capcom on Earth, @station-ai in orbit) answer every DM in character and remember the conversation.
- **Forums:** 16 boards laid out like a Moodle course: collapsible sections, a discussion table per board (Started by, Replies, Score, Last post), and replies in their own "Re:" boxes, indented under the post they answer. Boards come in three groups: home worlds (p/Mars, p/Moon, p/Earth, p/Orbit), fictional outer colonies (Europa, Titan, Ceres, Ganymede, the Kuiper Belt, Proxima b), and lounges (p/Random, p/AskAColonist, p/SpaceKitchen, and more). Threads, comments, nested replies, up/down votes, sorting by latest activity, top, or newest, and trending threads.
- **Signal times:** a live panel showing how long a message from your home world takes to reach every colony right now, from 1.3 seconds (the Moon) to 4.2 years (Proxima b).
- **Settings:** theme (Night side / Day side), text size, high contrast, reduce motion, compact posts, bandwidth saver (photos load on tap), bot visibility, alien chatter (lively, calm, off), read-aloud buttons, and default message speed.
- **Map:** points of interest and hazards marked by coordinates (colony, hazard, resource, unknown moving object)
- **Colony bots:** habitat computers, rovers, a network relay, and alien signals post to the feed every 10 minutes in character and sometimes reply to people's posts, written by DeepSpace AI and clearly badged as bots
- **Living forums:** twelve bot colonists (a Europa ice diver, a Titan dock worker, a Ceres welder, and more) start threads and comment in the forums every 20 minutes, always badged as bots. Admins can fill every board with starter conversations instantly (fixed text, no AI credits).
- **Transmission cards:** every post shows which world it came from and how long its signal took to reach you.
- **Notifications:** a bell with an unread count for likes, reposts, quotes, replies, direct messages, and forum replies.
- **Search:** colonists, posts, forums, and threads.
- **Vitals:** a private page (only you can read your readings). Who you are depends on where you live: on Earth, the Moon, and the station you're human and get real medical limits; on every other world you're that world's alien (the Rhul on Mars, the Ossk on Titan, the Pyrrax on Io, and seven more) with its own limits, so a heart rate of 400 is deadly for a human but normal for a Pyrrax. You log heart rate, blood oxygen (or your species' blood gas), pressure, and temperature; radiation and oxygen/water/food are the colony's own live numbers, the same for everyone on that world, with occasional solar storms, recycler faults, and cargo that arrives on each world's real launch-window schedule. Radiation and supply limits change from world to world too (100 days of food is plenty on the Moon and an emergency on Mars). Every reading gets an 8-bit heart (full = good, half = warning, empty and blinking = danger) and a **survival rating**, your chance of survival as a percentage, with a "More info" button for the full breakdown. "Log a reading", "Recent readings", and "Safety limits" open from buttons. Any reading can be **shared** by direct message (with the same light-delay as any DM), and a **Private / Public** setting (on the Vitals page and in Settings) decides whether your latest reading shows on your profile.
- **Accessibility:** a "Readable font" setting (Atkinson Hyperlegible, designed for low-vision readers), adjustable text size, high-contrast mode, reduce-motion, read-aloud for posts and messages (browser speech, no API), alt text on every photo/video, labeled form fields, visible keyboard focus

### External tools and APIs

Rule 1 limit: 2 external APIs. DeepSpace is our backend-as-a-service and does not count toward the limit.

| API | Used for |
| --- | --- |
| DeepSpace AI (Claude Haiku via DeepSpace) | Writing colony bot posts and AI operator DM replies at runtime |
| NASA Solar System Treks (map tiles) | Real terrain behind the POI map for the Moon, Mars, Europa, Titan, Ceres, and Ganymede |

AI is used only for text. No AI-generated images or videos appear anywhere in the app (Rule 3). The alien posts do not use AI at all; they come from our own generator in `src/features/aliens/`. If an AI call fails, bots fall back to scripted lines in `src/features/comms/bots.ts`.

### Boilerplate

- Project scaffolding generated with `npm create deepspace@latest` ([DeepSpace docs](https://docs.deep.space/get-started/installation)). This includes the router, auth pages, navigation, UI primitives, config files, and the bundled `.agents/`, `AGENTS.md`, and `CLAUDE.md` files.

### AI-generated and AI-assisted code

No AI was used to generate any image or video assets. The app contains no image files or drawn logos: the look comes from CSS and free pixel fonts, and the logo is plain text. The only drawn shape is the Vitals 8-bit heart, a 9×8 grid of square pixels written out in code (`src/features/vitals/PixelHeart.tsx`), not an image file. The only pictures are the planet terrain on the POI map, which is real NASA spacecraft imagery (credited under Extras), and photos users upload. No external code sources were given to AI to reference.

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
| `src/features/home/ColonyPulse.tsx` | Generated the live activity column (later removed to reduce clutter) |
| `src/features/forums/colonists.ts`, `seed.ts`, `ForumAuthor.tsx` | Generated the bot colonist cast, starter forum conversations, and bot-aware author labels |
| `src/features/comms/PostCard.tsx`, `Feed.tsx`, `src/components/Navigation.tsx` (redesign) | Generated the transmission-card design, world filter, and top navigation bar |
| `src/features/comms/ai.ts`, `src/cron.ts`, `src/actions/index.ts` (updates) | Added AI bot replies, forum chatter, and the admin `seedForums` action |
| `src/themes.css`, `index.html` (pixel redesign) | Generated the pixel styles: pixel fonts, frames with notched corners made from four hard shadows, pressable buttons |
| `src/components/AppShell.tsx`, `Block.tsx` | Generated the Moodle-style layout: navigation drawer, breadcrumbs, and side blocks |
| `src/features/home/SignalTimes.tsx`, `ColonyPulse.tsx`, `src/pages/(app)/home.tsx` (updates) | Moved the side panels into Moodle-style blocks |
| `src/pages/(app)/forums/index.tsx`, `forums/[body].tsx`, `thread/[id].tsx`, `src/features/forums/VoteButtons.tsx` (Moodle redesign) | Generated collapsible forum sections, the discussion table, and "Re:" reply boxes with nested replies |
| `src/features/aliens/*` | Generated the alien species, the word-hashing alien languages, the fill-in-the-blank sentence generator, the time-slot stream, and the alien post card |
| `src/features/comms/Feed.tsx`, `PostCard.tsx` (updates) | Added alien posts, the refresh button and waiting-posts button, and skipped re-rendering unchanged cards |
| `src/features/settings/settings.ts`, `src/pages/(app)/preferences.tsx` (updates) | Added the alien chatter setting |
| `src/pages/index.tsx`, `src/seo.ts`, `src/features/home/Starfield.tsx` (landing page) | Generated the welcome page: sign-in, live signal times, alien chatter preview, feature tiles, and how to join |
| `src/features/chatter/*` | Generated the shared 3-second slot clock, the colony chatter generator, and its post card |
| `src/features/aliens/latest.ts` (replaces `useAlienStream.ts`) | Reworked the alien stream onto the shared clock |
| `src/features/forums/poiThreads.ts`, `src/actions/index.ts`, `src/cron.ts` (updates) | Generated forum threads for map POIs, added to "Seed the forums" and the forum-chatter job |
| `src/features/comms/Feed.tsx`, `feedData.ts` (updates) | World tabs by origin, sort menu, colony chatter, guest-only controls, and 30-at-a-time paging |
| `src/components/AppShell.tsx`, `forums/index.tsx`, `forums/[body].tsx`, `SocialProvider.tsx` (updates) | Removed the Colony pulse block, hid empty forums and guest-only links, and shared forum data instead of separate large downloads |
| `src/pages/(app)/_layout.tsx`, `Navigation.tsx`, `SignIn.tsx`, `ComposeDialog.tsx`, `index.tsx` (performance) | Phone-safe screen height, removed blur effects that slow down weak devices, smaller title on small screens |
| `src/lib/space.ts` (update) | Generated positions for 13 places (planet orbits, moons, the station, two nearby stars) and any-to-any light delay |
| `src/features/signals/SignalMap.tsx`, `src/pages/(app)/signals.tsx` | Generated the signal map (place pickers, delay readout, drawn solar-system map) |
| `src/features/comms/aiSafety.ts`, `src/features/comms/ai.ts` (update) | Generated the prompt-injection defenses and applied them to every AI call |
| `src/features/comms/botImages.ts`, `bots.ts`, `src/cron.ts`, `src/schemas/dms-schema.ts`, `Messages.tsx`, `src/features/chatter/*` (updates) | Let bots and AI operators attach the team's own pictures |
| `src/features/comms/PostComposer.tsx`, `PostCard.tsx` (updates) | Photo preview before posting, photo-only posts, clearer upload errors, bot pictures |
| `src/schemas/profiles-schema.ts`, `src/features/social/ProfileEditor.tsx`, `profiles.ts` (updates) | All 13 places as home worlds |
| `src/lib/habitability.ts`, `src/features/signals/Habitability.tsx`, `SignalMap.tsx`, `src/pages/index.tsx` (survival focus) | Generated the habitability data and cards, and reworked the welcome page around communication for survival |
| `src/pages/index.tsx`, `Feed.tsx`, `src/themes.css` (readability) | Solid panels behind text over the starfield and in the feed header, brighter secondary text |

**Code (Vitals, Brandon Richard):**

| File | What AI did |
| --- | --- |
| `src/schemas/vitals-schema.ts` | Generated the private vitals collection schema (owner-only reads, admins included) |
| `src/features/vitals/types.ts` | Generated the Vitals reading type |
| `src/features/vitals/limits.ts` | Generated the safety limits, the good/warning/danger checks for humans and aliens, form validation, the per-world limits table, and the survival rating |
| `src/features/vitals/colony.ts` | Generated each world's live radiation and supplies (seeded by date, so everyone sees the same numbers), solar storms and faults, real flight times and launch windows, per-world limits, and mission dose |
| `src/features/vitals/aliens.ts` | Generated the alien limits for the ten non-human worlds (six match the alien chatter species, four are new) |
| `src/features/vitals/SurvivalRating.tsx` | Generated the survival rating bar and its "More info" breakdown |
| `src/features/vitals/simulate.ts` | Generated the "Read sensors" demo reading for humans and each world's alien |
| `src/features/vitals/limits.test.ts` | Generated unit tests for human and alien limits, colony numbers, per-world limits, the survival rating, validation, and the simulator |
| `src/features/vitals/VitalCard.tsx` | Generated the vital card with level heart, reason, trend line, and time |
| `src/features/vitals/PixelHeart.tsx`, `src/themes.css` (heart blink) | Generated the 8-bit heart (full, half, empty) from a 9×8 pixel grid, and its danger blink |
| `src/features/vitals/VitalsForm.tsx` | Generated the "Log a reading" form |
| `src/pages/(app)/(protected)/vitals.tsx` | Generated the Vitals page: status banner, cards, and the form, history, and safety-limits panels that open from buttons |
| `src/features/vitals/ReadingResult.tsx` | Generated the pop-up that shows a saved reading's results |
| `src/schemas/vitals-public-schema.ts` | Generated the public vitals collection: one row per colonist who chose Public, deleted when they go back to Private |
| `src/features/vitals/sharing.ts`, `sharing.test.ts` | Generated the shared-reading message text, the public profile snapshot, and their tests |
| `src/features/vitals/useVitalsSharing.ts` | Generated the hooks for the Private/Public setting (keeps the profile copy up to date) and for sending a reading as DMs with light-delay |
| `src/features/vitals/ShareDialog.tsx`, `VitalsPrivacy.tsx`, `ProfileVitals.tsx` | Generated the Share pop-up, the Private/Public switch, and the Vitals box on profiles |
| `src/pages/(app)/u/[username].tsx`, `src/pages/(app)/preferences.tsx` | Added the public Vitals box to profiles and a Vitals section to Settings |
| `src/nav.ts`, `src/components/AppShell.tsx`, `src/components/Navigation.tsx` | Added the Vitals link, breadcrumb, and icon (phone tab bar now has 5 tabs) |

**Code (Points of interest, Jailon Living):**

| File | What AI did |
| --- | --- |
| `src/schemas/poi-schema.ts` | Converted my Java `PointOfInterest` class (my fields: name, type, lat/lon, safe, discovered) into DeepSpace's schema format. AI added the `description` and `body` fields and the permissions. |
| `src/features/map/types.ts` | Converted the same fields from my Java class into a TypeScript type |
| `src/features/map/poi-logic.ts` | Ported my Java rules (discovered check, valid types, off-map check) to TypeScript |
| `src/features/map/PoiForm.tsx` | Generated the React form from my Java `PoiForm` flow |
| `src/features/map/MapView.tsx` | Generated the clickable map that plots POIs by lat/lng, and the NASA terrain tiles with a tint in each tab's color |
| `src/pages/(app)/map.tsx` | Generated the map page with planet tabs, the form, the POI list, and remove for owners and admins |
| `src/features/map/types.ts`, `poi-logic.ts`, `PoiForm.tsx`, `map.tsx`, `src/schemas/poi-schema.ts` (update) | Added Europa, Titan, Ceres, and Ganymede as map tabs (map-only list), with tab colors taken from the forums |
| `src/features/map/landmarks.ts` | Generated the list of real landmarks (Olympus Mons, Apollo 11, Huygens, etc.) with coordinates |
| `src/features/map/MapView.tsx`, `src/pages/(app)/map.tsx`, `poi-logic.ts` (update) | Bigger landmark markers and labels; clicking a POI or landmark opens a details card (name, type, safety, coordinates, description, remove), closable with ✕, Esc, or a click on the map, and reachable by keyboard |
| `src/nav.ts` | Added the Map link |

I designed the POI data and logic in Java first (including the idea to work out "discovered" automatically from nearby POIs); AI turned it into React and TypeScript for this stack.

Every team member has read and can explain all AI-assisted code. Changes made after the starter code are our own unless listed above.

## Prerequisites

You need Node.js (22.15 or newer on the 22 line, or Node.js 24 or 26) with npm, and a GitHub or Google account to sign in to DeepSpace.

```
# check your versions
node -v
npm -v
```

## Build from source

Clone the repo, install the packages, and start the local dev server. Open the link it prints: the welcome page opens first (press Enter to go in). Guests can read everything; sign in with GitHub or Google to post, reply, message, vote, or log vitals (the first sign-in creates your account, then you pick a @username).

```
git clone https://github.com/jailonl/geauxhack2026-skibsahur.git
cd geauxhack2026-skibsahur
npm install
npx deepspace dev start
```

Photo and video uploads only work locally after the app has been deployed once (`npx deepspace deploy`), because local uploads need a token that the first deploy creates. If a new page shows "Page not found" in local dev, stop the server, delete `node_modules/.vite` and `src/router.ts`, and start it again.

## Extras

**Science behind the light-delay:** Earth and Mars positions use circular-orbit approximations from their mean longitudes at J2000 (within about 10% of the true distance). One-way delay = distance ÷ speed of light. Earth–Moon delay uses the average distance of 384,400 km.

**Facts the bots use:** Mars sol length (24 h 39 min 35 s), Curiosity's measured surface radiation (~0.67 mSv/day), ISS water recovery (~98%).

**POI map terrain:** NASA Solar System Treks (trek.nasa.gov). Moon: LRO WAC mosaic (NASA/GSFC/Arizona State University). Mars: Viking MDIM 2.1 (NASA/JPL/USGS). Europa and Ganymede: Voyager and Galileo SSI mosaics (NASA/JPL/USGS). Titan: Cassini ISS mosaic (NASA/JPL/Space Science Institute). Ceres: Dawn Framing Camera mosaic (NASA/JPL/DLR). NASA imagery is public domain.

**Where the places are:** Earth, Mars, Jupiter, and Saturn use circular orbits from their real mean longitudes at J2000; Ceres and the Kuiper freighter use approximate starting points. Moons and the station circle their planet at their real distances. Proxima b (4.2465 light-years) and Alpha Centauri B (4.37 light-years) use their real sky positions. The map squeezes distances with a square root so it fits; the numbers are not squeezed.

**Habitability numbers:** rounded from NASA planetary fact sheets and mission measurements (Curiosity's radiation on Mars, Chang'e 4 on the Moon, ISS dosimeters, Galileo-era estimates for Jupiter's moons). Proxima b's values are estimates, and Alpha Centauri B has no confirmed planet, so its colony is an orbiting habitat.

**How the aliens work (no AI):** each species has its own list of sounds. To write a word in an alien language, we hash the English word together with the species name (FNV-1a) and use that number to seed a small random generator (Mulberry32), which picks the syllables. The same word always becomes the same alien word, so each language is consistent. The English sentences come from a fill-in-the-blank grammar: a template like "Ate #dish# for #meal#. #rating#" has each #word# replaced with a random choice from that word's list. Time is cut into 3-second slots, and each slot's random choices are seeded by the slot number, so every viewer sees the same aliens say the same things at the same time without saving anything. Signal delays use the same orbital math as the rest of the app.

**Vitals safety limits:** for humans, resting heart rate 60–100 bpm is normal (American Heart Association); we flag under 50 or over 100, and danger under 40 or over 130. Blood oxygen under 95% is low and under 90% is hypoxemia. Blood pressure follows the 2017 ACC/AHA guideline (130/80 is high, over 180/120 is a crisis) plus under 90/60 for low pressure. Body temperature: 38.0 °C fever, 40.0 °C heat stroke, under 35.0 °C hypothermia. Radiation: measured daily doses are Earth ~2.4 mSv a year, the ISS ~0.5 mSv/day, the Moon 1.37 mSv/day (Chang'e 4), Mars 0.64 mSv/day and deep space 1.84 mSv/day (Curiosity); other worlds use our estimates for a shielded habitat. "Warning" is more than double a world's normal dose; "danger" is over 8.3 mSv in a day, the pace of NASA's old 30-day limit (250 mSv), and NASA's career limit is 600 mSv (NASA-STD-3001). Supplies: cargo takes the Hohmann transfer time (Moon 4 days, Mars ~8.5 months, Jupiter ~2.7 years, Saturn ~6 years) and arrives once per synodic period (Mars every 26 months, Jupiter every 13); "danger" means you would run out before an emergency ship could arrive. The survival rating is a chance of survival: each reading counts 100% if good, 92% if a warning, and 45% if in danger, and the chances multiply (one warning = 92%, one danger = 45%). 95%+ is Thriving, 80–94% Stable, 50–79% At risk, under 50% Critical.

**Fonts** (all free under the SIL Open Font License, served by Google Fonts): Pixelify Sans by Stefie Justprince, Silkscreen by Jason Kottke, VT323 by Peter Hull, and Atkinson Hyperlegible by the Braille Institute (the "Readable font" setting). Icons are from Lucide (ISC license), included with the DeepSpace starter.

**Known limitations:** local dev keeps its own data, so use the deployed link to see shared posts; photo/video uploads need one deploy before they work locally.
