// "/feed" page. It's in (app), not (protected), so guests can read and post text without signing in.
import PostComposer from '../../features/comms/PostComposer'
import Feed from '../../features/comms/Feed'

export default function FeedPage() {
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Colony Feed</h1>
      <PostComposer />
      <Feed />
    </main>
  )
}
