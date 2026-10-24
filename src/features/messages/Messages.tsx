// Direct messages. Message anyone by @username, or an AI operator (@hab-os, @capcom, ...).
// Messages travel at light speed between your home planet and theirs, so a DM to Mars arrives
// minutes later and shows a countdown until it lands. Operators answer with DeepSpace AI (src/cron.ts).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutations, useQuery } from 'deepspace'
import { BODY_LABELS, formatCountdown, formatDelay, lightDelaySeconds, type Body } from '../../lib/space'
import ProfileEditor from '../social/ProfileEditor'
import UserAvatar from '../social/UserAvatar'
import { OPERATORS, findOperator, isOperatorId } from '../social/operators'
import { useMyProfile, useProfiles, type Profiles } from '../social/profiles'
import { SignInPrompt } from '../social/SignIn'

type Dm = {
  toId: string
  participants: string[]
  content: string
  fromBody?: Body
  toBody?: Body
  deliverAt: number
  speed?: number
  wantsReply?: number
  isOperator?: number | boolean
  fromId?: string
}
type DmRecord = { recordId: string; data: Dm; createdBy: string; createdAt: string }

type Contact = {
  id: string // user id or operator id
  name: string
  handle: string
  body: Body
  avatarKey?: string
  accent?: string
  emoji?: string
  isOperator: boolean
  subtitle: string
}

const SPEEDS = [
  { value: 1, label: 'Real time' },
  { value: 10, label: '10× (demo)' },
  { value: 60, label: '60× (demo)' },
]

