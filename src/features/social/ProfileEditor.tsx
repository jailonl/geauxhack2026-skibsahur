// Create or edit your profile: @username, display name, picture, bio, home planet, and accent color.
// New accounts see this before they can post; it's also the /profile page.
import { useState } from 'react'
import { useMutations, useR2Files } from 'deepspace'
import { BODY_LABELS, type Body } from '../../lib/space'
import UserAvatar from './UserAvatar'
import { ACCENTS, DEFAULT_ACCENT, usernameProblem, type Profile, type ProfileRecord } from './profiles'

const MAX_AVATAR_MB = 5

export default function ProfileEditor({ existing, onSaved }: { existing: ProfileRecord | null; onSaved?: () => void }) {
  const { ready, createConfirmed, putConfirmed } = useMutations<Profile>('profiles')
  const { upload, isUploading } = useR2Files({ scope: 'app' })

  const [username, setUsername] = useState(existing?.username ?? '')
  const [displayName, setDisplayName] = useState(existing?.displayName ?? '')
  const [bio, setBio] = useState(existing?.bio ?? '')
  const [homeBody, setHomeBody] = useState<Body>(existing?.homeBody ?? 'earth')
  const [accent, setAccent] = useState(existing?.accent ?? DEFAULT_ACCENT)
  const [avatarKey, setAvatarKey] = useState(existing?.avatarKey)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setError(`Picture is too big. Max ${MAX_AVATAR_MB} MB.`)
      return
    }
    setError('')
    const result = await upload(file, file.name)
    if (result.success && result.key) setAvatarKey(result.key)
    else setError('Upload failed: ' + (result.error ?? 'unknown error') + ' (uploads work after the app has been deployed once)')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = username.trim().toLowerCase()
    const problem = usernameProblem(name)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setSaving(true)
    const data: Profile = {
      username: name,
      displayName: displayName.trim() || name,
      bio: bio.trim(),
      homeBody,
      accent,
      avatarKey: avatarKey ?? '', // '' clears a removed picture
    }
    try {
      if (existing) await putConfirmed(existing.recordId, data)
      else await createConfirmed(data)
      setSaved(true)
      onSaved?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(/duplicate/i.test(message) ? `@${name} is taken. Try another.` : 'Could not save: ' + message)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      {!existing && (
        <div>
          <h2 className="text-lg font-bold">Set up your colonist profile</h2>
          <p className="text-sm text-muted-foreground">Pick a @username so people can find and message you.</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <UserAvatar name={username || '?'} avatarKey={avatarKey} accent={accent} size={64} />
        <label className="cursor-pointer text-sm underline">
          {isUploading ? 'Uploading...' : avatarKey ? 'Change picture' : 'Upload a picture'}
          <input type="file" accept="image/*" onChange={onPickAvatar} className="sr-only" />
        </label>
        {avatarKey && (
          <button type="button" onClick={() => setAvatarKey(undefined)} className="text-sm text-muted-foreground underline">
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Username
          <span className="mt-1 flex items-center rounded-md border bg-background">
            <span className="pl-2 text-muted-foreground">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={20}
              placeholder="nova_rider"
              className="w-full bg-transparent p-2 outline-none"
            />
          </span>
        </label>
        <label className="text-sm">
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder="Nova Rider"
            className="mt-1 w-full rounded-md border bg-background p-2"
          />
        </label>
      </div>

      <label className="block text-sm">
        Bio
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={2}
          placeholder="Hydroponics lead at Jezero Base."
          className="mt-1 w-full rounded-md border bg-background p-2"
        />
      </label>

      <label className="block text-sm">
        Home planet <span className="text-muted-foreground">(sets the light-delay on your messages)</span>
        <select
          value={homeBody}
          onChange={(e) => setHomeBody(e.target.value as Body)}
          className="mt-1 block rounded-md border bg-background p-2"
        >
          {(Object.keys(BODY_LABELS) as Body[]).map((b) => (
            <option key={b} value={b}>{BODY_LABELS[b]}</option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="mb-1 text-sm">Accent color</legend>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAccent(c)}
              aria-label={`Accent color ${c}`}
              aria-pressed={accent === c}
              className="h-8 w-8 rounded-full"
              style={{ background: c, outline: accent === c ? '3px solid currentColor' : 'none', outlineOffset: 2 }}
            />
          ))}
        </div>
      </fieldset>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-muted-foreground">Saved.</p>}

      <button
        type="submit"
        disabled={!ready || saving || isUploading || !username.trim()}
        className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {saving ? 'Saving...' : existing ? 'Save profile' : 'Create profile'}
      </button>
    </form>
  )
}
