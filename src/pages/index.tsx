/**
 * Landing page ("/"): what new visitors see first, over a pixel starfield. "Press Enter: Stellar" (enter Stellar:
 * interstellar). Pressing the Enter key anywhere on the page, or the button, opens the app. It's a STATIC page (no DeepSpace providers), prerendered
 * for crawlers, so it must render the same markup with or without a browser. The live parts (light delay
 * right now, alien chatter) use the clock, so they only appear after the page has loaded in the browser.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Seo } from '../components/Seo'
import AlienCard from '../features/aliens/AlienCard'
import Starfield from '../features/home/Starfield'
import { useAlienStream } from '../features/aliens/useAlienStream'
import { applySettings } from '../features/settings/settings'
import { SignInButtons } from '../features/social/SignIn'
import { formatDelay, formatLongDelay, earthToOuterPlanetSeconds, lightDelaySeconds, PROXIMA_SECONDS } from '../lib/space'
import { seo } from '../seo'

const FEATURES = [
  { to: '/home', title: 'Feed', text: 'Post photos, videos, and reports tagged with where you are. Every post shows how long its signal took to arrive.' },
  { to: '/forums', title: 'Forums', text: 'Sixteen boards for every world and topic, from p/Mars to p/SpaceKitchen.' },
  { to: '/messages', title: 'Messages', text: 'Direct messages that travel at the speed of light. Mars is minutes away; plan for it.' },
  { to: '/map', title: 'Map', text: 'Hazards and points of interest marked on real NASA terrain.' },
]

const STEPS = [
  'Sign in with GitHub or Google. Your first sign-in creates your account.',
  'Pick a @username and the world you live on.',
  'Post, reply, message other colonists, and listen in on the aliens.',
]

/** Live numbers: how far away everyone is right now (browser only). */
function LiveDelays() {
  const now = Date.now()
  const rows = [
    { label: 'Earth to Moon', value: formatDelay(lightDelaySeconds('earth', 'moon', now)) },
    { label: 'Earth to Mars', value: formatDelay(lightDelaySeconds('earth', 'mars', now)) },
    { label: 'Earth to Europa', value: formatLongDelay(earthToOuterPlanetSeconds('jupiter', now)) },
    { label: 'Earth to Titan', value: formatLongDelay(earthToOuterPlanetSeconds('saturn', now)) },
    { label: 'Earth to Proxima b', value: formatLongDelay(PROXIMA_SECONDS) },
  ]
  return (
    <ul className="grid gap-2 sm:grid-cols-5">
      {rows.map((r) => (
        <li key={r.label} className="border border-border bg-card px-3 py-2">
          <span className="block text-sm text-muted-foreground">{r.label}</span>
          <span className="font-signal block text-xl text-primary">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}

/** The three newest alien transmissions, updating every few seconds (browser only). */
function AlienTicker() {
  const aliens = useAlienStream('lively', [], 3)
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
  useEffect(() => {
    applySettings() // saved theme, text size, readable font
    setMounted(true)
  }, [])

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
          <span className="flex items-baseline gap-2">
            <span className="font-display text-2xl text-primary">Stellar</span>
            <span className="font-signal text-muted-foreground">network</span>
          </span>
          <Link to="/home" className="border border-border px-3 py-1.5 text-sm font-bold hover:bg-accent">
            Skip to the feed
          </Link>
        </header>

        <section aria-labelledby="title" className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <p className="font-signal mb-4 text-lg text-muted-foreground">&gt; INCOMING TRANSMISSION</p>
          <h1 id="title" className="font-display text-6xl leading-none text-primary sm:text-8xl">Stellar</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            The social network for life beyond Earth, where every message takes real time to cross space.
          </p>

          <Link
            to="/home"
            className="font-display mt-10 block border border-border bg-card px-6 py-4 text-xl hover:bg-accent sm:text-2xl"
            aria-label="Press Enter to enter Stellar"
          >
            <span className="text-muted-foreground">Press Enter:</span> <span className="text-primary">Stellar</span>
            <span aria-hidden className="blink text-primary">_</span>
          </Link>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
            <Link to="/forums" className="border border-border px-4 py-2 font-bold hover:bg-accent">Browse the forums</Link>
            <a href="#join" className="border border-border px-4 py-2 font-bold hover:bg-accent">Sign in</a>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">No account needed to look around.</p>
        </section>

        <section aria-labelledby="delays">
          <h2 id="delays" className="font-display mb-1 text-lg">Signal times right now</h2>
          <p className="mb-4 text-muted-foreground">Light takes time to cross space. These numbers come from where the planets are today.</p>
          {mounted ? <LiveDelays /> : <p className="font-signal text-muted-foreground">Calculating orbits...</p>}
        </section>

        <section aria-labelledby="features">
          <h2 id="features" className="font-display mb-4 text-lg">What's inside</h2>
          <ul className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.to}>
                <Link to={f.to} className="block h-full border border-border bg-card p-4 hover:bg-accent/40">
                  <span className="font-display block text-primary">{f.title}</span>
                  <span className="mt-1 block text-muted-foreground">{f.text}</span>
                  <span className="font-signal mt-2 block text-primary">[ Open {f.title.toLowerCase()} ]</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="aliens" className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div>
            <h2 id="aliens" className="font-display mb-2 text-lg">You are not alone</h2>
            <p className="text-muted-foreground">
              Six alien species on Mars, Europa, Titan, Io, Enceladus, and Proxima b chatter in their own languages.
              Their posts land in the feed every few seconds. Press Translate to read them.
            </p>
          </div>
          {mounted ? <AlienTicker /> : <p className="font-signal text-muted-foreground">Scanning for signals...</p>}
        </section>

        <section id="join" aria-labelledby="steps" className="grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
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
            <h2 className="font-display mb-1 text-sm uppercase tracking-wider text-primary">Join the network</h2>
            <p className="mb-4 text-sm text-muted-foreground">Sign in to post, reply, vote, and send messages.</p>
            <SignInButtons />
          </div>
        </section>

        <footer className="font-signal border-t border-border pt-6 text-muted-foreground">
          Built at Geaux Hack 2026 by Vilarian Breaux, Brandon Richard, and Jailon Living.
        </footer>
      </div>
    </>
  )
}
