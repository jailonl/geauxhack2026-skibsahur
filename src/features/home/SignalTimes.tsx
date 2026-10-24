// "Signal times": how long a message from your home world takes to reach every colony, right now.
// Planet positions move, so the Mars/Jupiter/Saturn numbers change from day to day.
import { useEffect, useState } from 'react'
import {
  BODY_LABELS, PLANET_COLORS, PROXIMA_SECONDS, earthToOuterPlanetSeconds, formatLongDelay, lightDelaySeconds, type Body,
} from '../../lib/space'

type Row = { name: string; where: string; color: string; seconds: number }

function rowsFrom(home: Body, now: number): Row[] {
  const near: Row[] = (['mars', 'moon', 'earth', 'station'] as Body[])
    .filter((b) => b !== home)
    .map((b) => ({ name: BODY_LABELS[b], where: b === 'station' ? 'Low Earth orbit' : b === 'moon' ? 'Shackleton Outpost' : b === 'mars' ? 'Jezero Base' : 'Mission Control', color: PLANET_COLORS[b], seconds: lightDelaySeconds(home, b, now) }))
  // From Mars, the outer colonies are roughly as far as from Earth at this scale; we use Earth's distance.
  const far: Row[] = [
    { name: 'Europa', where: 'Jupiter system', color: '#7dd3fc', seconds: earthToOuterPlanetSeconds('jupiter', now) },
    { name: 'Titan', where: 'Saturn system', color: '#f59e0b', seconds: earthToOuterPlanetSeconds('saturn', now) },
    { name: 'Proxima b', where: 'Another star', color: '#f472b6', seconds: PROXIMA_SECONDS },
  ]
  return [...near, ...far]
}

export default function SignalTimes({ home }: { home: Body }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000) // distances change slowly
    return () => window.clearInterval(id)
  }, [])

  return (
    <section aria-labelledby="signal-times" className="rounded-2xl border border-border bg-card p-4">
      <h2 id="signal-times" className="flex items-center gap-2 font-display text-base font-bold">
        <span aria-hidden className="signal-pulse h-2 w-2 rounded-full bg-primary" />
        Signal times
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        One-way light delay from <span style={{ color: PLANET_COLORS[home] }}>{BODY_LABELS[home]}</span>, right now.
      </p>
      <ul className="space-y-2.5">
        {rowsFrom(home, now).map((r) => (
          <li key={r.name} className="flex items-center gap-3">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="min-w-0 flex-1">
              <span className="block leading-tight">{r.name}</span>
              <span className="block text-xs text-muted-foreground">{r.where}</span>
            </span>
            <span className="font-bold tabular-nums">{formatLongDelay(r.seconds)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
