// Colony chat with real light-delay.
// You pick where you're transmitting from. Messages to a channel on another planet are stored with an
// arrival time (deliverAt) and show as "signal in transit" with a countdown until the light reaches it.
// Each channel's AI operator (DeepSpace AI) answers every message once it arrives; the reply then travels
// back, so it shows up after the full round-trip delay. Replies come from the scheduled job in src/cron.ts.
import { useEffect, useRef, useState } from 'react'
import { useAuth, useMutations, useQuery, useUser } from 'deepspace'
import { BODY_LABELS, formatCountdown, formatDelay, lightDelaySeconds, type Body } from '../../lib/space'
import { CHANNELS, type ChannelId } from './channels'

type Transmission = {
  channel: ChannelId
  content: string
  authorName?: string
  fromBody: Body
  deliverAt: number
  speed?: number
  isOperator?: boolean | number // set by the server on AI operator replies
  wantsReply?: number // 1 = waiting for the operator to answer
}

const SPEEDS = [
  { value: 1, label: 'Real time' },
  { value: 10, label: '10× (demo)' },
  { value: 60, label: '60× (demo)' },
]

// Per-browser preferences, wrapped in try/catch because storage can be blocked.
function load(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/** Re-renders every second so countdowns tick. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export default function Chat() {
  const now = useNow()
  const { isSignedIn, userId } = useAuth()
  const { user } = useUser()

  const [channelId, setChannelId] = useState<ChannelId>('mars-jezero')
  const [myBody, setMyBody] = useState<Body>(() => load('chatBody', 'earth') as Body)
  const [speed, setSpeed] = useState(1)
  const [guestName, setGuestName] = useState(() => load('guestName', ''))
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const channel = CHANNELS.find((c) => c.id === channelId) ?? CHANNELS[0]
  const oneWaySeconds = lightDelaySeconds(myBody, channel.body, now)

  const { records, status, error: loadError } = useQuery<Transmission>('transmissions', {
    where: { channel: channelId },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 100,
  })
  const { ready, create } = useMutations<Transmission>('transmissions')
  const messages = [...records].reverse() // oldest at top, newest at bottom

  // Keep the newest message in view.
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length, channelId])

  function onChangeBody(body: Body) {
    setMyBody(body)
    save('chatBody', body)
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !ready) return
    if (!isSignedIn && !guestName.trim()) {
      setError('Enter a display name to chat as a guest.')
      return
    }
    setError('')

    const sentAt = Date.now()
    const delayMs = (lightDelaySeconds(myBody, channel.body, sentAt) * 1000) / speed
    const authorName = isSignedIn ? user?.name ?? 'Unknown colonist' : guestName.trim() + ' (guest)'
    if (!isSignedIn) save('guestName', guestName.trim())

    const deliverAt = Math.round(sentAt + delayMs)
    try {
      await create({
        channel: channelId,
        content: text.trim(),
        authorName,
        fromBody: myBody,
        deliverAt,
        speed,
        wantsReply: 1, // the channel's AI operator will answer once this arrives
      })
      setText('')
      setNotice(`${channel.operator} will answer once your signal arrives, and the reply has to travel back.`)
    } catch (err) {
      setError('Send failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Channel list */}
      <nav aria-label="Colony channels" className="flex gap-2 overflow-x-auto md:w-56 md:flex-col">
        {CHANNELS.map((c) => {
          const delay = lightDelaySeconds(myBody, c.body, now)
          const active = c.id === channelId
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setChannelId(c.id)}
              aria-current={active ? 'true' : undefined}
              className={
                active
                  ? 'shrink-0 rounded-lg bg-primary px-3 py-2 text-left text-primary-foreground'
                  : 'shrink-0 rounded-lg border px-3 py-2 text-left'
              }
            >
              <span className="block font-semibold">{c.name}</span>
              <span className="block text-xs opacity-80">
                {BODY_LABELS[c.body]} · {formatDelay(delay)}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col rounded-lg border bg-card">
        <header className="border-b p-3">
          <h2 className="font-bold">
            {channel.name} <span className="font-normal text-muted-foreground">· {BODY_LABELS[channel.body]}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            From {BODY_LABELS[myBody]}, your signal takes <strong>{formatDelay(oneWaySeconds)}</strong> to arrive
            {oneWaySeconds > 60 ? ` (${formatDelay(oneWaySeconds * 2)} for a reply to come back).` : '.'}
          </p>
        </header>

        <div className="max-h-[60vh] min-h-64 space-y-2 overflow-y-auto p-3" aria-live="polite">
          {status === 'loading' && <p className="text-muted-foreground">Tuning antenna...</p>}
          {status === 'error' && <p role="alert" className="text-destructive">Could not load channel: {loadError}</p>}
          {status === 'ready' && messages.length === 0 && (
            <p className="text-muted-foreground">No transmissions on this channel yet.</p>
          )}

          {messages.map((r) => {
            const m = r.data
            const inTransit = now < m.deliverAt
            const isMine = userId != null && r.createdBy === userId
            const sentAt = new Date(r.createdAt).getTime()
            const total = Math.max(1, m.deliverAt - sentAt)
            const progress = Math.min(100, Math.max(0, ((now - sentAt) / total) * 100))

            return (
              <article key={r.recordId} className={inTransit ? 'rounded-md border border-dashed p-2' : 'rounded-md border p-2'}>
                <header className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span>
                    <strong>@{m.authorName ?? 'unknown'}</strong>{' '}
                    {m.isOperator ? (
                      <span className="rounded-full border px-2 py-px text-xs text-muted-foreground">AI OPERATOR</span>
                    ) : null}{' '}
                    <span className="text-muted-foreground">from {BODY_LABELS[m.fromBody]}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {inTransit ? (
                      <>
                        Arrives in <span className="font-mono">{formatCountdown(m.deliverAt - now)}</span>
                        {m.speed && m.speed > 1 ? ` · ${m.speed}× demo` : ''}
                      </>
                    ) : (
                      <time dateTime={new Date(m.deliverAt).toISOString()}>
                        Received {new Date(m.deliverAt).toLocaleTimeString()}
                      </time>
                    )}
                  </span>
                </header>

                {inTransit ? (
                  <>
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label="Signal travel progress"
                      aria-valuenow={Math.round(progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-sm italic text-muted-foreground">
                      {isMine ? `Sending: "${m.content}"` : 'Signal in transit...'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
                    {m.wantsReply === 1 && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        Received at {channel.name}. {channel.operator} is composing a reply...
                      </p>
                    )}
                  </>
                )}
              </article>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={onSend} className="space-y-2 border-t p-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label>
              Transmitting from{' '}
              <select value={myBody} onChange={(e) => onChangeBody(e.target.value as Body)} className="rounded-md border bg-background p-1">
                <option value="earth">Earth</option>
                <option value="moon">Moon</option>
                <option value="mars">Mars</option>
                <option value="station">Orbital Station</option>
              </select>
            </label>
            <label>
              Speed{' '}
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-md border bg-background p-1">
                {SPEEDS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            {!isSignedIn && (
              <label>
                Name{' '}
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  maxLength={30}
                  placeholder="Colonist_42"
                  className="w-32 rounded-md border bg-background p-1"
                />
              </label>
            )}
          </div>

          <div className="flex gap-2">
            <label htmlFor="chat-text" className="sr-only">Message</label>
            <input
              id="chat-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder={`Message ${channel.name}...`}
              className="min-w-0 flex-1 rounded-md border bg-background p-2"
            />
            <button
              type="submit"
              disabled={!ready || !text.trim()}
              className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
            >
              Transmit
            </button>
          </div>
          {notice && !error && <p className="text-sm text-muted-foreground">{notice}</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
      </section>
    </div>
  )
}
