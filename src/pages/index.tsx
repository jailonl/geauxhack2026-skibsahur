/**
 * Landing page ("/"): what new visitors see first, over a pixel starfield. It leads with why communication keeps
 * people alive off Earth, then how far help is right now (signal map) and whether humans can survive each place. "Press Enter: Stellar" (enter Stellar:
 * interstellar). Pressing the Enter key anywhere on the page, or the button, opens the app. It's a STATIC page (no DeepSpace providers), prerendered
 * for crawlers, so it must render the same markup with or without a browser. The live parts (light delay
 * right now, alien chatter) use the clock, so they only appear after the page has loaded in the browser.
 */

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Seo } from '../components/Seo'
import AlienCard from '../features/aliens/AlienCard'
import Starfield from '../features/home/Starfield'
import { latestAliens } from '../features/aliens/latest'
import { useSlotClock } from '../features/chatter/stream'
import { applySettings } from '../features/settings/settings'
import { HabitabilityList } from '../features/signals/Habitability'
import SignalMap from '../features/signals/SignalMap'
import { SignInButtons } from '../features/social/SignIn'
import { seo } from '../seo'

// What Stellar does, in order of how much it matters when your life depends on a sealed habitat.
const SURVIVAL = [
  { to: '/messages', title: 'Reach help', text: 'Message mission operators on every world. They answer emergencies in seconds on your own world and tell you exactly how long a reply from farther away will take.' },
  { to: '/map', title: 'Warn everyone', text: 'Mark hazards, colonies, and resources on real NASA terrain. Every point of interest gets its own forum thread so others can confirm it.' },
  { to: '/vitals', title: 'Watch your body', text: 'Log heart rate, oxygen, pressure, temperature, radiation, and supplies against real medical and NASA limits, then share a reading with a doctor or crewmate.' },
  { to: '/#delays', title: 'Know the wait', text: 'See the real light delay between any two places today, so you know whether help is seconds, minutes, or years away.' },
  { to: '/home', title: 'Stay connected', text: 'A live feed and planet forums so isolated crews can share what they see, ask for advice, and not feel alone.' },
]

// Each section sits on a solid panel so its text stays readable over the starfield.
const PANEL = 'bg-background/95 p-4 sm:p-6'

const STEPS = [
  'Sign in with GitHub or Google. Your first sign-in creates your account.',
  'Pick a @username and the world you live on.',
  'Save your vitals, mark hazards, and message operators and other colonists.',
]

/** The three newest alien transmissions, updating every few seconds (browser only). */
function AlienTicker() {
  const slot = useSlotClock()
  const aliens = latestAliens(slot, 'lively', [], 3)
  return (
    <div className="space-y-4">
      {aliens.map((a) => (
        <AlienCard key={a.id} post={a} />
      ))}
    </div>
  )
}

