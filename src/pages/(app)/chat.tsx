// "/chat" page. In (app), so guests can read and send without signing in, like the feed.
import Chat from '../../features/comms/Chat'

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-1 text-2xl font-bold">Colony Comms</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Messages between planets travel at the speed of light, so they arrive late. Delays are calculated from where
        Earth and Mars are today.
      </p>
      <Chat />
    </main>
  )
}
