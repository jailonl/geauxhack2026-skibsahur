// "/forums/:body" — one board: a Moodle-style discussion table (Discussion, Started by, Replies, Score,
// Last post), sortable by Active, Top, or New, and a form to start a thread.
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutations, useQuery } from 'deepspace'
import ForumAuthor from '../../../features/forums/ForumAuthor'
import { findColonist } from '../../../features/forums/colonists'
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
  const [sort, setSort] = useState<'active' | 'top' | 'new'>('active')
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

  // One pass over comments: reply count and newest reply per thread (not one pass per thread).
  const counts = new Map<string, number>()
  const lastReply = new Map<string, { at: string; who: string }>()
  for (const c of comments.records) {
    const id = c.data.threadId
    counts.set(id, (counts.get(id) ?? 0) + 1)
    const prev = lastReply.get(id)
    if (!prev || c.createdAt > prev.at) {
      const who = c.data.botName
        ? findColonist(c.data.botName)?.name ?? c.data.botName
        : `@${profiles.byUserId.get(c.createdBy)?.username ?? c.data.authorName ?? 'unknown'}`
      lastReply.set(id, { at: c.createdAt, who })
    }
  }
  const lastActive = (t: { recordId: string; createdAt: string }) => lastReply.get(t.recordId)?.at ?? t.createdAt
  const time = (iso: string) => new Date(iso).getTime()
  const list = [...threads.records].sort((a, b) =>
    sort === 'new'
      ? time(b.createdAt) - time(a.createdAt)
      : sort === 'active'
        ? time(lastActive(b)) - time(lastActive(a))
        : votes.score(b.recordId) - votes.score(a.recordId) || time(b.createdAt) - time(a.createdAt),
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
    <div className="space-y-4 px-1 py-2">
      <header className="border border-border bg-card p-4" style={{ borderTop: `4px solid ${forum.accent}` }}>
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-3xl leading-none" style={{ color: forum.accent }}>{forum.glyph}</span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-tight">{forum.name}</h1>
            <p className="text-sm text-muted-foreground">{forum.tagline}</p>
          </div>
        </div>
      </header>
      <div className="space-y-4">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Sort discussions" className="flex gap-2">
          {(['active', 'top', 'new'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
              className={sort === s ? 'bg-primary px-3 py-1 text-sm font-bold text-primary-foreground' : 'border border-border px-3 py-1 text-sm hover:bg-accent'}
            >
              {s === 'active' ? 'Latest activity' : s === 'top' ? 'Top' : 'Newest'}
            </button>
          ))}
        </div>
        {me && (
          <button type="button" onClick={() => setShowForm(!showForm)} className="bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
            {showForm ? 'Cancel' : '+ Add discussion topic'}
          </button>
        )}
      </div>

      {!isSignedIn ? (
        <SignInPrompt action="start threads, comment, and vote" />
      ) : loading ? null : !me ? (
        <ProfileEditor existing={null} />
      ) : (
        showForm && (
          <form onSubmit={onCreate} className="space-y-3 border border-border bg-card p-4">
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

      {list.length > 0 && (
        <div className="border border-border bg-card">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-secondary">
              <tr className="font-signal text-left text-base text-primary">
                <th scope="col" className="px-3 py-1.5 font-normal">Discussion</th>
                <th scope="col" className="hidden w-32 px-2 py-1.5 font-normal md:table-cell">Started by</th>
                <th scope="col" className="w-16 px-2 py-1.5 text-center font-normal">Replies</th>
                <th scope="col" className="hidden w-14 px-2 py-1.5 text-center font-normal sm:table-cell">Score</th>
                <th scope="col" className="hidden w-36 px-3 py-1.5 font-normal lg:table-cell">Last post</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const last = lastReply.get(t.recordId)
                return (
                  <tr key={t.recordId} className="border-t border-dashed border-border align-top hover:bg-accent/30">
                    <td className="px-3 py-2.5">
                      <Link to={`/thread/${t.recordId}`} className="font-bold text-primary hover:underline">{t.data.title}</Link>
                      {t.data.text && <p className="font-post line-clamp-1 text-muted-foreground">{t.data.text}</p>}
                      {/* On small screens the hidden columns' info goes here. */}
                      <p className="font-signal text-muted-foreground md:hidden">
                        by <ForumAuthor createdBy={t.createdBy} botName={t.data.botName} fallbackName={t.data.authorName} profiles={profiles} /> · {timeAgo(t.createdAt)}
                      </p>
                    </td>
                    <td className="hidden px-2 py-2.5 md:table-cell">
                      <ForumAuthor createdBy={t.createdBy} botName={t.data.botName} fallbackName={t.data.authorName} profiles={profiles} />
                      <span className="font-signal block text-muted-foreground">{timeAgo(t.createdAt)}</span>
                    </td>
                    <td className="font-signal px-2 py-2.5 text-center text-base">{counts.get(t.recordId) ?? 0}</td>
                    <td className="font-signal hidden px-2 py-2.5 text-center text-base sm:table-cell">{votes.score(t.recordId)}</td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      {last ? (
                        <>
                          <span className="block truncate">{last.who}</span>
                          <span className="font-signal block text-muted-foreground">{timeAgo(last.at)}</span>
                        </>
                      ) : (
                        <span className="font-signal text-muted-foreground">No replies</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  )
}
