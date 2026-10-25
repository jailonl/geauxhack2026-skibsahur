// The Private / Public setting for vitals. Used on the Vitals page and in Settings.
// Public shows your latest reading on your profile; your history always stays private.
import { cn } from '../../lib/utils'
import { useVitalsVisibility } from './useVitalsSharing'

export default function VitalsPrivacy({ className }: { className?: string }) {
  const { ready, isPublic, setPublic } = useVitalsVisibility()

  const option = (value: boolean, label: string) => {
    const selected = isPublic === value
    return (
      <button
        type="button"
        aria-pressed={selected}
        disabled={!ready}
        onClick={() => void setPublic(value)}
        className={cn(
          'px-3 py-1 text-sm disabled:opacity-50',
          selected ? 'bg-primary font-bold text-primary-foreground' : 'hover:bg-accent',
        )}
      >
        {label}
      </button>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div role="group" aria-label="Who can see your vitals" className="inline-flex border border-border">
        {option(false, 'Private')}
        {option(true, 'Public')}
      </div>
      <p className="text-xs text-muted-foreground">
        {isPublic
          ? 'Public: anyone can see your latest reading on your profile. Your history stays private.'
          : 'Private: only you can see your readings.'}
      </p>
    </div>
  )
}
