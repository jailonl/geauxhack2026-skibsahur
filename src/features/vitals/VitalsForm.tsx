// "Log a reading" form. Type your health numbers in, or press "Read sensors" to fill them with a
// simulated reading for whoever lives on your world, then Save. Empty boxes are skipped.
// Radiation and supplies aren't typed: they're the colony's own numbers (colony.ts) and get added
// to the reading automatically when you save. The result pops up after saving (ReadingResult.tsx).
import { useState } from 'react'
import { useMutations } from 'deepspace'
import { BODY_LABELS, type Place } from '../../lib/space'
import { alienFor, withArticle } from './aliens'
import { colonyNow } from './colony'
import { HEALTH_KEYS, fieldFor, readingProblem } from './limits'
import { simulateReading } from './simulate'
import type { VitalKey, Vitals } from './types'

type Draft = Record<VitalKey, string>

const EMPTY = Object.fromEntries(HEALTH_KEYS.map((k) => [k, ''])) as Draft

function NumberField({ k, place, value, onChange, label }: {
  k: VitalKey; place: Place; value: string; onChange: (v: string) => void; label?: string
}) {
  const f = fieldFor(k, place)
  return (
    <label className="block text-sm">
      <span className="block">
        {label ?? f.label} <span className="text-muted-foreground">({f.unit})</span>
      </span>
      <input
        type="number"
        inputMode="decimal"
        step={f.step}
        min={f.min}
        max={f.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-border bg-background p-2 tabular-nums"
      />
    </label>
  )
}

export default function VitalsForm({ home, onSaved }: {
  home: Place
  onSaved: (reading: Vitals) => void // called after a successful save, with what was saved
}) {
  const { ready, create } = useMutations<Vitals>('vitals')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [note, setNote] = useState('')
  const [fromSensors, setFromSensors] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const alien = alienFor(home)

  const set = (k: VitalKey) => (v: string) => {
    setDraft((d) => ({ ...d, [k]: v }))
    setFromSensors(false) // edited by hand now
  }

  function onReadSensors() {
    const r = simulateReading(home)
    setDraft(Object.fromEntries(HEALTH_KEYS.map((k) => [k, r[k] == null ? '' : String(r[k])])) as Draft)
    setFromSensors(true)
    setError('')
    setMessage(`Sensors read on ${BODY_LABELS[home]}. Check the numbers, then save.`)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    // Your health numbers (only the boxes with something in them), plus the colony's numbers right now.
    const colony = colonyNow(home)
    const reading: Vitals = {
      body: home,
      source: fromSensors ? 'sensor' : 'manual',
      radiation: colony.mSv,
      oxygenDays: colony.oxygenDays,
      waterDays: colony.waterDays,
      foodDays: colony.foodDays,
    }
    for (const k of HEALTH_KEYS) {
      if (draft[k].trim() !== '') reading[k] = Number(draft[k])
    }
    if (note.trim()) reading.note = note.trim()

    const problem = readingProblem(reading)
    if (problem) return setError(problem)
    setError('')

    try {
      await create(reading)
      onSaved(reading)
      setDraft(EMPTY)
      setNote('')
      setFromSensors(false)
    } catch (err) {
      setError('Save failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Log a reading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {alien
            ? `You're ${withArticle(alien.name)} on ${BODY_LABELS[home]}. Readings use ${alien.name} limits.`
            : `You're human on ${BODY_LABELS[home]}. Readings use medical limits.`}
        </p>
        <button type="button" onClick={onReadSensors} className="border border-border px-3 py-1.5 text-sm hover:bg-accent">
          Read sensors
        </button>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Health</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField k="heartRate" place={home} value={draft.heartRate} onChange={set('heartRate')} />
          <NumberField k="spo2" place={home} value={draft.spo2} onChange={set('spo2')} />
          <NumberField k="temperature" place={home} value={draft.temperature} onChange={set('temperature')} />
          <fieldset className="sm:col-span-3">
            <legend className="text-sm">
              {alien ? 'Body pressure' : 'Blood pressure'} <span className="text-muted-foreground">(mmHg)</span>
            </legend>
            <div className="mt-1 grid max-w-xs grid-cols-2 gap-2">
              <NumberField k="systolic" place={home} label="Top" value={draft.systolic} onChange={set('systolic')} />
              <NumberField k="diastolic" place={home} label="Bottom" value={draft.diastolic} onChange={set('diastolic')} />
            </div>
          </fieldset>
        </div>
      </fieldset>

      <p className="text-xs text-muted-foreground">
        Radiation and supplies come from the {BODY_LABELS[home]} colony and are added when you save.
      </p>

      <label className="block text-sm">
        Note <span className="text-muted-foreground">(optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={140}
          placeholder="After a 4 h EVA"
          className="mt-1 w-full border border-border bg-background p-2"
        />
      </label>

      <button type="submit" disabled={!ready} className="bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">
        Save reading
      </button>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  )
}
