// "Log a reading" form. Type numbers in, or press "Read sensors" to fill it with a simulated reading
// for your home world, then Save. Empty boxes are skipped, so you can log just one thing.
// After saving, the page shows the result in a pop-up (ReadingResult.tsx) instead of below the form.
import { useState } from 'react'
import { useMutations } from 'deepspace'
import { BODY_LABELS, type Body } from '../../lib/space'
import { FIELDS, VITAL_KEYS, readingProblem } from './limits'
import { simulateReading, type PreviousSupplies } from './simulate'
import type { VitalKey, Vitals } from './types'

type Draft = Record<VitalKey, string>

const EMPTY: Draft = Object.fromEntries(VITAL_KEYS.map((k) => [k, ''])) as Draft

const GROUPS: { title: string; keys: VitalKey[] }[] = [
  { title: 'Health', keys: ['heartRate', 'spo2', 'temperature'] },
  { title: 'Exposure', keys: ['radiation'] },
  { title: 'Supplies (days left)', keys: ['oxygenDays', 'waterDays', 'foodDays'] },
]

function NumberField({ k, value, onChange, label }: { k: VitalKey; value: string; onChange: (v: string) => void; label?: string }) {
  const f = FIELDS[k]
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

export default function VitalsForm({ home, previous, onSaved }: {
  home: Body
  previous: PreviousSupplies
  onSaved: (reading: Vitals) => void // called after a successful save, with what was saved
}) {
  const { ready, create } = useMutations<Vitals>('vitals')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [note, setNote] = useState('')
  const [fromSensors, setFromSensors] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const set = (k: VitalKey) => (v: string) => {
    setDraft((d) => ({ ...d, [k]: v }))
    setFromSensors(false) // edited by hand now
  }

  function onReadSensors() {
    const r = simulateReading(home, previous)
    setDraft(Object.fromEntries(VITAL_KEYS.map((k) => [k, r[k] == null ? '' : String(r[k])])) as Draft)
    setFromSensors(true)
    setError('')
    setMessage(`Sensors read on ${BODY_LABELS[home]}. Check the numbers, then save.`)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    // Only the boxes that have something in them.
    const reading: Vitals = { body: home, source: fromSensors ? 'sensor' : 'manual' }
    for (const k of VITAL_KEYS) {
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
        <p className="text-sm text-muted-foreground">Fill in what you measured, or let the sensors do it.</p>
        <button
          type="button"
          onClick={onReadSensors}
          className="border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Read sensors
        </button>
      </div>

      {GROUPS.map((g) => (
        <fieldset key={g.title}>
          <legend className="mb-2 text-sm font-bold">{g.title}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {g.keys.map((k) => (
              <NumberField key={k} k={k} value={draft[k]} onChange={set(k)} />
            ))}
            {g.title === 'Health' && (
              <fieldset className="sm:col-span-3">
                <legend className="text-sm">Blood pressure <span className="text-muted-foreground">(mmHg)</span></legend>
                <div className="mt-1 grid max-w-xs grid-cols-2 gap-2">
                  <NumberField k="systolic" label="Top" value={draft.systolic} onChange={set('systolic')} />
                  <NumberField k="diastolic" label="Bottom" value={draft.diastolic} onChange={set('diastolic')} />
                </div>
              </fieldset>
            )}
          </div>
        </fieldset>
      ))}

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

      <button
        type="submit"
        disabled={!ready}
        className="bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50"
      >
        Save reading
      </button>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  )
}
