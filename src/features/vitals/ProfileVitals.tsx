// "Vitals" box on a colonist's profile. Shows only if they set their vitals to Public;
// otherwise it renders nothing (the data isn't there to read).
import { Link } from 'react-router-dom'
import { BODY_LABELS } from '../../lib/space'
import PixelHeart from './PixelHeart'
import { publicRows } from './sharing'
import { usePublicVitals } from './useVitalsSharing'
import { timeAgo } from './VitalCard'
import { alienFor } from './aliens'
import { formatChance, survivalRating, worst } from './limits'

export default function ProfileVitals({ userId, isMe }: { userId: string; isMe: boolean }) {
  const pub = usePublicVitals(userId)
  if (!pub) return null
  const rows = publicRows(pub.data)
  if (rows.length === 0) return null
  const overall = worst(rows.map((r) => r.check.level))
  const survival = survivalRating(rows)
  const alien = alienFor(pub.data.body ?? 'earth')

  return (
    <section aria-labelledby="profile-vitals" className="border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="profile-vitals" className="font-display flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
          <PixelHeart level={overall} size={2} /> Vitals
        </h2>
        <span className="font-signal text-muted-foreground">
          {pub.data.body ? `${BODY_LABELS[pub.data.body]} · ` : ''}
          {pub.data.takenAt ? timeAgo(new Date(pub.data.takenAt).toISOString()) : ''}
        </span>
      </div>
      <p className="mb-3 text-sm">
        Survival rating <strong className="font-signal text-lg">{formatChance(survival.score)}</strong> chance of survival · {survival.label}
        {alien && <span className="text-muted-foreground"> · {alien.name}</span>}
      </p>
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-sm">
            <PixelHeart level={r.check.level} size={2} />
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            <span className="font-signal tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
      {isMe && (
        <p className="mt-3 text-xs text-muted-foreground">
          Your vitals are public. <Link to="/vitals" className="text-primary hover:underline">Change on the Vitals page</Link>
        </p>
      )}
    </section>
  )
}
