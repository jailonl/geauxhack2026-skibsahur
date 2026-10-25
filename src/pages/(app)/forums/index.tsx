// "/forums" — every board that has threads, grouped into collapsible sections (home worlds, outer colonies, lounges) like a
// Moodle course page, plus the top threads right now.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthToken, useUser } from 'deepspace'
import { CATEGORY_LABELS, FORUMS, findForum, useVotes, type ForumCategory } from '../../../features/forums/forums'
import { useForumActivity } from '../../../features/social/SocialProvider'

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
      <button type="button" onClick={seed} disabled={state === 'working'} className="border border-border px-4 py-1.5 font-bold hover:bg-accent disabled:opacity-50">
        {state === 'working' ? 'Seeding...' : 'Seed the forums'}
      </button>
      {state !== 'idle' && state !== 'working' && <span className="text-muted-foreground">{state}</span>}
    </div>
  )
}

export default function ForumsPage() {
  const { threads: records } = useForumActivity() // shared with the rest of the app; no extra download
  const votes = useVotes()
  const { user } = useUser()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  // One pass (records are newest first): thread count and newest thread per forum.
  const counts = new Map<string, number>()
  const newest = new Map<string, { title: string; id: string; at: string }>()
  for (const r of records) {
    counts.set(r.data.forum, (counts.get(r.data.forum) ?? 0) + 1)
    if (!newest.has(r.data.forum)) newest.set(r.data.forum, { title: r.data.title, id: r.recordId, at: r.createdAt })
  }

  const active = FORUMS.filter((f) => counts.has(f.slug))

  // Trending: highest score among threads from the last 3 days.
  const cutoff = Date.now() - 3 * 86_400_000
  const trending = records
    .filter((r) => new Date(r.createdAt).getTime() > cutoff)
    .sort((a, b) => votes.score(b.recordId) - votes.score(a.recordId))
    .slice(0, 5)

  return (
    <div className="space-y-5 px-1 py-2">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl leading-none">Stellar forums</h1>
          <p className="mt-1 text-sm text-muted-foreground">Longer conversations, one board per world and topic. Open a section to see its boards.</p>
        </div>
        {isAdmin && <SeedButton />}
      </header>

      {trending.length > 0 && (
        <details open className="border border-border bg-card">
          <summary className="font-display cursor-pointer bg-secondary px-3 py-2 text-xs uppercase tracking-wider text-primary">Trending threads</summary>
          <ol className="divide-y divide-dashed divide-border">
            {trending.map((t) => {
              const f = findForum(t.data.forum)
              return (
                <li key={t.recordId}>
                  <Link to={`/thread/${t.recordId}`} className="group flex items-baseline gap-3 px-3 py-2 hover:bg-accent/40">
                    <span className="font-signal w-8 shrink-0 text-right tabular-nums text-primary">{votes.score(t.recordId)}</span>
                    <span className="min-w-0 flex-1 truncate group-hover:underline">{t.data.title}</span>
                    {f && <span className="hidden shrink-0 text-sm sm:inline" style={{ color: f.accent }}>{f.name}</span>}
                  </Link>
                </li>
              )
            })}
          </ol>
        </details>
      )}

      {active.length === 0 && (
        <p className="border border-dashed border-border py-10 text-center text-muted-foreground">
          No discussions yet.{isAdmin ? ' Use "Seed the forums" to add starter threads.' : ' Check back soon.'}
        </p>
      )}

      {/* One collapsible section per category, like the topic sections of a Moodle course page.
          Boards with no threads yet are hidden, and so is a section with no boards left. */}
      {CATEGORIES.filter((c) => active.some((f) => f.category === c)).map((c) => (
        <details key={c} open className="border border-border bg-card">
          <summary className="cursor-pointer bg-secondary px-3 py-2">
            <span className="font-display text-xs uppercase tracking-wider text-primary">{CATEGORY_LABELS[c].title}</span>
            <span className="ml-2 text-sm text-muted-foreground">{CATEGORY_LABELS[c].blurb}</span>
          </summary>
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="font-signal text-left text-base text-muted-foreground">
                <th scope="col" className="px-3 py-1.5 font-normal">Forum</th>
                <th scope="col" className="hidden w-20 px-2 py-1.5 font-normal sm:table-cell">Topics</th>
                <th scope="col" className="hidden w-[38%] px-3 py-1.5 font-normal md:table-cell">Latest topic</th>
              </tr>
            </thead>
            <tbody>
              {active.filter((f) => f.category === c).map((f) => {
                const n = counts.get(f.slug) ?? 0
                const latest = newest.get(f.slug)
                return (
                  <tr key={f.slug} className="border-t border-dashed border-border align-top hover:bg-accent/30">
                    <td className="px-3 py-2.5">
                      <Link to={`/forums/${f.slug}`} className="flex gap-2.5">
                        <span aria-hidden className="mt-0.5 text-lg leading-none" style={{ color: f.accent }}>{f.glyph}</span>
                        <span className="min-w-0">
                          <span className="block font-bold text-primary hover:underline">{f.name}</span>
                          <span className="line-clamp-2 block text-muted-foreground">{f.tagline}</span>
                          <span className="font-signal block text-muted-foreground sm:hidden">{n} topics</span>
                        </span>
                      </Link>
                    </td>
                    <td className="font-signal hidden px-2 py-2.5 text-base sm:table-cell">{n}</td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      {latest ? (
                        <Link to={`/thread/${latest.id}`} className="block hover:underline">
                          <span className="line-clamp-1 block">{latest.title}</span>
                          <span className="font-signal block text-muted-foreground">{new Date(latest.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">No topics yet</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </details>
      ))}
    </div>
  )
}
