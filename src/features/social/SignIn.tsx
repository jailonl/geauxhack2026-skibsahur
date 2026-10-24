// Sign-in with GitHub or Google. DeepSpace creates the account automatically on first sign-in;
// the app then asks for a @username and profile (see ProfileEditor).
import { useState } from 'react'

function signInWith(provider: 'github' | 'google') {
  window.location.href = `/api/auth/social-redirect?provider=${provider}`
}

export function SignInButtons() {
  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => signInWith('github')}
        className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
      >
        Continue with GitHub
      </button>
      <button type="button" onClick={() => signInWith('google')} className="rounded-md border px-4 py-2 font-semibold">
        Continue with Google
      </button>
    </div>
  )
}

/** Sign-in dialog (used by the nav bar). */
export function SignInDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm rounded-2xl border bg-card p-6">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 text-muted-foreground">
          ✕
        </button>
        <h2 id="signin-title" className="mb-1 text-xl font-bold">Join the colony network</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Sign in to post, reply, message, and vote. New here? Signing in creates your account, then you pick a @username.
        </p>
        <SignInButtons />
      </div>
    </div>
  )
}

/** Inline card shown where a guest would otherwise see a post box or message box. */
export function SignInPrompt({ action }: { action: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-dashed bg-card p-4 text-center">
      <p className="mb-2 text-sm text-muted-foreground">You're browsing as a guest. Sign in to {action}.</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Sign in
      </button>
      {open && <SignInDialog onClose={() => setOpen(false)} />}
    </div>
  )
}