/** Re-renders every second so countdowns tick. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function partnerFor(r: DmRecord, myId: string | null): string {
  if (r.createdBy === myId) return r.data.toId
  return r.data.isOperator ? r.data.fromId ?? '' : r.createdBy
}

function contactFor(id: string, profiles: Profiles): Contact | null {
  const op = findOperator(id)
  if (op) {
    return { id: op.id, name: op.name, handle: op.handle, body: op.body, accent: op.accent, emoji: '◎', isOperator: true, subtitle: `AI operator · ${op.place}` }
  }
  const p = profiles.byUserId.get(id)
  if (!p) return null
  const body = p.homeBody ?? 'earth'
  return { id, name: p.displayName || p.username, handle: p.username, body, avatarKey: p.avatarKey, accent: p.accent, isOperator: false, subtitle: `Lives on ${BODY_LABELS[body]}` }
}

export default function Messages() {
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const { profile: me, isSignedIn, loading } = useMyProfile()
  const profiles = useProfiles()
  const { records, status } = useQuery<Dm>('dms', { orderBy: 'createdAt', orderDir: 'desc', limit: 500 })
  const { ready, create } = useMutations<Dm>('dms')

  const [text, setText] = useState('')
  const [speed, setSpeed] = useState(1)
  const [lookup, setLookup] = useState('')
  const [error, setError] = useState('')

  const myId = me?.userId ?? null
  const dms = records as DmRecord[]

  // Who each message is with, from my point of view.
  const partnerOf = (r: DmRecord) => partnerFor(r, myId)

  // Latest message per conversation (dms arrive newest-first).
  const conversations = useMemo(() => {
    const latest = new Map<string, DmRecord>()
    for (const r of dms) {
      const id = partnerFor(r, myId)
      if (id && !latest.has(id)) latest.set(id, r)
    }
    return latest
  }, [dms, myId])

  // Selected conversation comes from the URL: /messages?to=username (or an operator handle).
  const to = params.get('to') ?? ''
  const selectedId = findOperator(to)?.id ?? profiles.byUsername.get(to)?.userId ?? null
  const contact = selectedId ? contactFor(selectedId, profiles) : null

  const thread = selectedId
    ? dms.filter((r) => partnerOf(r) === selectedId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : []

  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [thread.length, selectedId])

  if (!isSignedIn) return <SignInPrompt action="send and read direct messages" />
  if (loading) return <p className="text-muted-foreground">Loading...</p>
  if (!me) return <ProfileEditor existing={null} />

  const myBody: Body = me.homeBody ?? 'earth'

  function openConversation(handle: string) {
    setParams({ to: handle })
    setError('')
  }

  function onLookup(e: React.FormEvent) {
    e.preventDefault()
    const handle = lookup.trim().replace(/^@/, '').toLowerCase()
    if (!handle) return
    if (handle === me?.username) return setError("That's you.")
    if (!findOperator(handle) && !profiles.byUsername.get(handle)) return setError(`No colonist named @${handle}.`)
    setLookup('')
    openConversation(handle)
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    if (!contact || !text.trim() || !ready) return
    const sentAt = Date.now()
    const delayMs = (lightDelaySeconds(myBody, contact.body, sentAt) * 1000) / speed
    try {
      await create({
        toId: contact.id,
        participants: [contact.id], // the recipient can read it; the server already lets me read my own
        content: text.trim(),
        fromBody: myBody,
        toBody: contact.body,
        deliverAt: Math.round(sentAt + delayMs),
        speed,
        wantsReply: contact.isOperator ? 1 : 0,
      })
      setText('')
      setError('')
    } catch (err) {
      setError('Send failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const peopleIds = [...conversations.keys()].filter((id) => !isOperatorId(id))
  const listItem = (c: Contact, preview?: string) => {
    const active = c.id === selectedId
    return (
      <li key={c.id}>
        <button
          type="button"
          onClick={() => openConversation(c.handle)}
          aria-current={active ? 'true' : undefined}
          className={`flex w-full items-center gap-3 rounded-lg p-2 text-left ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          <UserAvatar name={c.name} avatarKey={c.avatarKey} accent={c.accent} emoji={c.emoji} size={36} />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{c.name}</span>
            <span className="block truncate text-xs opacity-80">{preview ?? `@${c.handle}`}</span>
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Conversation list */}
      <aside className="space-y-3 md:w-72">
        <form onSubmit={onLookup} className="flex gap-2">
          <label htmlFor="dm-lookup" className="sr-only">Message a username</label>
          <input
            id="dm-lookup"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="@username"
            className="min-w-0 flex-1 rounded-md border bg-background p-2 text-sm"
          />
          <button type="submit" className="rounded-md border px-3 text-sm">New</button>
        </form>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <nav aria-label="Conversations">
          <h2 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Colony operators (AI)</h2>
          <ul className="space-y-1">{OPERATORS.map((o) => listItem(contactFor(o.id, profiles)!))}</ul>

          <h2 className="mb-1 mt-4 text-xs font-semibold uppercase text-muted-foreground">People</h2>
          {peopleIds.length === 0 && <p className="text-sm text-muted-foreground">No conversations yet. Type a @username above.</p>}
          <ul className="space-y-1">
            {peopleIds.map((id) => {
              const c = contactFor(id, profiles)
              const last = conversations.get(id)
              return c ? listItem(c, last && now >= last.data.deliverAt ? last.data.content : 'Signal in transit...') : null
            })}
          </ul>
        </nav>
      </aside>

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col rounded-lg border bg-card">
        {!contact ? (
          <p className="p-6 text-muted-foreground">Pick a conversation, or start one with a @username.</p>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b p-3">
              <UserAvatar name={contact.name} avatarKey={contact.avatarKey} accent={contact.accent} emoji={contact.emoji} size={40} />
              <div className="min-w-0">
                <h2 className="font-bold">
                  {contact.isOperator ? contact.name : <Link to={`/u/${contact.handle}`} className="hover:underline">{contact.name}</Link>}{' '}
                  <span className="font-normal text-muted-foreground">@{contact.handle}</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {contact.subtitle} · from {BODY_LABELS[myBody]}, your signal takes{' '}
                  <strong>{formatDelay(lightDelaySeconds(myBody, contact.body, now))}</strong>
                </p>
              </div>
            </header>

            <div className="max-h-[60vh] min-h-64 space-y-2 overflow-y-auto p-3" aria-live="polite">
              {status === 'loading' && <p className="text-muted-foreground">Tuning antenna...</p>}
              {status === 'ready' && thread.length === 0 && (
                <p className="text-muted-foreground">
                  {contact.isOperator ? `Say hello to ${contact.name}. It answers every message.` : 'No messages yet.'}
                </p>
              )}

              {thread.map((r) => {
                const m = r.data
                const mine = r.createdBy === myId
                const inTransit = now < m.deliverAt
                const sentAt = new Date(r.createdAt).getTime()
                const progress = Math.min(100, Math.max(0, ((now - sentAt) / Math.max(1, m.deliverAt - sentAt)) * 100))
                return (
                  <div key={r.recordId} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 ${inTransit ? 'border border-dashed' : mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                    >
                      {inTransit ? (
                        <>
                          <p className="text-sm italic">{mine ? m.content : 'Incoming signal...'}</p>
                          <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Signal travel progress" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="mt-1 text-xs opacity-80">
                            {mine ? 'In transit' : `From ${BODY_LABELS[m.fromBody ?? 'earth']}`} · arrives in{' '}
                            <span className="font-mono">{formatCountdown(m.deliverAt - now)}</span>
                            {m.speed && m.speed > 1 ? ` · ${m.speed}× demo` : ''}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {mine ? 'Delivered' : 'Received'} {new Date(m.deliverAt).toLocaleTimeString()}
                          </p>
                          {mine && contact.isOperator && m.wantsReply === 1 && (
                            <p className="mt-1 text-xs italic opacity-80">{contact.name} is composing a reply...</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={onSend} className="space-y-2 border-t p-3">
              <div className="flex gap-2">
                <label htmlFor="dm-text" className="sr-only">Message</label>
                <input
                  id="dm-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={500}
                  placeholder={`Message @${contact.handle}...`}
                  className="min-w-0 flex-1 rounded-md border bg-background p-2"
                />
                <button type="submit" disabled={!ready || !text.trim()} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">
                  Send
                </button>
              </div>
              <label className="text-sm">
                Speed{' '}
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-md border bg-background p-1">
                  {SPEEDS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
