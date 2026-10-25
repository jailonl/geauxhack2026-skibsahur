// "/thread/:id" — a forum discussion laid out like a Moodle forum: the first post in a box with a title bar,
// then every reply in its own box titled "Re: <title>", indented under the post it answers.
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth, useMutations, useQuery, useUser } from 'deepspace'
import ForumAuthor from '../../../features/forums/ForumAuthor'
import VoteButtons from '../../../features/forums/VoteButtons'
import { findForum, useVotes, type Comment, type Thread, type Votes } from '../../../features/forums/forums'
import ProfileEditor from '../../../features/social/ProfileEditor'
import { useMyProfile, useProfiles, type Profiles, type ProfileRecord } from '../../../features/social/profiles'
import { SignInPrompt } from '../../../features/social/SignIn'

type CommentRecord = { recordId: string; data: Comment; createdBy: string; createdAt: string }

function CommentForm({ threadId, parentId, me, onDone }: { threadId: string; parentId?: string; me: ProfileRecord; onDone?: () => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const { ready, create } = useMutations<Comment>('comments')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await create({ threadId, text: text.trim(), authorName: me.username, ...(parentId ? { parentId } : {}) })
      setText('')
      setError('')
      onDone?.()
    } catch (err) {
      setError('Could not comment: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label htmlFor={`comment-${parentId ?? threadId}`} className="sr-only">{parentId ? 'Reply' : 'Comment'}</label>
      <textarea
        id={`comment-${parentId ?? threadId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={parentId ? 2 : 3}
        maxLength={2000}
        placeholder={parentId ? 'Write a reply...' : 'Reply to this discussion...'}
        className="w-full rounded-md border bg-background p-2"
      />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={!ready || !text.trim()} className="bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          Post reply
        </button>
        {onDone && <button type="button" onClick={onDone} className="border border-border px-4 py-1.5 text-sm">Cancel</button>}
      </div>
    </form>
  )
}

const MAX_INDENT = 4 // deeper replies stop indenting so text never gets too narrow

function CommentItem(props: {
  c: CommentRecord
  title: string
  depth: number
  repliesTo: (id: string) => CommentRecord[]
  profiles: Profiles
  votes: Votes
  me: ProfileRecord | null
  canDelete: (c: CommentRecord) => boolean
  onDelete: (id: string) => void
}) {
  const { c, title, depth, repliesTo, profiles, votes, me, canDelete, onDelete } = props
  const [replying, setReplying] = useState(false)
  const name = c.data.botName ?? profiles.byUserId.get(c.createdBy)?.username ?? c.data.authorName ?? 'unknown'
  const replies = repliesTo(c.recordId)

  return (
    <li>
      <article className="border border-border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-secondary px-3 py-1.5">
          <span className="font-display text-xs">Re: {title}</span>
          <span className="font-signal flex items-center gap-2 text-muted-foreground">
            by <ForumAuthor createdBy={c.createdBy} botName={c.data.botName} fallbackName={c.data.authorName} profiles={profiles} />
            · {new Date(c.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </header>
        <p className="font-post whitespace-pre-wrap break-words px-3 py-2.5">{c.data.text}</p>
        <footer className="font-signal flex flex-wrap items-center gap-3 px-3 pb-2 text-primary">
          <VoteButtons id={c.recordId} votes={votes} enabled={Boolean(me)} label={`reply by ${name}`} horizontal />
          {me && (
            <button type="button" onClick={() => setReplying(!replying)} className="hover:underline">[ Reply ]</button>
          )}
          {canDelete(c) && (
            <button type="button" onClick={() => onDelete(c.recordId)} className="text-destructive hover:underline">[ Delete ]</button>
          )}
        </footer>
        {replying && me && (
          <div className="px-3 pb-3">
            <CommentForm threadId={c.data.threadId} parentId={c.recordId} me={me} onDone={() => setReplying(false)} />
          </div>
        )}
      </article>
      {replies.length > 0 && (
        <ul className={`mt-3 space-y-3 ${depth < MAX_INDENT ? 'ml-4 border-l-2 border-dashed border-border pl-3 sm:ml-6' : ''}`}>
          {replies.map((r) => (
            <CommentItem key={r.recordId} {...props} c={r} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function ThreadPage() {
  const { id = '' } = useParams()
  const { profile: me, isSignedIn, loading } = useMyProfile()
  const profiles = useProfiles()
  const votes = useVotes()
  const { userId } = useAuth()
  const { user } = useUser()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true
  const thread = useQuery<Thread>('threads', { where: { recordId: id }, limit: 1 })
  const comments = useQuery<Comment>('comments', { where: { threadId: id }, orderBy: 'createdAt', orderDir: 'asc', limit: 1000 })
  const threadMutations = useMutations<Thread>('threads')
  const commentMutations = useMutations<Comment>('comments')

  const t = thread.records[0]
  if (thread.status === 'loading') return <p className="p-6 text-muted-foreground">Loading...</p>
  if (!t) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-muted-foreground">This thread was deleted.</p>
        <Link to="/forums" className="underline">Back to forums</Link>
      </div>
    )
  }

  const forum = findForum(t.data.forum)
  const all = comments.records as CommentRecord[]
  const topLevel = all.filter((c) => !c.data.parentId)
  // Group replies by parent once, instead of searching the whole list for every comment.
  const byParent = new Map<string, CommentRecord[]>()
  for (const c of all) {
    if (c.data.parentId) byParent.set(c.data.parentId, [...(byParent.get(c.data.parentId) ?? []), c])
  }
  const repliesTo = (parentId: string) => byParent.get(parentId) ?? []
  const canDelete = (c: { createdBy: string }) => isAdmin || (userId != null && c.createdBy === userId)

  async function onDeleteThread() {
    if (window.confirm('Delete this thread?')) await threadMutations.remove(t.recordId)
  }
  async function onDeleteComment(commentId: string) {
    if (window.confirm('Delete this comment?')) await commentMutations.remove(commentId)
  }

  return (
    <div className="space-y-4 px-1 py-2">
      <article className="border border-border bg-card" style={forum ? { borderTop: `4px solid ${forum.accent}` } : undefined}>
        <header className="bg-secondary px-3 py-2">
          <h1 className="font-display text-lg leading-snug">{t.data.title}</h1>
          <p className="font-signal flex flex-wrap items-center gap-x-2 text-muted-foreground">
            by <ForumAuthor createdBy={t.createdBy} botName={t.data.botName} fallbackName={t.data.authorName} profiles={profiles} withAvatar />
            · {new Date(t.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            {forum && <> · in <Link to={`/forums/${forum.slug}`} className="hover:underline" style={{ color: forum.accent }}>{forum.name}</Link></>}
          </p>
        </header>
        {t.data.text && <p className="font-post whitespace-pre-wrap break-words px-3 py-3 text-[1.05rem]">{t.data.text}</p>}
        <footer className="font-signal flex flex-wrap items-center gap-3 px-3 pb-2.5 text-primary">
          <VoteButtons id={t.recordId} votes={votes} enabled={Boolean(me)} label={t.data.title} horizontal />
          <span className="text-muted-foreground">{all.length} {all.length === 1 ? 'reply' : 'replies'}</span>
          {canDelete(t) && (
            <button type="button" onClick={onDeleteThread} className="text-destructive hover:underline">[ Delete thread ]</button>
          )}
        </footer>
      </article>

      <ul className="space-y-3">
        {topLevel.map((c) => (
          <CommentItem
            key={c.recordId}
            c={c}
            title={t.data.title}
            depth={1}
            repliesTo={repliesTo}
            profiles={profiles}
            votes={votes}
            me={me}
            canDelete={canDelete}
            onDelete={onDeleteComment}
          />
        ))}
      </ul>

      <section aria-label="Reply to this discussion" className="border border-border bg-card p-3">
        <h2 className="font-display mb-2 text-xs uppercase tracking-wider text-primary">Reply to this discussion</h2>
        {!isSignedIn ? (
          <SignInPrompt action="reply and vote" />
        ) : loading ? null : me ? (
          <CommentForm threadId={t.recordId} me={me} />
        ) : (
          <ProfileEditor existing={null} />
        )}
      </section>
    </div>
  )
}
