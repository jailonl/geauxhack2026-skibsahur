// "/vitals" page: your own health readings plus your colony's radiation and supplies, with warnings
// at safety limits for the world you live on. On Earth, the Moon, and the station you're human (real
// medical limits); everywhere else you're that world's alien (its own limits, see aliens.ts).
// Radiation and supplies are the colony's own live numbers (colony.ts), the same for everyone there.
// It's under (protected), so you have to be signed in, and the schema only lets you read your own
// readings (see src/schemas/vitals-schema.ts). The form, history, and limits open from buttons; a saved
// reading's survival rating pops up (ReadingResult.tsx). Readings can be shared by DM (ShareDialog.tsx),
// and the Private / Public switch puts your latest reading on your profile (VitalsPrivacy.tsx).
import { useEffect, useState } from 'react'
import { useMutations } from 'deepspace'
import Block from '../../../components/Block'
import { useMyProfile } from '../../../features/social/profiles'
import { alienFor, withArticle } from '../../../features/vitals/aliens'
import { CAREER_LIMIT_MSV, PLACE_INFO, colonyNow, dayNumber, missionDoseFromRecords, radiationOnDay, suppliesOn } from '../../../features/vitals/colony'
import VitalCard, { LevelBadge, timeAgo } from '../../../features/vitals/VitalCard'
import ReadingResult from '../../../features/vitals/ReadingResult'
import ShareDialog, { type ShareTarget } from '../../../features/vitals/ShareDialog'
import SurvivalRating from '../../../features/vitals/SurvivalRating'
import { useMyVitals } from '../../../features/vitals/useVitalsSharing'
import VitalsPrivacy from '../../../features/vitals/VitalsPrivacy'
import VitalsForm from '../../../features/vitals/VitalsForm'
import {
  checkMissionDose, checkRadiationDay, checkReading, checkSupply, fieldFor, formatChance, history, limitNotes, survivalRating, worst,
  type ReadingRow,
} from '../../../features/vitals/limits'
import type { Check, VitalKey, Vitals } from '../../../features/vitals/types'
import { BODY_LABELS, PLANET_COLORS } from '../../../lib/space'

const fmt = (n: number, places = 0) => n.toFixed(places)

type Panel = 'log' | 'history' | 'limits'
const PANELS: { id: Panel; label: string }[] = [
  { id: 'log', label: 'Log a reading' },
  { id: 'history', label: 'Recent readings' },
  { id: 'limits', label: 'Safety limits' },
]

/** Re-renders every minute so the colony numbers (radiation, supplies) stay current. */
function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs)
    return () => window.clearInterval(id)
  }, [everyMs])
  return now
}

type CardData = { value: string | null; check: Check | null; at: string | null; trend: number[] }
const EMPTY_CARD: CardData = { value: null, check: null, at: null, trend: [] }

