// The map: a lat/lng grid with one dot per POI. Clicking the map picks a spot (like typing lat,lon in my Java).
// Clicking a POI or landmark instead opens its details card.
// x = lng + 180 (0..360), y = 90 - lat (0..180), so the top-left corner is (90, -180).
import { useEffect, type ReactNode } from 'react'
import type { MapBody, PoiType, PointOfInterest } from './types'
import type { Landmark } from './landmarks'

export const DOT_COLORS: Record<PoiType, string> = {
  colony: '#3b82f6',
  hazard: '#ef4444',
  resource: '#22c55e',
  unknown: '#f59e0b',
}

// Real terrain from NASA Solar System Treks. Zoom level 1 is 4 x 2 tiles covering the whole globe,
// so each tile is 90 x 90 in our 360 x 180 map. Station has no surface, so it keeps the plain grid.
const TREK_BASE = 'https://trek.nasa.gov/tiles'
export const TREK: Partial<Record<MapBody, { layer: string; ext: 'jpg' | 'png'; credit: string }>> = {
  moon: { layer: 'Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02', ext: 'jpg', credit: 'LRO' },
  mars: { layer: 'Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m', ext: 'jpg', credit: 'Viking' },
  europa: { layer: 'Europa/EQ/Europa_Voyager_GalileoSSI_global_mosaic_500m', ext: 'png', credit: 'Voyager and Galileo' },
  titan: { layer: 'Titan/EQ/Titan_ISS_P19658_Mosaic_Global_4km', ext: 'png', credit: 'Cassini' },
  ceres: { layer: 'Ceres/EQ/Ceres_Dawn_FC_DLR_global_59ppd_Feb2016', ext: 'jpg', credit: 'Dawn' },
  ganymede: { layer: 'Ganymede/EQ/Ganymede_Voyager_GalileoSSI_Global_ClrMosaic_1435m', ext: 'png', credit: 'Voyager and Galileo' },
}
const TILES = [0, 1].flatMap((row) => [0, 1, 2, 3].map((col) => ({ row, col })))

// Landmark ids are prefixed so they can't clash with POI record ids.
export const landmarkId = (l: Landmark) => `landmark:${l.name}`

type Props = {
  body: MapBody
  tint?: string // the tab's color, laid lightly over the terrain
  landmarks?: Landmark[]
  pois: { recordId: string; data: PointOfInterest }[]
  picked: { lat: number; lng: number } | null
  onPick: (lat: number, lng: number) => void
  selectedId: string | null // the POI recordId or landmarkId whose card is open
  onSelect: (id: string | null) => void
  details?: ReactNode // card content for the selected item, built by the page
}