export default function Landing() {
  // Browser-only parts wait for this, so the prerendered HTML matches the first render.
  const [mounted, setMounted] = useState(false)
  const navigate = useNavigate()
  const { hash } = useLocation()
  useEffect(() => {
    applySettings() // saved theme, text size, readable font
    setMounted(true)
  }, [])

  // Links to "/#delays" (side panel, tiles) jump to the signal map once the page has drawn it.
  useEffect(() => {
    if (mounted && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [mounted, hash])

  // Press Enter anywhere to go in. Links, buttons, and form fields already use Enter for themselves, so skip those.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('a, button, input, textarea, select')) return
      e.preventDefault()
      navigate('/home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <>
      <Seo {...seo} path="/" />
      <Starfield />
      <div data-testid="static-landing" className="relative mx-auto max-w-[1080px] space-y-14 px-4 pb-16">
        <header className="flex items-center justify-between py-5">
          <span className="font-display text-2xl text-primary">Stellar</span>
          <Link to="/home" className="border border-border px-3 py-1.5 text-sm font-bold hover:bg-accent">
            Skip to the feed
          </Link>
        </header>

        <section aria-labelledby="title" className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <p className="font-signal mb-4 bg-background/90 px-2 text-lg text-muted-foreground">&gt; INCOMING TRANSMISSION</p>
          <h1 id="title" className="font-display text-5xl leading-none text-primary sm:text-7xl md:text-8xl">Stellar</h1>
          <p className="mt-4 max-w-xl bg-background/90 px-3 py-1 text-lg text-foreground">
            Off Earth, staying alive depends on staying in touch. Warn your crew about hazards, reach help, and share
            your vitals, knowing exactly how long every message takes to cross space.
          </p>

          <Link
            to="/home"
            className="font-display mt-10 block border border-border bg-card px-5 py-4 text-lg hover:bg-accent sm:text-2xl"
            aria-label="Press Enter to enter Stellar"
          >
            <span className="text-muted-foreground">Press Enter:</span> <span className="text-primary">Stellar</span>
            <span aria-hidden className="blink text-primary">_</span>
          </Link>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
            <Link to="/messages" className="border border-border px-4 py-2 font-bold hover:bg-accent">Reach an operator</Link>
            <Link to="/#delays" className="border border-border px-4 py-2 font-bold hover:bg-accent">Check signal times</Link>
            <a href="#join" className="border border-border px-4 py-2 font-bold hover:bg-accent">Sign in</a>
          </div>
          <p className="mt-3 bg-background/90 px-2 text-sm text-foreground">No account needed to look around.</p>
        </section>

        <section aria-labelledby="why" className={PANEL}>
          <h2 id="why" className="font-display mb-1 text-lg">Communication keeps colonists alive</h2>
          <p className="mb-4 text-muted-foreground">
            Off Earth, a leak, a dust storm, or a radiation spike can kill in minutes, and help may be minutes or years away
            at the speed of light. Stellar is built around that.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SURVIVAL.map((f, i) => (
              <li key={f.to}>
                <Link to={f.to} className="block h-full border border-border bg-card p-4 hover:bg-accent/40">
                  <span className="font-display block text-primary">{i + 1}. {f.title}</span>
                  <span className="mt-1 block text-foreground">{f.text}</span>
                  <span className="font-signal mt-2 block text-primary">[ Open ]</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="delays" className={PANEL}>
          <h2 id="delays" className="font-display mb-1 text-lg">How far is help right now?</h2>
          <p className="mb-4 text-muted-foreground">
            Pick where you are and where help is. See how long a message takes today, and whether humans can survive there.
          </p>
          {mounted ? <SignalMap /> : <p className="font-signal text-muted-foreground">Calculating orbits...</p>}
        </section>

        <section aria-labelledby="habitable" className={PANEL}>
          <h2 id="habitable" className="font-display mb-1 text-lg">Can humans live there?</h2>
          <p className="mb-4 text-muted-foreground">
            Only Earth is livable outdoors. Everywhere else, people survive inside sealed, shielded habitats, so losing
            contact is dangerous.
          </p>
          <HabitabilityList />
        </section>

        <section aria-labelledby="aliens" className={`${PANEL} grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]`}>
          <div>
            <h2 id="aliens" className="font-display mb-2 text-lg">Listening for other voices</h2>
            <p className="text-muted-foreground">
              Six alien species on Mars, Europa, Titan, Io, Enceladus, and Proxima b chatter in their own languages.
              Their posts land in the feed every few seconds. Press Translate to read them.
            </p>
          </div>
          {mounted ? <AlienTicker /> : <p className="font-signal text-muted-foreground">Scanning for signals...</p>}
        </section>

        <section id="join" aria-labelledby="steps" className={`${PANEL} grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]`}>
          <div>
            <h2 id="steps" className="font-display mb-4 text-lg">How to join</h2>
            <ol className="space-y-4">
              {STEPS.map((step, i) => (
                <li key={step} className="flex gap-3 border border-border bg-card p-4">
                  <span className="font-display text-2xl text-primary">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="self-start border border-border bg-card p-5">
            <h2 className="font-display mb-1 text-sm uppercase tracking-wider text-primary">Join Stellar</h2>
            <p className="mb-4 text-sm text-muted-foreground">Sign in to message operators, log your vitals, mark hazards, and post.</p>
            <SignInButtons />
          </div>
        </section>

        <footer className={`${PANEL} font-signal text-muted-foreground`}>
          Built at Geaux Hack 2026 by Vilarian Breaux, Brandon Richard, and Jailon Living.
        </footer>
      </div>
    </>
  )
}