export default function VitalsPage() {
  const { profile } = useMyProfile()
  const home = profile?.homeBody ?? 'earth'
  const alien = alienFor(home)
  const now = useNow()
  const colony = colonyNow(home, now)
  const today = dayNumber(now)
  const [panel, setPanel] = useState<Panel | null>(null) // which tool is open (none at first)
  const [saved, setSaved] = useState<ShareTarget | null>(null) // the reading shown in the result pop-up
  const [sharing, setSharing] = useState<ShareTarget | null>(null) // the reading in the Share pop-up

  const { records, status, error } = useMyVitals() // your own readings, newest first
  const { ready, remove } = useMutations<Vitals>('vitals')

  // Health cards use readings from the world you live on now, since the limits are different elsewhere.
  const here = records.filter((r) => (r.data.body ?? 'earth') === home)
  const checkOne = (reading: Vitals) => checkReading({ body: home, ...reading })[0]?.check ?? null

  function card(key: VitalKey, places = 0): CardData {
    const r = here.find((x) => x.data[key] != null) // newest first
    if (!r) return EMPTY_CARD
    const v = r.data[key] as number
    return { value: fmt(v, places), check: checkOne({ [key]: v }), at: r.createdAt, trend: history(here, key) }
  }

  const slowHeart = alien != null && alien.heartRate.cautionHigh < 10
  const heart = card('heartRate', slowHeart ? 1 : 0)
  const spo2 = card('spo2')
  const temp = card('temperature', 1)
  const bpRecord = here.find((r) => r.data.systolic != null && r.data.diastolic != null)
  const bp: CardData = bpRecord
    ? {
        value: `${bpRecord.data.systolic}/${bpRecord.data.diastolic}`,
        check: checkOne({ systolic: bpRecord.data.systolic, diastolic: bpRecord.data.diastolic }),
        at: bpRecord.createdAt,
        trend: history(here, 'systolic'),
      }
    : EMPTY_CARD

  // Colony numbers: live, the same for everyone on this world. Trends are the last 12 days.
  const pastDays = Array.from({ length: 12 }, (_, i) => today - 11 + i)
  const radDay: CardData = {
    value: fmt(colony.mSv, colony.mSv < 0.1 ? 4 : 2),
    check: checkRadiationDay(colony.mSv, home),
    at: null,
    trend: pastDays.map((d) => radiationOnDay(home, d).mSv),
  }
  const supply = (key: 'oxygenDays' | 'waterDays' | 'foodDays'): CardData => ({
    value: String(colony[key]),
    check: checkSupply(colony[key], home),
    at: null,
    trend: pastDays.map((d) => suppliesOn(home, d)[key]),
  })
  const oxygen = supply('oxygenDays')
  const water = supply('waterDays')
  const food = supply('foodDays')

  const totalDose = missionDoseFromRecords(records, home, now)
  const dose: CardData = totalDose == null
    ? EMPTY_CARD
    : { value: fmt(totalDose, 1), check: checkMissionDose(totalDose, home), at: null, trend: [] }

  // Everything on the page, for the overall survival rating.
  const gasLabel = fieldFor('spo2', home).label
  const pressureLabel = alien ? 'Body pressure' : 'Blood pressure'
  const cards: [string, string, CardData][] = [
    ['Heart rate', 'bpm', heart], [gasLabel, '%', spo2], [pressureLabel, 'mmHg', bp], ['Temperature', '°C', temp],
    ['Radiation today', 'mSv', radDay], ['Mission radiation', 'mSv', dose],
    ['Oxygen', 'days', oxygen], ['Water', 'days', water], ['Food', 'days', food],
  ]
  const rows: ReadingRow[] = cards
    .filter(([, , c]) => c.value != null && c.check != null)
    .map(([label, unit, c]) => ({ label, value: unit === '%' ? `${c.value}%` : `${c.value} ${unit}`, check: c.check! }))
  const survival = survivalRating(rows)
  const info = PLACE_INFO[home]
  const career = alien ? alien.careerDose : CAREER_LIMIT_MSV

  async function onDelete(recordId: string) {
    if (!window.confirm('Delete this reading?')) return
    try {
      await remove(recordId)
    } catch (err) {
      window.alert('Delete failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="space-y-5 p-1">
      <header>
        <h1 className="font-display text-2xl text-primary">Vitals</h1>
        <p className="text-sm text-muted-foreground">
          {alien ? `You're ${withArticle(alien.name)} on ` : "You're human on "}
          <span style={{ color: PLANET_COLORS[home] }}>{BODY_LABELS[home]}</span>
          {alien ? ` (${alien.about.toLowerCase()}).` : '.'}
        </p>
        <VitalsPrivacy className="mt-2" />
      </header>

      {status === 'error' && <p role="alert" className="text-destructive">Could not load your vitals: {error}</p>}

      {/* Overall survival rating for everything on the page. */}
      <div role={worst(rows.map((r) => r.check.level)) === 'danger' ? 'alert' : undefined} className="border bg-card p-4">
        <SurvivalRating survival={survival} />
      </div>

      <section aria-labelledby="health-h" className="space-y-2">
        <h2 id="health-h" className="font-display text-xs uppercase tracking-wider text-muted-foreground">
          Health{alien ? ` · ${alien.name} limits` : ''}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <VitalCard label="Heart rate" unit="bpm" {...heart} />
          <VitalCard label={gasLabel} unit="%" {...spo2} />
          <VitalCard label={pressureLabel} unit="mmHg" {...bp} />
          <VitalCard label="Temperature" unit="°C" {...temp} />
        </div>
      </section>

      <section aria-labelledby="exposure-h" className="space-y-2">
        <h2 id="exposure-h" className="font-display text-xs uppercase tracking-wider text-muted-foreground">
          Radiation · {BODY_LABELS[home]} colony
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <VitalCard
            label="Dose today"
            unit="mSv"
            {...radDay}
            hint={colony.storm ? 'Storm today! Stay near the shelter.' : `Normal here: ~${info.dose} mSv/day (${info.doseNote})`}
          />
          <VitalCard
            label="Mission total"
            unit="mSv"
            {...dose}
            hint={`Since your first reading · ${alien ? `${alien.name} lifetime limit` : 'NASA career limit'}: ${career} mSv`}
          />
        </div>
      </section>

      <section aria-labelledby="supplies-h" className="space-y-2">
        <h2 id="supplies-h" className="font-display text-xs uppercase tracking-wider text-muted-foreground">
          Supplies · {BODY_LABELS[home]} colony
        </h2>
        <p className="text-xs text-muted-foreground">
          {info.trip == null ? `Next harvest in ${colony.nextArrival} days` : `Next cargo in ${colony.nextArrival} days`} ({info.tripNote}).
          {colony.fault && <strong className="ml-1 text-foreground">{colony.fault} this week.</strong>}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <VitalCard label="Oxygen" unit="days" {...oxygen} />
          <VitalCard label="Water" unit="days" {...water} />
          <VitalCard label="Food" unit="days" {...food} />
        </div>
      </section>

      {/* The three tools sit behind buttons so the page isn't crowded. One opens at a time. */}
      <div role="group" aria-label="Vitals tools" className="flex flex-wrap gap-3">
        {PANELS.map((p) => {
          const isOpen = panel === p.id
          return (
            <button
              key={p.id}
              type="button"
              aria-expanded={isOpen}
              aria-controls={`panel-${p.id}`}
              onClick={() => setPanel(isOpen ? null : p.id)}
              className={
                isOpen
                  ? 'bg-primary px-4 py-2 font-bold text-primary-foreground'
                  : 'border border-border bg-card px-4 py-2 hover:bg-accent'
              }
            >
              <span aria-hidden className="mr-1.5">{isOpen ? '▾' : '▸'}</span>
              {p.label}
              {p.id === 'history' && records.length > 0 && (
                <span className="font-signal ml-1.5 opacity-80">({Math.min(records.length, 20)})</span>
              )}
            </button>
          )
        })}
      </div>

      {panel === 'log' && (
        <div id="panel-log">
          <Block id="vitals-log" title="Log a reading">
            <VitalsForm
              home={home}
              onSaved={(reading) => {
                setPanel(null) // close the form; the result pops up instead
                setSaved({ reading, takenAt: Date.now() })
              }}
            />
          </Block>
        </div>
      )}

      {panel === 'history' && (
        <div id="panel-history">
          <Block id="vitals-history" title="Recent readings">
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {status === 'loading' ? 'Loading…' : 'No readings yet. Open Log a reading to add one.'}
              </p>
            ) : (
              <div className="-m-1 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th scope="col" className="p-1.5 font-normal">When</th>
                      <th scope="col" className="p-1.5 font-normal">HR</th>
                      <th scope="col" className="p-1.5 font-normal">Gas %</th>
                      <th scope="col" className="p-1.5 font-normal">Pressure</th>
                      <th scope="col" className="p-1.5 font-normal">Temp</th>
                      <th scope="col" className="p-1.5 font-normal">Rad</th>
                      <th scope="col" className="p-1.5 font-normal">O2 / H2O / Food</th>
                      <th scope="col" className="p-1.5 font-normal">Survival</th>
                      <th scope="col" className="p-1.5 font-normal"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="font-signal tabular-nums">
                    {records.slice(0, 20).map((r) => {
                      const v = r.data
                      const rating = survivalRating(checkReading(v))
                      const level = worst(rating.steps.map((x) => x.level))
                      const dash = (n: number | undefined, places = 0) => (n == null ? '–' : fmt(n, places))
                      return (
                        <tr key={r.recordId} className="border-t border-border">
                          <td className="p-1.5" title={new Date(r.createdAt).toLocaleString()}>
                            {timeAgo(r.createdAt)}
                            {v.body && v.body !== home && <span className="ml-1 text-muted-foreground">· {BODY_LABELS[v.body]}</span>}
                            {v.source === 'sensor' && <span className="ml-1 text-muted-foreground">· sensor</span>}
                          </td>
                          <td className="p-1.5">{dash(v.heartRate)}</td>
                          <td className="p-1.5">{dash(v.spo2)}</td>
                          <td className="p-1.5">{v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : '–'}</td>
                          <td className="p-1.5">{dash(v.temperature, 1)}</td>
                          <td className="p-1.5">{dash(v.radiation, 2)}</td>
                          <td className="p-1.5">{dash(v.oxygenDays)} / {dash(v.waterDays)} / {dash(v.foodDays)}</td>
                          <td className="p-1.5">
                            <span className="inline-flex items-center gap-1.5">
                              <LevelBadge level={level} /> {formatChance(rating.score)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap p-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSharing({ reading: v, takenAt: r.createdAt })}
                              className="mr-3 text-primary underline"
                              aria-label={`Share reading from ${timeAgo(r.createdAt)}`}
                            >
                              Share
                            </button>
                            {ready && (
                              <button
                                type="button"
                                onClick={() => onDelete(r.recordId)}
                                className="text-destructive underline"
                                aria-label={`Delete reading from ${timeAgo(r.createdAt)}`}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {records.some((r) => r.data.note) && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {records.slice(0, 20).filter((r) => r.data.note).map((r) => (
                      <li key={r.recordId}>
                        <span className="font-signal text-muted-foreground">{timeAgo(r.createdAt)}:</span> {r.data.note}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Block>
        </div>
      )}

      {panel === 'limits' && (
        <div id="panel-limits">
          <Block id="vitals-limits" title={`Safety limits · ${alien ? `${alien.name} on ` : 'Humans on '}${BODY_LABELS[home]}`}>
            {alien && (
              <p className="mb-2 text-sm text-muted-foreground">
                {alien.name} limits, with radiation and supplies for the {BODY_LABELS[home]} colony.
              </p>
            )}
            <div className="-m-1 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-1.5 font-normal">Reading</th>
                    <th scope="col" className="p-1.5 font-normal"><LevelBadge level="ok" showLabel /></th>
                    <th scope="col" className="p-1.5 font-normal"><LevelBadge level="caution" showLabel /></th>
                    <th scope="col" className="p-1.5 font-normal"><LevelBadge level="danger" showLabel /></th>
                    <th scope="col" className="p-1.5 font-normal">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {limitNotes(home).map((n) => (
                    <tr key={n.name} className="border-t border-border">
                      <th scope="row" className="p-1.5 font-normal">{n.name}</th>
                      <td className="p-1.5">{n.normal}</td>
                      <td className="p-1.5">{n.caution}</td>
                      <td className="p-1.5">{n.danger}</td>
                      <td className="p-1.5 text-muted-foreground">{n.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
        </div>
      )}

      <ReadingResult
        reading={saved?.reading ?? null}
        onClose={() => setSaved(null)}
        onLogAnother={() => {
          setSaved(null)
          setPanel('log')
        }}
        onShare={() => {
          setSharing(saved)
          setSaved(null)
        }}
      />
      <ShareDialog target={sharing} onClose={() => setSharing(null)} />
    </div>
  )
}
