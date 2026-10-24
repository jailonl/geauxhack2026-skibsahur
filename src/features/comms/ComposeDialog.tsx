// Pop-up post composer, opened by the Post button in the nav rail and the floating button on phones.
import { useEffect } from 'react'
import { X } from 'lucide-react'
import PostComposer from './PostComposer'

export default function ComposeDialog({ onClose }: { onClose: () => void }) {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New post"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl rounded-2xl border border-border bg-popover p-4 shadow-[0_8px_40px_rgba(4,6,20,0.6)]">
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <PostComposer bare autoFocus onDone={onClose} />
      </div>
    </div>
  )
}
