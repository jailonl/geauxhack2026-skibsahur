// Survival rating: your chance of survival (%) for a reading, drawn as a 10-block pixel bar like a
// game health bar. "More info" opens the full output: every reading with its heart, reason, and its
// own chance, and how they combine.
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { SURVIVAL_BANDS, SURVIVAL_CHANCE, formatChance, type Survival } from './limits'
import PixelHeart from './PixelHeart'
import type { Level } from './types'

const LABEL_LEVEL: Record<Survival['label'], Level> = { Thriving: 'ok', Stable: 'ok', 'At risk': 'caution', Critical: 'danger' }
const BAR_COLOR: Record<Level, string> = { ok: '#34d399', caution: '#fbbf24', danger: '#ef4444' }

export default function SurvivalRating({ survival, note }: { survival: Survival; note?: string }) {
  const [open, setOpen] = useState(false)
  const level = LABEL_LEVEL[survival.label]
  const filled = Math.round(survival.score / 10)
  const b = SURVIVAL_BANDS
  const problems = survival.steps.filter((s) => s.level !== 'ok') // good readings are 100%, so they don't change it

  return (
    <div className="space-y-3">
      <div role="status" className="flex items-center gap-3">
        <PixelHeart level={level} size={5} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">Survival rating</p>
          <p className="font-signal text-3xl leading-none">
            {formatChance(survival.score)}
            <span className="ml-1 text-base text-muted-foreground">chance of survival</span>
          </p>
          <p className="font-signal text-xl leading-tight" style={{ color: BAR_COLOR[level] }}>{survival.label}</p>
        </div>
      </div>

      {/* 10 square blocks, filled from the left */}
      <div aria-hidden className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="h-3 flex-1 border border-border"
            style={i < filled ? { background: BAR_COLOR[level], borderColor: BAR_COLOR[level] } : undefined}
          />
        ))}
      </div>

      <p className="font-bold">{survival.summary}</p>

      <button
        type="button"
        aria-expanded={open}
        aria-controls="survival-details"
        onClick={() => setOpen((o) => !o)}
        className="font-signal text-primary hover:underline"
      >
        [ {open ? 'Less info' : 'More info'} ]
      </button>

      {open && (
        <div id="survival-details" className="space-y-3">
          <ul className="space-y-2">
            {survival.steps.map((s) => (
              <li key={s.label} className="flex items-start gap-3 border-t border-border pt-2">
                <PixelHeart level={s.level} size={2} className="mt-1" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span>{s.label}</span>
                    <span className="font-signal tabular-nums">{s.value}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">{s.reason}</span>
                </span>
                <span className={cn('font-signal w-12 shrink-0 text-right tabular-nums', s.level !== 'ok' && 'font-bold')}>
                  {s.chance}%
                </span>
              </li>
            ))}
          </ul>
          {note && <p className="text-sm text-muted-foreground">Note: {note}</p>}
          <div className="border-t border-border pt-2 text-xs text-muted-foreground">
            <p>
              How it's worked out: each reading has its own chance of survival: {SURVIVAL_CHANCE.ok}% if it's good,{' '}
              {SURVIVAL_CHANCE.caution}% if it's a warning, and {SURVIVAL_CHANCE.danger}% if it's in danger. Any one
              problem could go wrong on its own, so the chances multiply:{' '}
              <span className="font-signal text-foreground">
                {problems.length === 0
                  ? 'no problems = 100%'
                  : `${problems.map((s) => `${s.chance}%`).join(' × ')} = ${formatChance(survival.score)}`}
              </span>
              .
            </p>
            <p className="mt-1">
              {b.thriving}%+ Thriving · {b.stable}–{b.thriving - 1}% Stable · {b.atRisk}–{b.stable - 1}% At risk · under {b.atRisk}% Critical
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
