// "/forums" — the four planet boards, with how many threads each has.
import { Link } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { FORUMS, type Thread } from '../../../features/forums/forums'

export default function ForumsPage() {
  const { records } = useQuery<Thread>('threads', { limit: 2000 })

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Planet Forums</h1>
      <p className="text-muted-foreground">Each location has its own board. Start a thread, comment, and vote.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {FORUMS.map((f) => {
          const count = records.filter((r) => r.data.forum === f.body).length
          return (
            <li key={f.slug}>
              <Link
                to={`/forums/${f.slug}`}
                className="block h-full rounded-lg border bg-card p-4 hover:bg-muted/40"
                style={{ borderTop: `4px solid ${f.accent}` }}
              >
                <span className="text-lg font-bold">{f.emoji} {f.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{f.tagline}</span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {count} {count === 1 ? 'thread' : 'threads'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
