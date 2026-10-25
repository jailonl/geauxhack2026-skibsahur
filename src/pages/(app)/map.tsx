// "/map" page. Same flow as my Java PoiForm: pick a tab (planet), click the map (lat/lng), fill the form.
// It's in (app), not (protected), so guests can view the map; adding needs sign-in (see poi-schema.ts).
import { useState } from 'react'
import { useAuth, useMutations, useQuery, useUser } from 'deepspace'
import type { MapBody, PointOfInterest } from '../../features/map/types'
import { findForum } from '../../features/forums/forums'
import { MAP_BODIES, formatCoords, isOnMap } from '../../features/map/poi-logic'
import MapView, { DOT_COLORS, TREK, landmarkId } from '../../features/map/MapView'
import PoiForm from '../../features/map/PoiForm'
import { useSearchParams } from 'react-router-dom'
import { LANDMARKS } from '../../features/map/landmarks'

const BODY_LABELS: Record<string, string> = {
  moon: 'Moon',
  mars: 'Mars',
  station: 'Station',
  europa: 'Europa',
  titan: 'Titan',
  ceres: 'Ceres',
  ganymede: 'Ganymede',
}

export default function MapPage() {
  const [params] = useSearchParams()
  const linkBody = params.get('body') as MapBody
  const linkLat = Number(params.get('lat'))
  const linkLng = Number(params.get('lng'))
  const fromLink = MAP_BODIES.includes(linkBody) && params.has('lat') && params.has('lng') && isOnMap(linkLat, linkLng)

  const [body, setBody] = useState<MapBody>(fromLink ? linkBody : 'mars')
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
    fromLink ? { lat: linkLat, lng: linkLng } : null,
  )
  const [selectedId, setSelectedId] = useState<string | null>(null) // POI or landmark whose card is open

  // Live: new POIs from anyone show up without a refresh.
  const { records, status, error } = useQuery<PointOfInterest>('pois', { where: { body } })

  // Same rule as the feed: you can remove your own POIs, admins can remove any (see poi-schema.ts).
  const { ready, remove } = useMutations<PointOfInterest>('pois')
  const { userId } = useAuth()
  const { user } = useUser()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  async function onDelete(recordId: string, name: string) {
    if (!window.confirm(`Remove "${name}" from the map?`)) return
    try {
      await remove(recordId)
    } catch (err) {
      window.alert('Remove failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  function onTab(next: MapBody) {
    setBody(next)
    setPicked(null)
    setSelectedId(null)
  }

  const landmarks = LANDMARKS.filter((l) => l.body === body)

  // Card content for whatever marker is selected: a colonist POI or a built-in landmark.
  function renderDetails() {
    const poi = records.find((r) => r.recordId === selectedId)
    const landmark = landmarks.find((l) => landmarkId(l) === selectedId)
    if (!poi && !landmark) return null

    const close = (
      <button
        type="button"
        onClick={() => setSelectedId(null)}
        aria-label="Close details"
        className="rounded px-1 text-muted-foreground hover:text-foreground"
      >
        ✕
      </button>
    )

    if (landmark) {
      return (
        <div role="dialog" aria-label={landmark.name} className="rounded-xl border bg-card p-3 text-sm shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <strong className="text-base">{landmark.name}</strong>
            {close}
          </div>
          <p className="text-muted-foreground">Known landmark · {formatCoords(landmark.lat, landmark.lng)}</p>
          <p className="mt-1">{landmark.note}</p>
        </div>
      )
    }

    const { recordId, createdBy, data: p } = poi!
    const canDelete = ready && (isAdmin || (userId != null && createdBy === userId))
    return (
      <div role="dialog" aria-label={p.name} className="rounded-xl border bg-card p-3 text-sm shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <strong className="text-base">{p.name}</strong>
          {close}
        </div>
        <p className="flex items-center gap-1.5 capitalize">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: DOT_COLORS[p.type] }} />
          {p.type} · {p.safe ? 'Safe' : 'Not safe'}
        </p>
        <p className="text-muted-foreground">
          {formatCoords(p.lat, p.lng)} · {BODY_LABELS[p.body] ?? p.body}
        </p>
        {p.description && <p className="mt-1">{p.description}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{p.discovered ? 'Near an earlier find' : 'New discovery'}</p>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(recordId, p.name)}
            className="mt-2 text-sm text-destructive underline"
          >
            Remove
          </button>
        )}
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Points of Interest</h1>

      {/* Color comes from the matching forum, so the map and forums look the same. */}
      <div role="tablist" aria-label="Planet" className="flex flex-wrap gap-2">
        {MAP_BODIES.map((b) => {
          const forum = findForum(b)
          const selected = b === body
          return (
            <button
              key={b}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTab(b)}
              style={selected ? { backgroundColor: forum?.accent, borderColor: forum?.accent } : { borderColor: forum?.accent }}
              className={`rounded-md border px-3 py-1 ${selected ? 'font-semibold text-black' : 'bg-background'}`}
            >
              {BODY_LABELS[b]}
            </button>
          )
        })}
      </div>

      {status === 'error' && <p role="alert" className="text-destructive">Could not load the map: {error}</p>}

      <div>
        <MapView
          body={body}
          tint={findForum(body)?.accent}
          landmarks={landmarks}
          pois={records}
          picked={picked}
          onPick={(lat, lng) => setPicked({ lat, lng })}
          selectedId={selectedId}
          onSelect={setSelectedId}
          details={renderDetails()}
        />
        {TREK[body] && (
          <p className="mt-1 text-xs text-muted-foreground">
            Terrain: NASA Solar System Treks, {TREK[body]?.credit} imagery.
          </p>
        )}
      </div>

      <PoiForm
        body={body}
        picked={picked}
        onPick={(lat, lng) => setPicked({ lat, lng })}
        existing={records.map((r) => r.data)}
      />

      <section>
        <h2 className="mb-2 text-lg font-semibold">On {BODY_LABELS[body]}</h2>
        {records.length === 0 ? (
          <p className="text-muted-foreground">Nothing marked here yet.</p>
        ) : (
          <ul className="space-y-2">
            {records.map(({ recordId, createdBy, data: p }) => {
              const canDelete = ready && (isAdmin || (userId != null && createdBy === userId))
              return (
                <li key={recordId} className="rounded-lg border bg-card p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <strong>{p.name}</strong> · {p.type} · {p.lat.toFixed(2)}, {p.lng.toFixed(2)}
                      {' · '}{p.safe ? 'safe' : 'not safe'}{p.discovered ? ' · near earlier find' : ' · new discovery'}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(recordId, p.name)}
                        className="text-sm text-destructive underline"
                        aria-label={`Remove ${p.name}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {p.description && <p className="mt-1 text-muted-foreground">{p.description}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
