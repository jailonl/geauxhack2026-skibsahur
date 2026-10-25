// The map: a lat/lng grid with one dot per POI. Clicking the map picks a spot (like typing lat,lon in my Java).
// x = lng + 180 (0..360), y = 90 - lat (0..180), so the top-left corner is (90, -180).
import type { MapBody, PoiType, PointOfInterest } from './types'
import type { Landmark } from './landmarks'


const DOT_COLORS: Record<PoiType, string> = {
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

type Props = {
  body: MapBody
  tint?: string // the tab's color, laid lightly over the terrain
  landmarks?: Landmark[]
  pois: { recordId: string; data: PointOfInterest }[]
  picked: { lat: number; lng: number } | null
  onPick: (lat: number, lng: number) => void
}

export default function MapView({ body, tint, landmarks = [], pois, picked, onPick }: Props) {
  const trek = TREK[body]

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const lng = ((e.clientX - rect.left) / rect.width) * 360 - 180
    const lat = 90 - ((e.clientY - rect.top) / rect.height) * 180
    onPick(Math.round(lat * 100) / 100, Math.round(lng * 100) / 100)
  }

  return (
    <svg
      viewBox="0 0 360 180"
      onClick={onClick}
      role="img"
      aria-label="Map of points of interest. Click to pick a spot, or type coordinates in the form."
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

      {/* built-in landmarks: small gray diamonds with a label, under the colonist POIs */}
      {landmarks.map((l) => {
        const x = l.lng + 180
        const y = 90 - l.lat
        return (
          <g key={l.name}>
            <polygon points={`${x},${y - 3} ${x + 3},${y} ${x},${y + 3} ${x - 3},${y}`} fill="#d4d4d8" stroke="black" strokeWidth={0.5} />
            <text
              x={x > 300 ? x - 4 : x + 4}
              y={y > 170 ? y - 4 : y + 1.5}
              textAnchor={x > 300 ? 'end' : 'start'}
              fontSize={4}
              fill="white"
              stroke="black"
              strokeWidth={0.2}
            >
              {l.name}
            </text>
            <title>{`${l.name}: ${l.note}`}</title>
          </g>
        )
      })}

      {pois.map(({ recordId, data: p }) => (
        <circle
          key={recordId}
          cx={p.lng + 180}
          cy={90 - p.lat}
          r={3}
          fill={DOT_COLORS[p.type] ?? DOT_COLORS.unknown}
          stroke="white"
          strokeWidth={0.8}
        >
          <title>{`${p.name} (${p.type})${p.description ? ': ' + p.description : ''}`}</title>
        </circle>
      ))}

      {/* where the user just clicked */}
      {picked && (
        <circle cx={picked.lng + 180} cy={90 - picked.lat} r={4} fill="none" stroke="white" strokeWidth={1} />
      )}
    </svg>
  )
}
