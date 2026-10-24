// Form for writing a post.
// Guests (not signed in) type a display name and can post text + an optional location tag.
// Signed-in users also get photo/video upload, since DeepSpace requires sign-in for uploads.
import { useState } from 'react'
import { useAuth, useMutations, useR2Files, useUser } from 'deepspace'
import type { Body, Post } from './types'

const MAX_FILE_MB = 15 // keeps uploads fast on hackathon Wi-Fi and under the free storage quota
const GUEST_NAME_KEY = 'guestName'

// Remember a guest's name in their browser so they don't retype it every post.
// try/catch because browser storage can be blocked (private windows, strict settings).
function loadGuestName(): string {
  try {
    return localStorage.getItem(GUEST_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
function saveGuestName(name: string) {
  try {
    localStorage.setItem(GUEST_NAME_KEY, name)
  } catch {
    // ignore: the name just won't be remembered
  }
}

export default function PostComposer() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { ready, create } = useMutations<Post>('posts')
  const { upload, isUploading } = useR2Files({ scope: 'app' }) // 'app' scope = everyone can view

  const [guestName, setGuestName] = useState(loadGuestName)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [showLocation, setShowLocation] = useState(false)
  const [body, setBody] = useState<Body>('mars')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null
    if (picked && picked.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File is too big. Max ${MAX_FILE_MB} MB.`)
      e.target.value = ''
      return
    }
    setError('')
    setFile(picked)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault() // stop the page from reloading
    if (!text.trim() || !ready) return
    if (!isSignedIn && !guestName.trim()) {
      setError('Enter a display name to post as a guest.')
      return
    }

    setSending(true)
    setError('')
    try {
      const authorName = isSignedIn ? user?.name ?? 'Unknown colonist' : guestName.trim() + ' (guest)'
      if (!isSignedIn) saveGuestName(guestName.trim())

      const post: Post = { text: text.trim(), authorName }

      // 1. Upload the file first (signed-in users only), then save its key on the post.
      if (isSignedIn && file) {
        const result = await upload(file, file.name)
        if (!result.success || !result.key) {
          throw new Error(result.error ?? 'Upload failed')
        }
        post.mediaKey = result.key
        post.mediaType = file.type
        post.mediaAlt = alt.trim() || text.trim()
      }

      // 2. Attach the location tag if the user filled it in.
      if (showLocation && lat !== '' && lng !== '') {
        post.body = body
        post.lat = Number(lat)
        post.lng = Number(lng)
      }

      // 3. Save. DeepSpace syncs it to every open feed in real time.
      await create(post)

      setText('')
      setFile(null)
      setAlt('')
      setShowLocation(false)
      setLat('')
      setLng('')
    } catch (err) {
      setError('Post failed: ' + (err instanceof Error ? err.message : String(err)))
    }
    setSending(false)
  }

  const busy = sending || isUploading

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-3 rounded-lg border bg-card p-4">
      {!isSignedIn && (
        <div>
          <label htmlFor="guest-name" className="block text-sm">Display name (posting as a guest)</label>
          <input
            id="guest-name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={30}
            placeholder="Colonist_42"
            className="w-full rounded-md border bg-background p-2"
          />
        </div>
      )}

      <label htmlFor="post-text" className="sr-only">Post text</label>
      <textarea
        id="post-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Transmit to the colony..."
        rows={3}
        maxLength={280}
        className="w-full resize-y rounded-md border bg-background p-2"
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {isSignedIn ? (
          <label className="cursor-pointer underline">
            {file ? `Attached: ${file.name}` : 'Add photo or video'}
            <input type="file" accept="image/*,video/*" onChange={onPickFile} className="sr-only" />
          </label>
        ) : (
          <span className="text-muted-foreground">Sign in (top right) to attach photos or videos.</span>
        )}
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)} />
          Tag location
        </label>
      </div>

      {isSignedIn && file && (
        <div>
          <label htmlFor="post-alt" className="block text-sm">Describe the image or video (for screen readers)</label>
          <input
            id="post-alt"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="w-full rounded-md border bg-background p-2"
          />
        </div>
      )}

      {showLocation && (
        <div className="flex flex-wrap gap-2 text-sm">
          <label>
            Body{' '}
            <select value={body} onChange={(e) => setBody(e.target.value as Body)} className="rounded-md border bg-background p-1">
              <option value="mars">Mars</option>
              <option value="moon">Moon</option>
              <option value="earth">Earth</option>
              <option value="station">Station</option>
            </select>
          </label>
          <label>
            Lat <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} className="w-24 rounded-md border bg-background p-1" />
          </label>
          <label>
            Lng <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} className="w-24 rounded-md border bg-background p-1" />
          </label>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{text.length}/280</span>
        <button
          type="submit"
          disabled={busy || !ready || !text.trim()}
          className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? 'Sending...' : 'Post'}
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
