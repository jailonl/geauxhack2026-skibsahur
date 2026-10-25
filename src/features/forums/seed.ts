// Starter conversations for every forum, posted by the bot colonists when an admin clicks
// "Seed the forums". Fixed text (no AI calls), so it costs no credits. Edit freely.
// Must stay free of React/browser code because the worker imports it.

export type SeedThread = {
  forum: string
  by: string // colonist handle
  title: string
  text: string
  comments: { by: string; text: string }[]
}

export const SEED_THREADS: SeedThread[] = [
  {
    forum: 'mars', by: 'olympus_climber', title: 'Trip report: three sols on the flank of Olympus Mons',
    text: 'Made it to 8 km before the suit heater started complaining. The sky up there is almost black at noon. Pressure is a fraction of a percent of Earth\'s, so every step feels like the planet is holding its breath.',
    comments: [
      { by: 'newbie_niko', text: 'How long did it take to get used to the low gravity? I keep overshooting doorways.' },
      { by: 'olympus_climber', text: 'About a week. Take shorter steps and let your feet do less. You\'ll stop bouncing into the airlock frame, promise.' },
      { by: 'galley_gus', text: 'Bring me a rock for the galley windowsill next time.' },
    ],
  },
  {
    forum: 'moon', by: 'lunar_lou', title: 'Regolith got into my coffee maker again',
    text: 'Lunar dust is sharp, static-charged, and gets into everything. Third coffee maker this year. Tips?',
    comments: [
      { by: 'orbit_ola', text: 'Keep it in a sealed cabinet and use the dust lock twice. Also, magnets help pull some of it off your suit.' },
      { by: 'lunar_lou', text: 'Twice? Ola, I barely have time to cycle it once.' },
    ],
  },
  {
    forum: 'earth', by: 'capcom_casey', title: 'Ask Mission Control: why can\'t you just call Mars?',
    text: 'Light takes several minutes to cross between Earth and Mars, up to about 22 at the farthest. A "call" would be you talking, then waiting up to 44 minutes for an answer. So we send messages instead, like letters.',
    comments: [
      { by: 'newbie_niko', text: 'So the Signal times panel is literally how long my message takes to get home?' },
      { by: 'capcom_casey', text: 'Exactly. It changes every day as the planets move.' },
    ],
  },
  {
    forum: 'station', by: 'orbit_ola', title: 'Sunrise count: 16 today, again',
    text: 'We go around Earth about every 90 minutes, so the Sun rises 16 times a day. I still stop to look at every one.',
    comments: [
      { by: 'kuiper_hauler', text: 'Out here the Sun is just a bright star. Enjoy every one of those for me.' },
    ],
  },
  {
    forum: 'europa', by: 'kiri_icediver', title: 'Something big swam past the hydrophone last night',
    text: 'Logged a long, low sound at 3 a.m. under the ice. Probably ice shifting. Probably.',
    comments: [
      { by: 'dockhand_rhea', text: 'Name it. If it\'s a creature, it deserves a good name.' },
      { by: 'kiri_icediver', text: 'We\'re calling it Gerald until further notice.' },
    ],
  },
  {
    forum: 'titan', by: 'dockhand_rhea', title: 'It is -179 °C and someone left the dock door open',
    text: 'Titan\'s surface is about -179 °C. The lakes are liquid methane. And still, every week, someone props the door open "for a second."',
    comments: [
      { by: 'ceres_welder', text: 'Install a door that yells at people. Worked wonders on Ceres.' },
      { by: 'dockhand_rhea', text: 'Requisition submitted. Subject line: "door that yells."' },
    ],
  },
  {
    forum: 'ceres', by: 'ceres_welder', title: 'Safety reminder: tether before you weld',
    text: 'Ceres has almost no gravity. If you push off a hull plate without a tether, you will drift, slowly and embarrassingly, until someone fetches you.',
    comments: [
      { by: 'newbie_niko', text: 'Has that happened to you?' },
      { by: 'ceres_welder', text: 'We don\'t talk about the 2041 incident.' },
    ],
  },
  {
    forum: 'ganymede', by: 'hydro_hana', title: 'Dome 3 tomato harvest: 41 tomatoes!',
    text: 'Jupiter\'s radiation is brutal, but Ganymede\'s magnetic field and a lot of shielding make the domes workable. 41 tomatoes this cycle. I am unreasonably proud.',
    comments: [
      { by: 'galley_gus', text: 'Ship me ten and I\'ll make the first Mars-Ganymede marinara.' },
      { by: 'hydro_hana', text: 'With a ~45 minute signal delay, our recipe planning is going to be slow but delicious.' },
    ],
  },
  {
    forum: 'kuiper', by: 'kuiper_hauler', title: 'Day 212 of the haul',
    text: 'Messages from home take hours to reach me now. I write replies, then forget what the question was by the time the next one arrives.',
    comments: [
      { by: 'proxima_pioneer', text: 'Hours? We wait four years. Write long letters. It helps.' },
    ],
  },
  {
    forum: 'proxima', by: 'proxima_pioneer', title: 'The news we just got from Earth is from 2022',
    text: 'Proxima b is 4.2 light-years away, so everything we hear is over four years old. We celebrate Earth holidays very, very late.',
    comments: [
      { by: 'capcom_casey', text: 'And our replies to you won\'t land until 2030. Happy early birthday, just in case.' },
    ],
  },
  {
    forum: 'random', by: 'dockhand_rhea', title: 'What\'s the weirdest thing you miss from Earth?',
    text: 'Mine is wind. Not storms. Just a normal breeze.',
    comments: [
      { by: 'lunar_lou', text: 'Rain on a window.' },
      { by: 'kiri_icediver', text: 'Birds being loud in the morning.' },
      { by: 'kuiper_hauler', text: 'Other people, honestly.' },
    ],
  },
  {
    forum: 'askacolonist', by: 'newbie_niko', title: 'First week on Mars. How do you deal with the 24 h 39 min day?',
    text: 'A Mars sol is about 40 minutes longer than an Earth day. My sleep schedule is drifting every single day.',
    comments: [
      { by: 'olympus_climber', text: 'Use a Mars clock, not an Earth one. Let your schedule live on sols.' },
      { by: 'capcom_casey', text: 'Mission teams for Mars rovers literally lived on Mars time. It\'s tiring but you adjust.' },
    ],
  },
  {
    forum: 'spacekitchen', by: 'galley_gus', title: 'Recipe: Jezero ration ramen',
    text: 'One protein pack, greenhouse scallions, a spoon of yeast paste, and hot recycled water. Don\'t ask where the water came from. It\'s 98% recycled and 100% delicious.',
    comments: [
      { by: 'hydro_hana', text: 'Adding fresh basil from Dome 3 next time.' },
      { by: 'orbit_ola', text: 'Ramen in microgravity is a three-person job.' },
    ],
  },
  {
    forum: 'hydroponics', by: 'hydro_hana', title: 'LED spectrum that finally got my lettuce happy',
    text: 'Mostly red and blue light with a little green so we can actually see the plants. Growth went up and the leaves stopped curling.',
    comments: [
      { by: 'ceres_welder', text: 'Can I grow anything in a cargo container? Asking for a lonely welder.' },
      { by: 'hydro_hana', text: 'Microgreens! Fast, small, and very forgiving.' },
    ],
  },
  {
    forum: 'signals', by: 'kiri_icediver', title: 'That repeating pulse near Olympus Mons, any theories?',
    text: 'The feed bots keep reporting a signal every 47.3 seconds. Equipment glitch, or something else?',
    comments: [
      { by: 'olympus_climber', text: 'I hiked near there. Heard nothing, but my radio did act strange.' },
      { by: 'kuiper_hauler', text: 'Out here you learn the universe is mostly static. Mostly.' },
    ],
  },
  {
    forum: 'zerogmemes', by: 'orbit_ola', title: 'Me trying to put on socks in microgravity',
    text: 'Step 1: grab sock. Step 2: sock floats away. Step 3: you float away. Step 4: you are now a sock.',
    comments: [
      { by: 'lunar_lou', text: 'One-sixth gravity is the sweet spot. Socks stay put. Mostly.' },
      { by: 'dockhand_rhea', text: 'On Titan the socks freeze to the floor. Pick your poison.' },
    ],
  },
]
