// "/home" — the main feed. Anyone can read it; posting and reacting need an account.
import Feed from '../../features/comms/Feed'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Colony Feed</h1>
      <Feed />
    </main>
  )
}
