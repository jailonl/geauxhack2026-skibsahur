// "Signal times": how long a message from your home world takes to reach a handful of places, right now.
// Planets move, so the numbers change from day to day. The full any-to-any version is the Signal map page.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Block from '../../components/Block'
import { BODY_LABELS, PLANET_COLORS, formatDelay, lightDelaySeconds, type Place } from '../../lib/space'

const SHOWN: Place[] = ['earth', 'moon', 'mars', 'europa', 'titan', 'proxima', 'alphacen']

export default function SignalTimes({ home }: { home: Place }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000) // distances change slowly
    return () => window.clearInterval(id)
  }, [])

  return (
    <Block
      id="signal-times"
      title={
        <>
          <span aria-hidden className="signal-pulse h-2 w-2 bg-primary" />
          Signal times
        </>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        One-way light delay from <span style={{ color: PLANET_COLORS[home] }}>{BODY_LABELS[home]}</span>, right now.
      </p>
      <ul className="space-y-2">
        {SHOWN.filter((p) => p !== home).map((p) => (
          <li key={p} className="flex items-center gap-2.5">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0" style={{ background: PLANET_COLORS[p] }} />
            <span className="min-w-0 flex-1 leading-tight">{BODY_LABELS[p]}</span>
            <span className="font-signal tabular-nums text-primary">{formatDelay(lightDelaySeconds(home, p, now))}</span>
          </li>
        ))}
      </ul>
      <Link to="/signals" className="font-signal mt-3 inline-block text-primary hover:underline">[ Open the signal map ]</Link>
    </Block>
  )
}
