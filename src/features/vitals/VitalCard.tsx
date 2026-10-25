// One vital on the dashboard: latest value, a color-coded level with the reason in words
// (so color is never the only signal), a small trend line, and when it was read.
import { cn } from '../../lib/utils'
import type { Check, Level } from './types'

export const LEVEL_TEXT: Record<Level, string> = { ok: 'OK', caution: 'Watch', danger: 'Danger' }

// Solid badge colors with dark/light text picked for contrast on both themes.
export const LEVEL_BADGE: Record<Level, string> = {
  ok: 'bg-emerald-400 text-black',
  caution: 'bg-amber-400 text-black',
  danger: 'bg-red-600 text-white',
}

export const LEVEL_COLOR: Record<Level, string> = { ok: '#34d399', caution: '#fbbf24', danger: '#dc2626' }

export function LevelBadge({ level, className }: { level: Level; className?: string }) {
  return (
    <span className={cn('font-display px-1.5 py-0.5 text-[10px] uppercase tracking-wider', LEVEL_BADGE[level], className)}>
      {LEVEL_TEXT[level]}
    </span>
  )
}

/** "just now", "5 min ago", "3 h ago", "2 d ago" */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86_400)} d ago`
}

/** Tiny line chart of the last few readings. Decorative: the number and the words carry the meaning. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${22 - ((v - lo) / span) * 20}`)
    .join(' ')
  return (
    <svg aria-hidden viewBox="0 0 100 24" preserveAspectRatio="none" className="mt-2 h-6 w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function VitalCard({ label, value, unit, check, trend = [], at, hint }: {
  label: string
  value: string | null // already formatted; null = never logged
  unit?: string
  check: Check | null
  trend?: number[]
  at?: string | null // when the value was logged
  hint?: string // extra line under the reason, e.g. "Mars background: 0.64 mSv/day"
}) {
  const level = check?.level
  return (
    <article
      aria-label={label}
      className="relative border bg-card p-3"
      style={level ? { borderTop: `4px solid ${LEVEL_COLOR[level]}` } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm text-muted-foreground">{label}</h3>
        {level && <LevelBadge level={level} />}
      </div>

      {value == null ? (
        <p className="font-signal mt-1 text-2xl text-muted-foreground">--</p>
      ) : (
        <p className="font-signal mt-1 text-3xl tabular-nums leading-none">
          {value}
          {unit && <span className="ml-1 text-base text-muted-foreground">{unit}</span>}
        </p>
      )}

      <p className="mt-1 text-xs">{value == null ? 'No reading yet' : check?.reason}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <Sparkline values={trend} color={level ? LEVEL_COLOR[level] : 'currentColor'} />
      {at && <p className="font-signal mt-1 text-right text-muted-foreground">{timeAgo(at)}</p>}
    </article>
  )
}
