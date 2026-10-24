// The "popup" from my Java addPoi(): body comes from the map tab, lat/lng from the click,
// so the user only fills in name, type, description, and safe. Discovered is figured out for them.
import { useState } from 'react'
import { useAuth, useMutations } from 'deepspace'
import type { MapBody, PoiType, PointOfInterest } from './types'
import { POI_TYPES, isAlreadyDiscovered, isOnMap } from './poi-logic'

type Props = {
  body: MapBody
  picked: { lat: number; lng: number } | null
  onPick: (lat: number, lng: number) => void
  existing: PointOfInterest[] // POIs already on this planet, for the discovered check
}

export default function PoiForm({ body, picked, onPick, existing }: Props) {
  const { isSignedIn } = useAuth()
  const { ready, create } = useMutations<PointOfInterest>('pois')

  const [name, setName] = useState('')
  const [type, setType] = useState<PoiType>('hazard')
  const [description, setDescription] = useState('')
  const [safe, setSafe] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!isSignedIn) {
    return <p className="text-sm text-muted-foreground">Sign in (top right) to add points of interest.</p>
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault() // stop the page from reloading
    setMessage('')
    if (!picked) return setError('Click the map or type coordinates first.')
    if (!isOnMap(picked.lat, picked.lng)) return setError('That spot is off the map.')
    if (!name.trim()) return setError("Name can't be empty.")
    setError('')

    const discovered = isAlreadyDiscovered(existing, body, picked.lat, picked.lng)
    try {
      await create({
        name: name.trim(),
        description: description.trim(),
        type,
        body,
        lat: picked.lat,
        lng: picked.lng,
        safe: safe ? 1 : 0, // stored as numbers, see poi-schema.ts
        discovered: discovered ? 1 : 0,
      })
      setMessage(discovered ? 'Saved. Someone already found something near here.' : 'Saved. Brand new discovery!')
      setName('')
      setDescription('')
      setSafe(false)
    } catch (err) {
      setError('Save failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      {/* lat/lng fill in when you click the map, and can be typed for keyboard users */}
      <div className="flex flex-wrap gap-2 text-sm">
        <label>
          Lat{' '}
          <input
            type="number"
            step="any"
            value={picked?.lat ?? ''}
            onChange={(e) => onPick(Number(e.target.value), picked?.lng ?? 0)}
            className="w-24 rounded-md border bg-background p-1"
          />
        </label>
        <label>
          Lng{' '}
          <input
            type="number"
            step="any"
            value={picked?.lng ?? ''}
            onChange={(e) => onPick(picked?.lat ?? 0, Number(e.target.value))}
            className="w-24 rounded-md border bg-background p-1"
          />
        </label>
      </div>

      <div>
        <label htmlFor="poi-name" className="block text-sm">Name</label>
        <input
          id="poi-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Crater rim cave"
          className="w-full rounded-md border bg-background p-2"
        />
      </div>

      <div>
        <label htmlFor="poi-type" className="block text-sm">Type</label>
        <select
          id="poi-type"
          value={type}
          onChange={(e) => setType(e.target.value as PoiType)}
          className="rounded-md border bg-background p-2"
        >
          {POI_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="poi-description" className="block text-sm">Description</label>
        <textarea
          id="poi-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={280}
          className="w-full resize-y rounded-md border bg-background p-2"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} />
        Safe
      </label>

      <button
        type="submit"
        disabled={!ready}
        className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
      >
        Add point of interest
      </button>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  )
}
