// "/signals" — the Signal map: light delay between any two places, right now.
import SignalMap from '../../features/signals/SignalMap'
import { useMyProfile } from '../../features/social/profiles'

export default function SignalsPage() {
  const { profile } = useMyProfile()
  const home = profile?.homeBody ?? 'earth'
  return (
    <div className="space-y-4 px-1 py-2">
      <header>
        <h1 className="font-display text-2xl">Signal map</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nothing travels faster than light, so every message takes time to cross space. Pick any two places.</p>
      </header>
      <SignalMap key={home} initialFrom={home} initialTo={home === 'mars' ? 'earth' : 'mars'} />
    </div>
  )
}
