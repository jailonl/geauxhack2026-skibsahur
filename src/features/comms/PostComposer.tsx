// Form for writing a post, a reply, or a quote post. Needs an account:
// guests get a sign-in prompt, and new accounts set up their profile first.
// Signed-in users can attach a photo/video (with a preview before posting) and tag a location.
// A post or reply can be just a photo; the text is optional when something is attached.
import { useEffect, useMemo, useState } from 'react'
import { useMutations, useR2Files } from 'deepspace'
import { ImagePlus, X } from 'lucide-react'
import { BODY_LABELS } from '../../lib/space'
import ProfileEditor from '../social/ProfileEditor'
import UserAvatar from '../social/UserAvatar'
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
  compact?: boolean // starts as a one-line "What's happening?" bar and expands when focused
  bare?: boolean // no border/background (used inside dialogs and the timeline header)
}

export default function PostComposer({ replyToId, quoteOfId, quotePreview, placeholder, onDone, autoFocus, compact, bare }: Props) {
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
  const [expanded, setExpanded] = useState(!compact)

  // Preview of the picked photo/video (a temporary local link, freed when the file changes).
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

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
    if ((!text.trim() && !file) || !ready || !profile) return

    setSending(true)
    setError('')
    try {
      const post: Post = {
        text: text.trim() || alt.trim() || 'Shared a photo', // posts always have text; a photo-only post gets a caption
        authorName: profile.username,
        ...(replyToId ? { replyToId } : {}),
        ...(quoteOfId ? { quoteOfId } : {}),
      }

      // 1. Upload the file first (if any), then save its key on the post.
      if (file) {
        const result = await upload(file, file.name)
        if (!result.success || !result.key) throw new Error(`the photo didn't upload (${result.error ?? 'no reason given'})`)
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
      if (compact) setExpanded(false)
      onDone?.()
    } catch (err) {
      setError('Post failed: ' + (err instanceof Error ? err.message : String(err)))
    }
    setSending(false)
  }

  const busy = sending || isUploading
  const home = BODY_LABELS[profile.homeBody ?? 'earth']
  const fieldId = `post-text-${replyToId ?? quoteOfId ?? (compact ? 'home' : 'new')}`

  return (
    <form onSubmit={onSubmit} className={bare ? 'space-y-3' : 'space-y-3 rounded-xl border border-border bg-card p-4'}>
      <div className="flex gap-3">
        <UserAvatar name={profile.username} avatarKey={profile.avatarKey} accent={profile.accent} size={40} />
        <div className="min-w-0 flex-1">
          <label htmlFor={fieldId} className="sr-only">{isReply ? 'Reply' : 'Post'}</label>
          <textarea
            id={fieldId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder={placeholder ?? (isReply ? 'Post your reply' : quoteOfId ? 'Add your take' : `What's happening on ${home}?`)}
            rows={expanded ? (isReply ? 2 : 3) : 1}
            maxLength={280}
            autoFocus={autoFocus}
            className="w-full resize-none bg-transparent py-2 text-lg leading-snug outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {expanded && quotePreview}
      {expanded && (
      <>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-1.5 border border-border px-3 py-1 font-bold hover:bg-accent focus-within:outline focus-within:outline-2 focus-within:outline-[var(--color-ring)]">
          <ImagePlus className="h-4 w-4" aria-hidden />
          {file ? 'Change photo or video' : 'Add photo or video'}
          <input type="file" accept="image/*,video/*" onChange={onPickFile} className="sr-only" />
        </label>
        {!isReply && (
          <label className="flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1 hover:bg-accent">
            <input type="checkbox" checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)} className="accent-[var(--color-primary)]" />
            Tag location
          </label>
        )}
      </div>

      {file && previewUrl && (
        <div className="relative inline-block">
          {file.type.startsWith('video/') ? (
            <video src={previewUrl} className="max-h-48 border border-border" muted aria-label="Video to attach" />
          ) : (
            <img src={previewUrl} alt="Photo to attach" className="max-h-48 border border-border object-contain" />
          )}
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label="Remove the attachment"
            className="absolute right-1 top-1 bg-background/90 p-1 hover:bg-accent"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

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
            <button type="button" onClick={onDone} className="rounded-full border border-border px-4 py-2 text-sm">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !ready || (!text.trim() && !file)}
            className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : busy ? 'Sending...' : isReply ? 'Reply' : quoteOfId ? 'Quote' : 'Post'}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </>
      )}
    </form>
  )
}
