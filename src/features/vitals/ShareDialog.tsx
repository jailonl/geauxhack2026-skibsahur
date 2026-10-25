// "Share" pop-up: pick colonists (or an AI operator) and send them a reading as a direct message.
// The message travels with light-delay like any DM, so it lands in their Messages after the wait.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Modal } from '@/components/ui'
import { useMyProfile } from '../social/profiles'
import { BODY_LABELS, formatDelay } from '../../lib/space'
import { checkReading, worst } from './limits'
import PixelHeart from './PixelHeart'
import { shareMessage } from './sharing'
import type { Vitals } from './types'
import { useShareVitals, type ShareContact } from './useVitalsSharing'

export type ShareTarget = { reading: Vitals; takenAt: string | number }

export default function ShareDialog({ target, onClose }: { target: ShareTarget | null; onClose: () => void }) {
  const share = useShareVitals()
  const { profile: me } = useMyProfile()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<{ to: ShareContact[]; wait: number } | null>(null)
  const [error, setError] = useState('')

  function close() {
    setQuery('')
    setPicked(new Set())
    setSent(null)
    setError('')
    onClose()
  }

  function toggle(id: string) {
    setPicked((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const q = query.trim().replace(/^@/, '').toLowerCase()
  const shown = share.contacts.filter((c) => !q || c.handle.includes(q) || c.name.toLowerCase().includes(q))
  const level = target ? worst(checkReading(target.reading).map((r) => r.check.level)) : 'ok'

  async function onSend() {
    if (!target) return
    const to = share.contacts.filter((c) => picked.has(c.id))
    if (to.length === 0) return setError('Pick at least one person.')
    setError('')
    setSending(true)
    try {
      const wait = await share.send(target.reading, target.takenAt, to)
      setSent({ to, wait })
    } catch (err) {
      setError('Send failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={target != null} onClose={close} size="sm">
      <Modal.Header>
        <Modal.Title className="font-display text-base uppercase tracking-wider text-primary">Share reading</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {sent ? (
          <div role="status" className="space-y-2">
            <p className="font-bold">
              Sent to {sent.to.map((c) => `@${c.handle}`).join(', ')}.
            </p>
            <p className="text-sm text-muted-foreground">
              {sent.wait < 0.05 ? 'It arrives right away.' : `It's in transit and arrives in ${formatDelay(sent.wait)}${share.speed > 1 ? ` (${share.speed}× demo speed)` : ''}.`}
            </p>
            <Link to={`/messages?to=${sent.to[0].handle}`} className="font-signal inline-block text-primary hover:underline">
              [ Open in Messages ]
            </Link>
          </div>
        ) : !share.ready ? (
          <p className="text-sm text-muted-foreground">Set up your profile first to send messages.</p>
        ) : (
          <div className="space-y-3">
            {/* Preview of exactly what they'll get */}
            {target && (
              <details className="text-sm">
                <summary className="flex cursor-pointer items-center gap-2">
                  <PixelHeart level={level} /> Preview message
                </summary>
                <pre className="font-post mt-2 whitespace-pre-wrap border border-border bg-background p-2 text-xs">
                  {shareMessage(target.reading, { username: me?.username ?? 'you' }, target.takenAt)}
                </pre>
              </details>
            )}

            <label className="block text-sm">
              Send to
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search @username"
                className="mt-1 w-full border border-border bg-background p-2"
              />
            </label>

            <fieldset>
              <legend className="sr-only">People</legend>
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {shown.length === 0 && <li className="text-sm text-muted-foreground">No one matches.</li>}
                {shown.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 px-1 py-1 hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={picked.has(c.id)}
                        onChange={() => toggle(c.id)}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      <span className="min-w-0 flex-1 truncate">@{c.handle}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.isOperator ? 'AI operator · ' : ''}{BODY_LABELS[c.body]}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <p className="text-xs text-muted-foreground">
              Only the people you pick can read it. AI operators will answer in character.
            </p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {sent ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={onSend} disabled={!share.ready || sending || picked.size === 0}>
              {sending ? 'Sending…' : `Send${picked.size > 0 ? ` (${picked.size})` : ''}`}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  )
}
