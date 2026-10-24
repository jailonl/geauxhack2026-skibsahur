// "/post/:id" — one post with its full reply thread underneath.
import { Link, useParams } from 'react-router-dom'
import { useAuth, useMutations, useUser } from 'deepspace'
import PostCard from '../../../features/comms/PostCard'
import PostComposer from '../../../features/comms/PostComposer'
import { useFeedData, useReactionActions } from '../../../features/comms/feedData'
import type { Post, PostRecord } from '../../../features/comms/types'
import { useMyProfile, useProfiles } from '../../../features/social/profiles'

export default function PostPage() {
  const { id = '' } = useParams()
  const feed = useFeedData(500)
  const profiles = useProfiles()
  const { profile: me } = useMyProfile()
  const { userId } = useAuth()
  const { user } = useUser()
  const { remove } = useMutations<Post>('posts')
  const reactions = useReactionActions()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  const post = feed.byId.get(id)
  const replies = feed.posts
    .filter((p) => p.data.replyToId === id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) // oldest first, like a thread

  async function onDelete(postId: string) {
    if (!window.confirm('Delete this post?')) return
    await remove(postId)
  }

  const card = (p: PostRecord, linkToPost = true) => (
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
      linkToPost={linkToPost}
    />
  )

  return (
    <main className="mx-auto max-w-2xl space-y-3 p-4">
      <Link to="/home" className="text-sm underline">← Back to feed</Link>

      {feed.status === 'loading' && <p className="text-muted-foreground">Loading...</p>}
      {feed.status === 'ready' && !post && <p className="text-muted-foreground">This post was deleted or is too old to show.</p>}

      {post && (
        <>
          {post.data.replyToId && feed.byId.get(post.data.replyToId) && card(feed.byId.get(post.data.replyToId)!)}
          {card(post, false)}
          <PostComposer replyToId={post.recordId} placeholder="Post your reply..." />
          <h2 className="pt-2 text-lg font-semibold">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </h2>
          {replies.map((r) => card(r))}
        </>
      )}
    </main>
  )
}
