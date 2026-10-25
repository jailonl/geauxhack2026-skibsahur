// Pop-up shown right after you save a reading: the survival rating first, and "More info" opens the
// full output (every number with its own heart and reason). Uses the app's Modal, so it traps focus
// and closes on Escape.
import { Button, Modal } from '@/components/ui'
import { checkReading, survivalRating } from './limits'
import SurvivalRating from './SurvivalRating'
import type { Vitals } from './types'

export default function ReadingResult({ reading, onClose, onLogAnother, onShare }: {
  reading: Vitals | null // null = closed
  onClose: () => void
  onLogAnother: () => void
  onShare: () => void // opens the Share pop-up for this reading
}) {
  const survival = survivalRating(reading ? checkReading(reading) : [])

  return (
    <Modal open={reading != null} onClose={onClose} size="sm">
      <Modal.Header>
        <Modal.Title className="font-display text-base uppercase tracking-wider text-primary">Reading saved</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {reading && <SurvivalRating survival={survival} note={reading.note} />}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" onClick={onLogAnother}>Log another</Button>
        <Button variant="outline" onClick={onShare}>Share</Button>
        <Button onClick={onClose}>Done</Button>
      </Modal.Footer>
    </Modal>
  )
}
