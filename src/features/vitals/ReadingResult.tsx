// Pop-up shown right after you save a reading: the overall heart, then every number you logged
// with its own heart and the reason in words. Uses the app's Modal, so it traps focus and closes on Escape.
import { Button, Modal } from '@/components/ui'
import { checkReading, worst } from './limits'
import PixelHeart from './PixelHeart'
import type { Vitals } from './types'

const HEADLINE = {
  ok: 'All good. Everything is in the normal range.',
  caution: 'Warning. Some readings need watching.',
  danger: 'Danger. Act on the red readings now.',
} as const

export default function ReadingResult({ reading, onClose, onLogAnother, onShare }: {
  reading: Vitals | null // null = closed
  onClose: () => void
  onLogAnother: () => void
  onShare: () => void // opens the Share pop-up for this reading
}) {
  const rows = reading ? checkReading(reading) : []
  const overall = worst(rows.map((r) => r.check.level))

  return (
    <Modal open={reading != null} onClose={onClose} size="sm">
      <Modal.Header>
        <Modal.Title className="font-display text-base uppercase tracking-wider text-primary">Reading saved</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div role="status" className="flex items-center gap-3">
          <PixelHeart level={overall} size={5} />
          <p className="font-bold">{HEADLINE[overall]}</p>
        </div>

        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-start gap-3 border-t border-border pt-2">
              <PixelHeart level={r.check.level} size={2} className="mt-1" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>{r.label}</span>
                  <span className="font-signal tabular-nums">{r.value}</span>
                </span>
                <span className="block text-xs text-muted-foreground">{r.check.reason}</span>
              </span>
            </li>
          ))}
        </ul>
        {reading?.note && <p className="mt-3 text-sm text-muted-foreground">Note: {reading.note}</p>}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" onClick={onLogAnother}>Log another</Button>
        <Button variant="outline" onClick={onShare}>Share</Button>
        <Button onClick={onClose}>Done</Button>
      </Modal.Footer>
    </Modal>
  )
}
