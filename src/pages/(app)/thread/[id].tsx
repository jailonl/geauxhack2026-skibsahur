// "/thread/:id" — a forum thread with votes and comments. Comments can be replied to one level deep.
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
        placeholder={parentId ? 'Write a reply...' : 'Add a comment...'}
        className="w-full rounded-md border bg-background p-2"
      />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={!ready || !text.trim()} className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {parentId ? 'Reply' : 'Comment'}
        </button>
        {onDone && <button type="button" onClick={onDone} className="rounded-full border border-border px-4 py-1.5 text-sm">Cancel</button>}
      </div>
    </form>
  )
}

function CommentItem(props: {
  c: CommentRecord
  replies: CommentRecord[]
  profiles: Profiles
  votes: Votes
  me: ProfileRecord | null
  canDelete: (c: CommentRecord) => boolean
  onDelete: (id: string) => void
}) {
  const { c, replies, profiles, votes, me, canDelete, onDelete } = props
  const [replying, setReplying] = useState(false)
  const name = c.data.botName ?? profiles.byUserId.get(c.createdBy)?.username ?? c.data.authorName ?? 'unknown'

  return (
    <li className="flex gap-2">
      <VoteButtons id={c.recordId} votes={votes} enabled={Boolean(me)} label={`comment by ${name}`} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm">
          <ForumAuthor createdBy={c.createdBy} botName={c.data.botName} fallbackName={c.data.authorName} profiles={profiles} withAvatar />
          <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
        </p>
        <p className="font-post mt-1 whitespace-pre-wrap break-words">{c.data.text}</p>
        <div className="mt-1 flex gap-3 text-sm text-muted-foreground">
          {me && !c.data.parentId && (
            <button type="button" onClick={() => setReplying(!replying)} className="hover:underline">Reply</button>
          )}
          {canDelete(c) && (
            <button type="button" onClick={() => onDelete(c.recordId)} className="text-destructive hover:underline">Delete</button>
          )}
        </div>
        {replying && me && (
          <div className="mt-2">
            <CommentForm threadId={c.data.threadId} parentId={c.recordId} me={me} onDone={() => setReplying(false)} />
          </div>
        )}
        {replies.length > 0 && (
          <ul className="mt-3 space-y-3 border-l pl-3">
            {replies.map((r) => (
              <CommentItem key={r.recordId} c={r} replies={[]} profiles={profiles} votes={votes} me={me} canDelete={canDelete} onDelete={onDelete} />
            ))}
          </ul>
        )}
      </div>
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
  const repliesTo = (parentId: string) => all.filter((c) => c.data.parentId === parentId)
  const canDelete = (c: { createdBy: string }) => isAdmin || (userId != null && c.createdBy === userId)

  async function onDeleteThread() {
    if (window.confirm('Delete this thread?')) await threadMutations.remove(t.recordId)
  }
  async function onDeleteComment(commentId: string) {
    if (window.confirm('Delete this comment?')) await commentMutations.remove(commentId)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {forum && <Link to={`/forums/${forum.slug}`} className="text-sm text-muted-foreground hover:underline">← {forum.name}</Link>}

      <article className="flex gap-3 rounded-xl border border-border bg-card p-4" style={forum ? { borderTop: `4px solid ${forum.accent}` } : undefined}>
        <VoteButtons id={t.recordId} votes={votes} enabled={Boolean(me)} label={t.data.title} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {forum?.name} · posted by{' '}
            <ForumAuthor createdBy={t.createdBy} botName={t.data.botName} fallbackName={t.data.authorName} profiles={profiles} />
            {' · '}{new Date(t.createdAt).toLocaleString()}
          </p>
          <h1 className="mt-1 font-display text-2xl">{t.data.title}</h1>
          {t.data.text && <p className="font-post mt-2 whitespace-pre-wrap break-words text-[1.05rem]">{t.data.text}</p>}
          {canDelete(t) && (
            <button type="button" onClick={onDeleteThread} className="mt-2 text-sm text-destructive hover:underline">Delete thread</button>
          )}
        </div>
      </article>

      {!isSignedIn ? (
        <SignInPrompt action="comment and vote" />
      ) : loading ? null : me ? (
        <CommentForm threadId={t.recordId} me={me} />
      ) : (
        <ProfileEditor existing={null} />
      )}

      <h2 className="text-lg font-semibold">{all.length} {all.length === 1 ? 'comment' : 'comments'}</h2>
      <ul className="space-y-4">
        {topLevel.map((c) => (
          <CommentItem
            key={c.recordId}
            c={c}
            replies={repliesTo(c.recordId)}
            profiles={profiles}
            votes={votes}
            me={me}
            canDelete={canDelete}
            onDelete={onDeleteComment}
          />
        ))}
      </ul>
    </div>
  )
}