export default function MapView({ body, tint, landmarks = [], pois, picked, onPick, selectedId, onSelect, details }: Props) {
  const trek = TREK[body]

  // Esc closes the card.
  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onSelect(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, onSelect])

  // Clicking empty map picks a new spot and closes any open card.
  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const lng = ((e.clientX - rect.left) / rect.width) * 360 - 180
    const lat = 90 - ((e.clientY - rect.top) / rect.height) * 180
    onSelect(null)
    onPick(Math.round(lat * 100) / 100, Math.round(lng * 100) / 100)
  }

  // Markers open their card on click, Enter, or Space, without picking a new spot underneath.
  function markerProps(id: string, label: string) {
    return {
      role: 'button',
      tabIndex: 0,
      'aria-label': label,
      className: 'cursor-pointer outline-none',
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        onSelect(id)
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(id)
        }
      },
    }
  }

  // Where to anchor the card: the selected POI or landmark, in map units.
  const selectedPoi = pois.find((r) => r.recordId === selectedId)?.data
  const selectedLandmark = landmarks.find((l) => landmarkId(l) === selectedId)
  const anchor = selectedPoi ?? selectedLandmark
  const ax = anchor ? anchor.lng + 180 : 0
  const ay = anchor ? 90 - anchor.lat : 0

  return (
    <div className="relative">
      <svg
        viewBox="0 0 360 180"
        onClick={onClick}
        role="group"
        aria-label="Map of points of interest. Click empty space to pick a spot, or a marker to see its details."
        className="w-full cursor-crosshair rounded-lg border bg-muted"
      >
        {/* terrain first so everything else draws on top of it */}
        {trek && (
          <>
            {TILES.map(({ row, col }) => (
              <image
                key={`${row}-${col}`}
                href={`${TREK_BASE}/${trek.layer}/1.0.0/default/default028mm/1/${row}/${col}.${trek.ext}`}
                x={col * 90}
                y={row * 90}
                width={90}
                height={90}
                preserveAspectRatio="none"
              />
            ))}
            {/* darken so the dots stand out, then a light wash of the tab's color */}
            <rect width={360} height={180} fill="black" fillOpacity={0.3} />
            {tint && <rect width={360} height={180} fill={tint} fillOpacity={0.12} />}
          </>
        )}

        {/* grid lines every 30 degrees */}
        {[30, 60, 90, 120, 150].map((y) => (
          <line key={`y${y}`} x1={0} y1={y} x2={360} y2={y} stroke="white" strokeOpacity={trek ? 0.15 : 0.1} strokeWidth={0.5} />
        ))}
        {[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((x) => (
          <line key={`x${x}`} x1={x} y1={0} x2={x} y2={180} stroke="white" strokeOpacity={trek ? 0.15 : 0.1} strokeWidth={0.5} />
        ))}

        {/* built-in landmarks: gray diamonds with a label, under the colonist POIs */}
        {landmarks.map((l) => {
          const x = l.lng + 180
          const y = 90 - l.lat
          const id = landmarkId(l)
          const flip = x > 250 // label on the left near the right edge
          return (
            <g key={id} {...markerProps(id, `Landmark: ${l.name}`)}>
              <polygon
                points={`${x},${y - 5} ${x + 5},${y} ${x},${y + 5} ${x - 5},${y}`}
                fill="#e4e4e7"
                stroke={id === selectedId ? 'white' : 'black'}
                strokeWidth={id === selectedId ? 1.5 : 0.8}
              />
              <text
                x={flip ? x - 7 : x + 7}
                y={y > 170 ? y - 7 : y + 2.5}
                textAnchor={flip ? 'end' : 'start'}
                fontSize={7}
                fontWeight={600}
                fill="white"
                stroke="black"
                strokeWidth={1.2}
                paintOrder="stroke"
              >
                {l.name}
              </text>
            </g>
          )
        })}

        {pois.map(({ recordId, data: p }) => {
          const x = p.lng + 180
          const y = 90 - p.lat
          return (
            <g key={recordId} {...markerProps(recordId, `${p.type}: ${p.name}`)}>
              {/* bigger invisible circle so small dots are easy to click */}
              <circle cx={x} cy={y} r={8} fill="transparent" />
              {recordId === selectedId && <circle cx={x} cy={y} r={7} fill="none" stroke="white" strokeWidth={1.2} />}
              <circle cx={x} cy={y} r={4} fill={DOT_COLORS[p.type] ?? DOT_COLORS.unknown} stroke="white" strokeWidth={0.8} />
            </g>
          )
        })}

        {/* where the user just clicked */}
        {picked && (
          <circle cx={picked.lng + 180} cy={90 - picked.lat} r={4} fill="none" stroke="white" strokeWidth={1} />
        )}
      </svg>

      {/* details card, placed next to the marker and flipped so it stays over the map */}
      {anchor && details && (
        <div
          className="absolute z-10 w-64 max-w-[80%]"
          style={{
            left: `${(ax / 360) * 100}%`,
            top: `${(ay / 180) * 100}%`,
            transform: `translate(${ax > 180 ? 'calc(-100% - 14px)' : '14px'}, ${ay > 90 ? 'calc(-100% + 10px)' : '-10px'})`,
          }}
        >
          {details}
        </div>
      )}
    </div>
  )
}
