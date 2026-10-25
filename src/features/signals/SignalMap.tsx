// Signal map: pick any two places and see how long light (and so a message) takes between them right now,
// on a top-down map of the solar system drawn from the same orbit math (src/lib/space.ts).
// The map squeezes distances (square-root scale) so the Kuiper Belt fits on screen; other stars are shown
// as arrows at the edge, pointing the way they really are. Nothing here is a picture: it's drawn by code.
import { useEffect, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import {
  BODY_LABELS, MAP_ORBITS, PLACE_GROUPS, PLANET_COLORS, formatDelay, hostOf, hostPositionAU, lightDelaySeconds, positionAU,
  type Host, type Place,
} from '../../lib/space'

const SIZE = 360 // SVG units
const CENTER = SIZE / 2
const EDGE = SIZE / 2 - 18 // radius of the outermost orbit on screen
const MAX_AU = 43 // the Kuiper freighter's orbit

const HOST_LABELS: Record<Host, string> = { earth: 'Earth', mars: 'Mars', ceres: 'Ceres', jupiter: 'Jupiter', saturn: 'Saturn', kuiper: 'Kuiper' }
const HOST_COLORS: Record<Host, string> = { earth: '#3b82f6', mars: '#e4572e', ceres: '#a78bfa', jupiter: '#d6a26b', saturn: '#f59e0b', kuiper: '#94a3b8' }

/** Sun-centered AU → screen point, with distances squeezed by a square root. */
function toScreen(x: number, y: number): [number, number] {
  const r = Math.hypot(x, y)
  if (r === 0) return [CENTER, CENTER]
  const scaled = (Math.sqrt(r) / Math.sqrt(MAX_AU)) * EDGE
  return [CENTER + (x / r) * scaled, CENTER - (y / r) * scaled]
}

/** Where to draw a place: its planet's spot, or an arrow at the edge for another star. */
function screenPoint(place: Place, now: number): [number, number] {
  const host = hostOf(place)
  if (host === 'star') {
    const [x, y] = positionAU(place, now)
    const r = Math.hypot(x, y)
    return [CENTER + (x / r) * (EDGE + 8), CENTER - (y / r) * (EDGE + 8)]
  }
  const [x, y] = hostPositionAU(host, now)
  return toScreen(x, y)
}

function PlaceSelect({ id, label, value, onChange }: { id: string; label: string; value: Place; onChange: (p: Place) => void }) {
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as Place)} className="mt-1 block w-full border border-border bg-background p-2 text-foreground">
        {PLACE_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.places.map((p) => (
              <option key={p} value={p}>{BODY_LABELS[p]}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

function arrivalText(seconds: number, now: number): string {
  const at = new Date(now + seconds * 1000)
  if (seconds < 60) return 'almost instantly'
  if (seconds < 12 * 3600) return `at ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  return `on ${at.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}`
}

export default function SignalMap({ initialFrom = 'earth', initialTo = 'mars' }: { initialFrom?: Place; initialTo?: Place }) {
  const [from, setFrom] = useState<Place>(initialFrom)
  const [to, setTo] = useState<Place>(initialTo)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000) // planets barely move in a minute
    return () => window.clearInterval(id)
  }, [])

  const seconds = lightDelaySeconds(from, to, now)
  const [fx, fy] = screenPoint(from, now)
  const [tx, ty] = screenPoint(to, now)
  const [sunX, sunY] = toScreen(0, 0)
  const stars = PLACE_GROUPS.flatMap((g) => g.places).filter((p) => hostOf(p) === 'star')

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <PlaceSelect id="signal-from" label="From" value={from} onChange={setFrom} />
          <button
            type="button"
            onClick={() => {
              setFrom(to)
              setTo(from)
            }}
            aria-label="Swap from and to"
            className="mb-0.5 border border-border p-2 hover:bg-accent"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden />
          </button>
          <PlaceSelect id="signal-to" label="To" value={to} onChange={setTo} />
        </div>

        <div className="border border-border bg-card p-4" aria-live="polite">
          <p className="text-sm text-muted-foreground">
            A message from <span style={{ color: PLANET_COLORS[from] }}>{BODY_LABELS[from]}</span> to{' '}
            <span style={{ color: PLANET_COLORS[to] }}>{BODY_LABELS[to]}</span> takes
          </p>
          <p className="font-display mt-1 text-3xl text-primary">{from === to ? 'no time' : formatDelay(seconds)}</p>
          {from !== to && (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Sent now, it arrives {arrivalText(seconds, now)}.</p>
              <p className="text-sm text-muted-foreground">The fastest possible reply comes back after {formatDelay(seconds * 2)}.</p>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Planet positions are worked out for today. The map squeezes distances so the outer solar system fits; the
          numbers are not squeezed.
        </p>
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Map of the solar system with the signal path from ${BODY_LABELS[from]} to ${BODY_LABELS[to]}`}
        className="w-full border border-border bg-background"
        shapeRendering="crispEdges"
      >
        {MAP_ORBITS.map((o) => {
          const r = (Math.sqrt(o.radius) / Math.sqrt(MAX_AU)) * EDGE
          return <circle key={o.name} cx={CENTER} cy={CENTER} r={r} fill="none" stroke="var(--color-border)" strokeDasharray="2 4" />
        })}
        <rect x={sunX - 5} y={sunY - 5} width={10} height={10} fill="#ffb454" />

        {MAP_ORBITS.map((o) => {
          const host = o.name
          const [x, y] = toScreen(...(hostPositionAU(host, now).slice(0, 2) as [number, number]))
          return (
            <g key={host}>
              <rect x={x - 3} y={y - 3} width={6} height={6} fill={HOST_COLORS[host]} />
              <text x={x + 6} y={y - 5} fontSize={11} fill="var(--color-muted-foreground)" className="font-signal">{HOST_LABELS[host]}</text>
            </g>
          )
        })}

        {stars.map((p, i) => {
          const [x, y] = screenPoint(p, now)
          const labelY = y > CENTER ? y - 8 - 13 * i : y + 16 + 13 * i // the two stars sit close together; stack their labels
          return (
            <g key={p}>
              <rect x={x - 3} y={y - 3} width={6} height={6} fill={PLANET_COLORS[p]} />
              <text x={Math.min(Math.max(x, 50), SIZE - 50)} y={labelY} fontSize={11} textAnchor="middle" fill="var(--color-muted-foreground)" className="font-signal">
                {BODY_LABELS[p]} →
              </text>
            </g>
          )
        })}

        {from !== to && <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="var(--color-primary)" strokeWidth={2} strokeDasharray="6 4" />}
        <rect x={fx - 6} y={fy - 6} width={12} height={12} fill="none" stroke={PLANET_COLORS[from]} strokeWidth={2} />
        <rect x={tx - 6} y={ty - 6} width={12} height={12} fill="none" stroke={PLANET_COLORS[to]} strokeWidth={2} />
      </svg>
    </div>
  )
}
