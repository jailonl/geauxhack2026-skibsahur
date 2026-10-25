// "/search?q=..." — find colonists, posts, forums, and threads. Searches the data already loaded in the app.
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { authorOf, useFeedData } from '../../features/comms/feedData'
import { FORUMS, findForum } from '../../features/forums/forums'
import UserAvatar from '../../features/social/UserAvatar'
import { useForumActivity } from '../../features/social/SocialProvider'
import { useProfiles } from '../../features/social/profiles'
import { BODY_LABELS } from '../../lib/space'

const MAX = 8

function matches(text: string | undefined, words: string[]): boolean {
  if (!text) return false
  const t = text.toLowerCase()
  return words.every((w) => t.includes(w))
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-lg font-bold">
        {title} <span className="text-sm font-normal text-muted-foreground">{count > MAX ? `top ${MAX} of ${count}` : count}</span>
      </h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  )
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const profiles = useProfiles()
  const feed = useFeedData()
  const { threads } = useForumActivity()

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return null
    const people = [...profiles.byUserId.values()].filter((p) => matches(`${p.username} ${p.displayName ?? ''} ${p.bio ?? ''}`, words))
    const posts = feed.posts.filter((p) => matches(p.data.text, words) || matches(p.data.authorName, words))
    const forums = FORUMS.filter((f) => matches(`${f.name} ${f.tagline}`, words))
    const foundThreads = threads.filter((t) => matches(t.data.title, words))
    return { people, posts, forums, threads: foundThreads }
  }, [q, profiles, feed, threads])

  const total = results ? results.people.length + results.posts.length + results.forums.length + results.threads.length : 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="font-display text-2xl">Search</h1>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          const value = new FormData(e.currentTarget).get('q')
          setParams({ q: String(value ?? '') })
        }}
        className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-4"
      >
        <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
        <label htmlFor="search-q" className="sr-only">Search the colony</label>
        <input id="search-q" name="q" defaultValue={q} key={q} placeholder="People, posts, forums, threads" className="w-full bg-transparent py-3 outline-none" />
      </form>

      {!results && <p className="mt-8 text-center text-muted-foreground">Try "Mars", "tomatoes", "@hab", or a colonist's name.</p>}
      {results && total === 0 && <p className="mt-8 text-center text-muted-foreground">Nothing matches "{q}". Try a shorter word.</p>}

      {results && (
        <>
          <Section title="Colonists" count={results.people.length}>
            {results.people.slice(0, MAX).map((p) => (
              <li key={p.userId}>
                <Link to={`/u/${p.username}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-accent/40">
                  <UserAvatar name={p.username} avatarKey={p.avatarKey} accent={p.accent} size={40} />
                  <span className="min-w-0">
                    <span className="block font-bold">{p.displayName || p.username}</span>
                    <span className="block text-sm text-muted-foreground">@{p.username} on {BODY_LABELS[p.homeBody ?? 'earth']}</span>
                  </span>
                </Link>
              </li>
            ))}
          </Section>

          <Section title="Forums" count={results.forums.length}>
            {results.forums.slice(0, MAX).map((f) => (
              <li key={f.slug}>
                <Link to={`/forums/${f.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-accent/40">
                  <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold" style={{ color: f.accent, boxShadow: `inset 0 0 0 1.5px ${f.accent}` }}>{f.glyph}</span>
                  <span className="min-w-0">
                    <span className="block font-bold">{f.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">{f.tagline}</span>
                  </span>
                </Link>
              </li>
            ))}
          </Section>

          <Section title="Threads" count={results.threads.length}>
            {results.threads.slice(0, MAX).map((t) => (
              <li key={t.recordId}>
                <Link to={`/thread/${t.recordId}`} className="block rounded-2xl border border-border bg-card p-3 hover:bg-accent/40">
                  <span className="block font-bold">{t.data.title}</span>
                  <span className="text-sm" style={{ color: findForum(t.data.forum)?.accent }}>{findForum(t.data.forum)?.name}</span>
                </Link>
              </li>
            ))}
          </Section>

          <Section title="Posts" count={results.posts.length}>
            {results.posts.slice(0, MAX).map((p) => {
              const a = authorOf(p, profiles)
              return (
                <li key={p.recordId}>
                  <Link to={`/post/${p.recordId}`} className="flex gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-accent/40">
                    <UserAvatar name={a.name} avatarKey={a.avatarKey} accent={a.accent} emoji={a.emoji} size={36} />
                    <span className="min-w-0">
                      <span className="block text-sm"><strong>{a.name}</strong> {a.handle && <span className="text-muted-foreground">@{a.handle}</span>}</span>
                      <span className="font-post line-clamp-2 block">{p.data.text}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </Section>
        </>
      )}
    </div>
  )
}
