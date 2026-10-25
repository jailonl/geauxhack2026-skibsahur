// "/vitals" page: your own health and supply readings, with warnings at real safety limits.
// It's under (protected), so you have to be signed in, and the schema only lets you read your own
// readings (see src/schemas/vitals-schema.ts). Live: a reading saved on another device shows up here.
import { useAuth, useMutations, useQuery } from 'deepspace'
import Block from '../../../components/Block'
import { useMyProfile } from '../../../features/social/profiles'
import VitalCard, { LevelBadge, timeAgo } from '../../../features/vitals/VitalCard'
import VitalsForm from '../../../features/vitals/VitalsForm'
import {
  BACKGROUND_DOSE, CAREER_LIMIT_MSV, LIMIT_NOTES,
  checkBloodPressure, checkHeartRate, checkMissionDose, checkRadiationDay, checkReading, checkSpo2,
  checkSupply, checkTemperature, history, latest, missionDose, worst,
} from '../../../features/vitals/limits'
import type { Check, VitalKey, Vitals, VitalsRecord } from '../../../features/vitals/types'
import { BODY_LABELS, PLANET_COLORS } from '../../../lib/space'

const fmt = (n: number, places = 0) => n.toFixed(places)

export default function VitalsPage() {
  const { userId } = useAuth()
  const { profile } = useMyProfile()
  const home = profile?.homeBody ?? 'earth'

  const { records: raw, status, error } = useQuery<Vitals>('vitals', { orderBy: 'createdAt', orderDir: 'desc', limit: 500 })
  const { ready, remove } = useMutations<Vitals>('vitals')

  // The server already only sends your own rows; filtering again keeps it safe if that ever changes.
  const records = (raw as VitalsRecord[]).filter((r) => r.createdBy === userId)

  // One helper per simple card: latest value + its check + trend.
  function card(key: VitalKey, checkFn: (v: number) => Check, places = 0) {
    const last = latest(records, key)
    return {
      value: last ? fmt(last.value, places) : null,
      check: last ? checkFn(last.value) : null,
      at: last?.at ?? null,
      trend: history(records, key),
    }
  }

  const heart = card('heartRate', checkHeartRate)
  const spo2 = card('spo2', checkSpo2)
  const temp = card('temperature', checkTemperature, 1)
  const radDay = card('radiation', checkRadiationDay, 2)
  const oxygen = card('oxygenDays', checkSupply)
  const water = card('waterDays', checkSupply)
  const food = card('foodDays', checkSupply)

  // Blood pressure needs both numbers from the same reading.
  const bpRecord = records.find((r) => r.data.systolic != null && r.data.diastolic != null) // newest first
  const bp = bpRecord
    ? {
        value: `${bpRecord.data.systolic}/${bpRecord.data.diastolic}`,
        check: checkBloodPressure(bpRecord.data.systolic!, bpRecord.data.diastolic!),
        at: bpRecord.createdAt,
        trend: history(records, 'systolic'),
      }
    : { value: null, check: null, at: null, trend: [] }

  const totalDose = missionDose(records)
  const dose = { value: records.some((r) => r.data.radiation != null) ? fmt(totalDose, 1) : null, check: checkMissionDose(totalDose) }

  const allChecks = [heart, spo2, bp, temp, radDay, dose, oxygen, water, food]
    .map((c) => (c.value == null ? null : c.check))
    .filter((c): c is Check => c != null)
  const overall = worst(allChecks.map((c) => c.level))
  const flagged = allChecks.filter((c) => c.level !== 'ok').length

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
          Private: only you can see these. Readings from{' '}
          <span style={{ color: PLANET_COLORS[home] }}>{BODY_LABELS[home]}</span>.
        </p>
      </header>

      {status === 'error' && <p role="alert" className="text-destructive">Could not load your vitals: {error}</p>}

      {/* Overall status. role="alert" only when something is dangerous, so screen readers hear it right away. */}
      {records.length > 0 && (
        <div
          role={overall === 'danger' ? 'alert' : 'status'}
          className="flex flex-wrap items-center gap-3 border bg-card p-3"
        >
          <LevelBadge level={overall} className="text-xs" />
          <span>
            {overall === 'ok'
              ? 'All readings are in the normal range.'
              : `${flagged} reading${flagged === 1 ? '' : 's'} need${flagged === 1 ? 's' : ''} attention.`}
          </span>
        </div>
      )}

      <section aria-labelledby="health-h" className="space-y-2">
        <h2 id="health-h" className="font-display text-xs uppercase tracking-wider text-muted-foreground">Health</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <VitalCard label="Heart rate" unit="bpm" {...heart} />
          <VitalCard label="Blood oxygen" unit="%" {...spo2} />
          <VitalCard label="Blood pressure" unit="mmHg" {...bp} />
          <VitalCard label="Temperature" unit="°C" {...temp} />
        </div>
      </section>

      <section aria-labelledby="exposure-h" className="space-y-2">
        <h2 id="exposure-h" className="font-display text-xs uppercase tracking-wider text-muted-foreground">Radiation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <VitalCard
            label="Dose today"
            unit="mSv"
            {...radDay}
            hint={`${BODY_LABELS[home]} background: about ${BACKGROUND_DOSE[home]} mSv/day`}
          />
          <VitalCard
            label="Mission total"
            unit="mSv"
            value={dose.value}
            check={dose.value == null ? null : dose.check}
            hint={`NASA career limit: ${CAREER_LIMIT_MSV} mSv`}
          />
        </div>
      </section>

      <section aria-labelledby="supplies-h" className="space-y-2">
        <h2 id="supplies-h" className="font-display text-xs uppercase tracking-wider text-muted-foreground">Supplies</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <VitalCard label="Oxygen" unit="days" {...oxygen} />
          <VitalCard label="Water" unit="days" {...water} />
          <VitalCard label="Food" unit="days" {...food} />
        </div>
      </section>

      <VitalsForm
        home={home}
        previous={{
          oxygenDays: latest(records, 'oxygenDays')?.value,
          waterDays: latest(records, 'waterDays')?.value,
          foodDays: latest(records, 'foodDays')?.value,
        }}
      />

      <Block id="vitals-history" title="Recent readings">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {status === 'loading' ? 'Loading…' : 'No readings yet. Press Read sensors, then Save.'}
          </p>
        ) : (
          <div className="-m-1 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="p-1.5 font-normal">When</th>
                  <th scope="col" className="p-1.5 font-normal">HR</th>
                  <th scope="col" className="p-1.5 font-normal">SpO2</th>
                  <th scope="col" className="p-1.5 font-normal">BP</th>
                  <th scope="col" className="p-1.5 font-normal">Temp</th>
                  <th scope="col" className="p-1.5 font-normal">Rad</th>
                  <th scope="col" className="p-1.5 font-normal">O2 / H2O / Food</th>
                  <th scope="col" className="p-1.5 font-normal">Status</th>
                  <th scope="col" className="p-1.5 font-normal"><span className="sr-only">Delete</span></th>
                </tr>
              </thead>
              <tbody className="font-signal tabular-nums">
                {records.slice(0, 20).map((r) => {
                  const v = r.data
                  const level = worst(checkReading(v).map((c) => c.check.level))
                  const dash = (n: number | undefined, places = 0) => (n == null ? '–' : fmt(n, places))
                  return (
                    <tr key={r.recordId} className="border-t border-border">
                      <td className="p-1.5" title={new Date(r.createdAt).toLocaleString()}>
                        {timeAgo(r.createdAt)}
                        {v.source === 'sensor' && <span className="ml-1 text-muted-foreground">· sensor</span>}
                      </td>
                      <td className="p-1.5">{dash(v.heartRate)}</td>
                      <td className="p-1.5">{dash(v.spo2)}</td>
                      <td className="p-1.5">{v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : '–'}</td>
                      <td className="p-1.5">{dash(v.temperature, 1)}</td>
                      <td className="p-1.5">{dash(v.radiation, 2)}</td>
                      <td className="p-1.5">{dash(v.oxygenDays)} / {dash(v.waterDays)} / {dash(v.foodDays)}</td>
                      <td className="p-1.5"><LevelBadge level={level} /></td>
                      <td className="p-1.5 text-right">
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

      <Block id="vitals-limits" title="Safety limits">
        <div className="-m-1 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="p-1.5 font-normal">Reading</th>
                <th scope="col" className="p-1.5 font-normal"><LevelBadge level="ok" /></th>
                <th scope="col" className="p-1.5 font-normal"><LevelBadge level="caution" /></th>
                <th scope="col" className="p-1.5 font-normal"><LevelBadge level="danger" /></th>
                <th scope="col" className="p-1.5 font-normal">Source</th>
              </tr>
            </thead>
            <tbody>
              {LIMIT_NOTES.map((n) => (
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
        <p className="mt-2 text-xs text-muted-foreground">For a hackathon demo, not medical advice.</p>
      </Block>
    </div>
  )
}
