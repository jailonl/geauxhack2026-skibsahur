// "/forums/:body" — one planet's board: thread list (Top or New) and a form to start a thread.
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutations, useQuery } from 'deepspace'
import ForumAuthor from '../../../features/forums/ForumAuthor'
import VoteButtons from '../../../features/forums/VoteButtons'
import { FORUMS, findForum, useVotes, type Comment, type Thread } from '../../../features/forums/forums'
import ProfileEditor from '../../../features/social/ProfileEditor'
import { useMyProfile, useProfiles } from '../../../features/social/profiles'
import { SignInPrompt } from '../../../features/social/SignIn'

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function ForumPage() {
  const { body = '' } = useParams()
  const forum = findForum(body)
  const [sort, setSort] = useState<'top' | 'new'>('top')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const { profile: me, isSignedIn, loading } = useMyProfile()
  const profiles = useProfiles()
  const votes = useVotes()
  const threads = useQuery<Thread>('threads', {
    where: { forum: forum?.slug ?? '__none__' },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 200,
  })
  const comments = useQuery<Comment>('comments', { limit: 5000 })
  const { ready, create } = useMutations<Thread>('threads')

  if (!forum) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="mb-2">No board called {body}.</p>
        <Link to="/forums" className="text-primary hover:underline">See all {FORUMS.length} forums</Link>
      </div>
    )
  }

  // Count comments once (one pass), not once per thread.
  const counts = new Map<string, number>()
  for (const c of comments.records) counts.set(c.data.threadId, (counts.get(c.data.threadId) ?? 0) + 1)
  const commentCount = (threadId: string) => counts.get(threadId) ?? 0
  const list = [...threads.records].sort((a, b) =>
    sort === 'new'
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : votes.score(b.recordId) - votes.score(a.recordId) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !me || !forum) return
    try {
      await create({ forum: forum.slug, title: title.trim(), text: text.trim(), authorName: me.username })
      setTitle('')
      setText('')
      setShowForm(false)
      setError('')
    } catch (err) {
      setError('Could not post: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <header className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-24" style={{ background: `radial-gradient(100% 160% at 15% 0%, ${forum.accent}66 0%, transparent 70%)` }} />
        <div className="-mt-8 flex items-end gap-3 px-4 pb-4">
          <span
            aria-hidden
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-background text-2xl font-bold"
            style={{ color: forum.accent, boxShadow: `inset 0 0 0 2px ${forum.accent}` }}
          >
            {forum.glyph}
          </span>
          <div className="min-w-0">
            <Link to="/forums" className="text-sm text-muted-foreground hover:underline">Forums</Link>
            <h1 className="font-display text-3xl leading-tight">{forum.name}</h1>
            <p className="text-sm text-muted-foreground">{forum.tagline}</p>
          </div>
        </div>
      </header>
      <div className="space-y-4">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Sort threads" className="flex gap-2">
          {(['top', 'new'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
              className={sort === s ? 'rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground' : 'rounded-full border border-border px-4 py-1.5 text-sm hover:bg-accent'}
            >
              {s === 'top' ? 'Top' : 'New'}
            </button>
          ))}
        </div>
        {me && (
          <button type="button" onClick={() => setShowForm(!showForm)} className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
            {showForm ? 'Cancel' : 'New thread'}
          </button>
        )}
      </div>

      {!isSignedIn ? (
        <SignInPrompt action="start threads, comment, and vote" />
      ) : loading ? null : !me ? (
        <ProfileEditor existing={null} />
      ) : (
        showForm && (
          <form onSubmit={onCreate} className="space-y-3 rounded-xl border border-border bg-card p-4">
            <label className="block text-sm">
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-md border bg-background p-2" />
            </label>
            <label className="block text-sm">
              Text <span className="text-muted-foreground">(optional)</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={4000} className="mt-1 w-full rounded-md border bg-background p-2" />
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={!ready || !title.trim()} className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-50">
              Post thread
            </button>
          </form>
        )
      )}

      {threads.status === 'loading' && <p className="text-muted-foreground">Loading threads...</p>}
      {threads.status === 'ready' && list.length === 0 && <p className="text-muted-foreground">No threads yet. Start the first one.</p>}

      <ul className="space-y-2">
        {list.map((t) => {
          const n = commentCount(t.recordId)
          return (
            <li key={t.recordId} className="flex gap-3 rounded-xl border border-border bg-card p-3 hover:bg-accent/30">
              <VoteButtons id={t.recordId} votes={votes} enabled={Boolean(me)} label={t.data.title} />
              <div className="min-w-0">
                <Link to={`/thread/${t.recordId}`} className="font-semibold hover:underline">{t.data.title}</Link>
                {t.data.text && <p className="font-post line-clamp-2 text-sm text-muted-foreground">{t.data.text}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  by{' '}
                  <ForumAuthor createdBy={t.createdBy} botName={t.data.botName} fallbackName={t.data.authorName} profiles={profiles} />
                  {' · '}{timeAgo(t.createdAt)}{' · '}
                  <Link to={`/thread/${t.recordId}`} className="hover:underline">{n} {n === 1 ? 'comment' : 'comments'}</Link>
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      </div>
    </div>
  )
}
