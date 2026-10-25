// "/post/:id" — one post with the post it replies to above it and every reply below it.
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth, useMutations, useUser } from 'deepspace'
import { ArrowLeft } from 'lucide-react'
import PostCard from '../../../features/comms/PostCard'
import PostComposer from '../../../features/comms/PostComposer'
import { useFeedData, useReactionActions } from '../../../features/comms/feedData'
import type { Post, PostRecord } from '../../../features/comms/types'
import { useMyProfile, useProfiles } from '../../../features/social/profiles'

export default function PostPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const feed = useFeedData()
  const profiles = useProfiles()
  const { profile: me } = useMyProfile()
  const { userId } = useAuth()
  const { user } = useUser()
  const { remove } = useMutations<Post>('posts')
  const reactions = useReactionActions()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  const post = feed.byId.get(id)
  const parent = post?.data.replyToId ? feed.byId.get(post.data.replyToId) : undefined
  const replies = post ? feed.repliesTo(post.recordId) : []

  async function onDelete(postId: string) {
    if (!window.confirm('Delete this post?')) return
    await remove(postId)
    if (postId === id) navigate('/home')
  }

  const card = (p: PostRecord, focused = false) => (
    <PostCard
      key={p.recordId}
      post={p}
      profiles={profiles}
      feed={feed}
      stats={feed.stats(p.recordId)}
      canDelete={isAdmin || (userId != null && p.createdBy === userId)}
      canReact={Boolean(me)}
      onToggle={(postId, kind, existing) => void reactions.toggle(postId, kind, existing)}
      onDelete={onDelete}
      linkToPost={!focused}
    />
  )

  return (
    <div className="mx-auto max-w-[680px] space-y-3 px-4 py-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="rounded-full border border-border p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="font-display text-2xl">Thread</h1>
      </header>

      {feed.status === 'loading' && <p className="px-4 py-6 text-muted-foreground">Loading...</p>}
      {feed.status === 'ready' && !post && (
        <div className="px-4 py-10 text-center">
          <p className="mb-2 text-muted-foreground">This post was deleted.</p>
          <Link to="/home" className="text-primary hover:underline">Back to Home</Link>
        </div>
      )}

      {post && (
        <>
          {parent && card(parent)}
          {card(post, true)}
          <PostComposer replyToId={post.recordId} />
          <h2 className="pt-2 text-lg font-bold">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</h2>
          {replies.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-8 text-center text-muted-foreground">No replies yet. Start the conversation.</p>
          ) : (
            replies.map((r) => card(r))
          )}
        </>
      )}
    </div>
  )
}
