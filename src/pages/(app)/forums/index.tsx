// "/forums" — every board, grouped (home worlds, outer colonies, lounges), plus the top threads right now.
import { Link } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { CATEGORY_LABELS, FORUMS, findForum, useVotes, type ForumCategory, type Thread } from '../../../features/forums/forums'

const CATEGORIES: ForumCategory[] = ['worlds', 'colonies', 'lounges']

export default function ForumsPage() {
  const { records } = useQuery<Thread>('threads', { orderBy: 'createdAt', orderDir: 'desc', limit: 2000 })
  const votes = useVotes()

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
    <div className="mx-auto max-w-2xl">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
        <h1 className="font-display text-xl font-bold">Forums</h1>
        <p className="text-sm text-muted-foreground">Longer conversations, one board per world and topic.</p>
      </header>

      {trending.length > 0 && (
        <section className="border-b border-border px-4 py-4">
          <h2 className="mb-2 font-bold">Trending threads</h2>
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
        <section key={c} className="border-b border-border px-4 py-4">
          <h2 className="font-bold">{CATEGORY_LABELS[c].title}</h2>
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
