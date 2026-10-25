// 8-bit heart that shows a vital's level, like the health bar in an old game:
//   full heart  = good, half heart = warning, empty heart (blinking) = danger.
// The shape tells the level on its own (not only the color), and screen readers get the word.
// Drawn from the 9×8 grid below as square SVG pixels, no image files.
import { cn } from '../../lib/utils'
import type { Level } from './types'

// O = outline, F = inside of the heart, H = shine pixel, . = empty
const GRID = [
  '.OOO.OOO.',
  'OHFFOFFFO',
  'OFFFFFFFO',
  'OFFFFFFFO',
  '.OFFFFFO.',
  '..OFFFO..',
  '...OFO...',
  '....O....',
]

export const LEVEL_TEXT: Record<Level, string> = { ok: 'Good', caution: 'Warning', danger: 'Danger' }

const FILL: Record<Level, string> = { ok: '#34d399', caution: '#fbbf24', danger: '#ef4444' }

export default function PixelHeart({ level, size = 2, showLabel = false, className }: {
  level: Level
  size?: number // screen pixels per heart pixel (2 = 18×16)
  showLabel?: boolean // show the word next to the heart
  className?: string
}) {
  const pixels: { x: number; y: number; color: string }[] = []
  GRID.forEach((row, y) => {
    ;[...row].forEach((cell, x) => {
      if (cell === '.') return
      if (cell === 'O') {
        // Danger draws the outline in red so the empty heart still stands out.
        pixels.push({ x, y, color: level === 'danger' ? FILL.danger : 'currentColor' })
        return
      }
      const filled = level === 'ok' || (level === 'caution' && x <= 4) // half heart: left side only
      if (!filled) return
      pixels.push({ x, y, color: cell === 'H' ? '#ffffff' : FILL[level] })
    })
  })

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={LEVEL_TEXT[level]}>
      <svg
        aria-hidden
        width={9 * size}
        height={8 * size}
        viewBox="0 0 9 8"
        shapeRendering="crispEdges"
        className={cn('shrink-0 text-foreground', level === 'danger' && 'heart-blink')}
      >
        {pixels.map((p) => (
          <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1" height="1" fill={p.color} />
        ))}
      </svg>
      <span className={showLabel ? 'font-display text-[10px] uppercase tracking-wider' : 'sr-only'}>
        {LEVEL_TEXT[level]}
      </span>
    </span>
  )
}
