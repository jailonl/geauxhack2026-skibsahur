// Form for writing a post, a reply, or a quote post. Needs an account:
// guests get a sign-in prompt, and new accounts set up their profile first.
// Signed-in users can attach a photo/video and tag a location.
import { useState } from 'react'
import { useMutations, useR2Files } from 'deepspace'
import ProfileEditor from '../social/ProfileEditor'
import { useMyProfile } from '../social/profiles'
import { SignInPrompt } from '../social/SignIn'
import type { Body, Post } from './types'

const MAX_FILE_MB = 15 // keeps uploads fast on hackathon Wi-Fi and under the free storage quota

type Props = {
  replyToId?: string
  quoteOfId?: string
  quotePreview?: React.ReactNode // the quoted post, shown inside the composer
  placeholder?: string
  onDone?: () => void
  autoFocus?: boolean
}

export default function PostComposer({ replyToId, quoteOfId, quotePreview, placeholder, onDone, autoFocus }: Props) {
  const { profile, isSignedIn, loading } = useMyProfile()
  const { ready, create } = useMutations<Post>('posts')
  const { upload, isUploading } = useR2Files({ scope: 'app' }) // 'app' scope = everyone can view

  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [showLocation, setShowLocation] = useState(false)
  const [body, setBody] = useState<Body>('mars')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  if (!isSignedIn) return <SignInPrompt action={replyToId ? 'reply' : quoteOfId ? 'quote posts' : 'post'} />
  if (loading) return null
  if (!profile) return <ProfileEditor existing={null} />

  const isReply = Boolean(replyToId)

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
    if (!text.trim() || !ready || !profile) return

    setSending(true)
    setError('')
    try {
      const post: Post = {
        text: text.trim(),
        authorName: profile.username,
        ...(replyToId ? { replyToId } : {}),
        ...(quoteOfId ? { quoteOfId } : {}),
      }

      // 1. Upload the file first (if any), then save its key on the post.
      if (file) {
        const result = await upload(file, file.name)
        if (!result.success || !result.key) throw new Error(result.error ?? 'Upload failed')
        post.mediaKey = result.key
        post.mediaType = file.type
        post.mediaAlt = alt.trim() || text.trim()
      }

      // 2. Attach the location tag if filled in. Same { body, lat, lng } format as the map.
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
      onDone?.()
    } catch (err) {
      setError('Post failed: ' + (err instanceof Error ? err.message : String(err)))
    }
    setSending(false)
  }

  const busy = sending || isUploading

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <label htmlFor={`post-text-${replyToId ?? quoteOfId ?? 'new'}`} className="sr-only">
        {isReply ? 'Reply' : 'Post'}
      </label>
      <textarea
        id={`post-text-${replyToId ?? quoteOfId ?? 'new'}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder ?? (isReply ? 'Write your reply...' : quoteOfId ? 'Add your take...' : 'Transmit to the colony...')}
        rows={isReply ? 2 : 3}
        maxLength={280}
        autoFocus={autoFocus}
        className="w-full resize-y rounded-md border bg-background p-2"
      />

      {quotePreview}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="cursor-pointer underline">
          {file ? `Attached: ${file.name}` : 'Add photo or video'}
          <input type="file" accept="image/*,video/*" onChange={onPickFile} className="sr-only" />
        </label>
        {!isReply && (
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)} />
            Tag location
          </label>
        )}
      </div>

      {file && (
        <label className="block text-sm">
          Describe the image or video (for screen readers)
          <input value={alt} onChange={(e) => setAlt(e.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" />
        </label>
      )}

      {showLocation && (
        <div className="flex flex-wrap gap-2 text-sm">
          <label>
            Body{' '}
            <select value={body} onChange={(e) => setBody(e.target.value as Body)} className="rounded-md border bg-background p-1">
              <option value="mars">Mars</option>
              <option value="moon">Moon</option>
              <option value="earth">Earth</option>
              <option value="station">Orbital Station</option>
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
        <div className="flex gap-2">
          {onDone && (
            <button type="button" onClick={onDone} className="rounded-md border px-3 py-2 text-sm">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !ready || !text.trim()}
            className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? 'Sending...' : isReply ? 'Reply' : quoteOfId ? 'Quote' : 'Post'}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
