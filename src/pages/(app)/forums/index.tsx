// "/forums" — every board, grouped (home worlds, outer colonies, lounges), plus the top threads right now.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthToken, useQuery, useUser } from 'deepspace'
import { CATEGORY_LABELS, FORUMS, findForum, useVotes, type ForumCategory, type Thread } from '../../../features/forums/forums'

const CATEGORIES: ForumCategory[] = ['worlds', 'colonies', 'lounges']

/** Admin-only: fill every forum with starter conversations from the bot colonists (no AI credits). */
function SeedButton() {
  const [state, setState] = useState<'idle' | 'working' | string>('idle')
  async function seed() {
    setState('working')
    try {
      const res = await fetch('/api/actions/seedForums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getAuthToken()}` },
        body: '{}',
      })
      const result = (await res.json()) as { success: boolean; error?: string; data?: { threads: number; comments: number } }
      setState(result.success ? `Added ${result.data?.threads ?? 0} threads and ${result.data?.comments ?? 0} comments.` : `Could not seed: ${result.error}`)
    } catch (err) {
      setState('Could not seed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button type="button" onClick={seed} disabled={state === 'working'} className="rounded-full border border-border px-4 py-1.5 font-bold hover:bg-accent disabled:opacity-50">
        {state === 'working' ? 'Seeding...' : 'Seed the forums'}
      </button>
      {state !== 'idle' && state !== 'working' && <span className="text-muted-foreground">{state}</span>}
    </div>
  )
}

export default function ForumsPage() {
  const { records } = useQuery<Thread>('threads', { orderBy: 'createdAt', orderDir: 'desc', limit: 2000 })
  const votes = useVotes()
  const { user } = useUser()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  // One pass: thread count and latest activity per forum.
  const counts = new Map<string, number>()
  for (const r of records) counts.set(r.data.forum, (counts.get(r.data.forum) ?? 0) + 1)

  // Trending: highest score among threads from the last 3 days.
  const cutoff = Date.now() - 3 * 86_400_000
  const trending = records
    .filter((r) => new Date(r.createdAt).getTime() > cutoff)
    .sort((a, b) => votes.score(b.recordId) - votes.score(a.recordId))
    .slice(0, 5)

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-3xl leading-none">Forums</h1>
          <p className="mt-1 text-sm text-muted-foreground">Longer conversations, one board per world and topic.</p>
        </div>
        {isAdmin && <SeedButton />}
      </header>

      {trending.length > 0 && (
        <section className="border-b border-border py-5">
          <h2 className="mb-2 font-display text-xl">Trending threads</h2>
          <ol className="space-y-2">
            {trending.map((t) => {
              const f = findForum(t.data.forum)
              return (
                <li key={t.recordId}>
                  <Link to={`/thread/${t.recordId}`} className="group flex items-baseline gap-3">
                    <span className="w-8 shrink-0 text-right font-bold tabular-nums text-primary">{votes.score(t.recordId)}</span>
                    <span className="min-w-0">
                      <span className="block truncate group-hover:underline">{t.data.title}</span>
                      {f && <span className="text-sm" style={{ color: f.accent }}>{f.name}</span>}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {CATEGORIES.map((c) => (
        <section key={c} className="border-b border-border py-5">
          <h2 className="font-display text-xl">{CATEGORY_LABELS[c].title}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{CATEGORY_LABELS[c].blurb}</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {FORUMS.filter((f) => f.category === c).map((f) => {
              const n = counts.get(f.slug) ?? 0
              return (
                <li key={f.slug}>
                  <Link to={`/forums/${f.slug}`} className="flex gap-3 rounded-xl p-2.5 hover:bg-accent/50">
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                      style={{ background: `${f.accent}26`, color: f.accent, boxShadow: `inset 0 0 0 1.5px ${f.accent}` }}
                    >
                      {f.glyph}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold">{f.name}</span>
                      <span className="line-clamp-2 block text-sm text-muted-foreground">{f.tagline}</span>
                      <span className="text-xs text-muted-foreground">{n} {n === 1 ? 'thread' : 'threads'}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
