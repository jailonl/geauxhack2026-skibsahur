// "Can humans live there?" for one place (a card) or for every place (a list), from src/lib/habitability.ts.
import { HABITABILITY, VERDICT_LABELS } from '../../lib/habitability'
import { ALL_PLACES, BODY_LABELS, PLANET_COLORS, type Place } from '../../lib/space'

function VerdictTag({ place }: { place: Place }) {
  const v = VERDICT_LABELS[HABITABILITY[place].verdict]
  return (
    <span className="border px-1.5 text-xs" style={{ borderColor: v.color, color: v.color }}>
      {v.label}
    </span>
  )
}

/** One place's survival facts. */
export function HabitabilityCard({ place }: { place: Place }) {
  const h = HABITABILITY[place]
  const rows: [string, string][] = [
    ['Gravity', h.gravity],
    ['Temperature', h.temperature],
    ['Air', h.air],
    ['Radiation', h.radiation],
    ['Water', h.water],
    ['Biggest danger', h.danger],
  ]
  return (
    <section aria-label={`Can humans live on ${BODY_LABELS[place]}?`} className="border border-border bg-card p-4">
      <h3 className="font-display flex flex-wrap items-center gap-2 text-sm">
        <span style={{ color: PLANET_COLORS[place] }}>Can humans live on {BODY_LABELS[place]}?</span>
      </h3>
      <p className="mt-1"><VerdictTag place={place} /></p>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Every place at a glance: verdict and biggest danger. */
export function HabitabilityList() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {ALL_PLACES.map((p) => (
        <li key={p} className="border border-border bg-card px-3 py-2">
          <span className="flex flex-wrap items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5" style={{ background: PLANET_COLORS[p] }} />
            <span className="font-bold">{BODY_LABELS[p]}</span>
            <VerdictTag place={p} />
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">Biggest danger: {HABITABILITY[p].danger}</span>
        </li>
      ))}
    </ul>
  )
}
