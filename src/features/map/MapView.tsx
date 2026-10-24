// The map: a lat/lng grid with one dot per POI. Clicking the map picks a spot (like typing lat,lon in my Java).
// x = lng + 180 (0..360), y = 90 - lat (0..180), so the top-left corner is (90, -180).
import type { PoiType, PointOfInterest } from './types'

const DOT_COLORS: Record<PoiType, string> = {
  colony: '#3b82f6',
  hazard: '#ef4444',
  resource: '#22c55e',
  unknown: '#f59e0b',
}

type Props = {
  pois: { recordId: string; data: PointOfInterest }[]
  picked: { lat: number; lng: number } | null
  onPick: (lat: number, lng: number) => void
}

export default function MapView({ pois, picked, onPick }: Props) {
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
      {/* grid lines every 30 degrees */}
      {[30, 60, 90, 120, 150].map((y) => (
        <line key={`y${y}`} x1={0} y1={y} x2={360} y2={y} stroke="currentColor" strokeOpacity={0.1} strokeWidth={0.5} />
      ))}
      {[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((x) => (
        <line key={`x${x}`} x1={x} y1={0} x2={x} y2={180} stroke="currentColor" strokeOpacity={0.1} strokeWidth={0.5} />
      ))}

      {pois.map(({ recordId, data: p }) => (
        <circle key={recordId} cx={p.lng + 180} cy={90 - p.lat} r={3} fill={DOT_COLORS[p.type] ?? DOT_COLORS.unknown}>
          <title>{`${p.name} (${p.type})${p.description ? ': ' + p.description : ''}`}</title>
        </circle>
      ))}

      {/* where the user just clicked */}
      {picked && (
        <circle cx={picked.lng + 180} cy={90 - picked.lat} r={4} fill="none" stroke="currentColor" strokeWidth={1} />
      )}
    </svg>
  )
}
