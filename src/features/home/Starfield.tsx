// Pixel starfield behind the welcome page. No image: each star is a tiny square <span> placed by code.
// Positions come from a seeded random generator, so they are the same on every load (and in the
// prerendered HTML). Some stars twinkle; the twinkle stops under Settings → Reduce motion.
import { seededRandom } from '../aliens/alienLang'

const COLORS = ['var(--color-foreground)', 'var(--color-foreground)', 'var(--color-foreground)', 'var(--color-primary)', '#7dd3fc']

const random = seededRandom(2026)
const STARS = Array.from({ length: 140 }, (_, i) => ({
  id: i,
  left: random() * 100, // percent across the screen
  top: random() * 100, // percent down the screen
  size: [2, 2, 2, 3, 4][Math.floor(random() * 5)], // pixels; most stars are tiny
  color: COLORS[Math.floor(random() * COLORS.length)],
  opacity: 0.35 + random() * 0.65,
  twinkle: random() < 0.3,
  delay: random() * 3, // seconds, so they don't all blink together
}))

export default function Starfield() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {STARS.map((s) => (
        <span
          key={s.id}
          className={s.twinkle ? 'twinkle absolute' : 'absolute'}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: s.color,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
