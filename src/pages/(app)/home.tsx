// "/home" — the feed. The side blocks (colony pulse, signal times, colonists, busy forums) come from
// the page layout (src/components/AppShell.tsx), so every page shares them.
import Feed from '../../features/comms/Feed'

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[720px] min-w-0 py-2">
      <Feed />
    </div>
  )
}
