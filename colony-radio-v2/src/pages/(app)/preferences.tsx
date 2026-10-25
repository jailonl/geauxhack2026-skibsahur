// "/preferences" — the Settings page: appearance, accessibility, feed, messages, and account.
import { Link } from 'react-router-dom'
import { signOut } from 'deepspace'
import { resetSettings, speak, updateSettings, useSettings, type Settings } from '../../features/settings/settings'
import { useMyProfile } from '../../features/social/profiles'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-4 py-5">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
    </label>
  )
}

function Choice<T extends string | number>({ label, value, options, onChange }: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={
              value === o.value
                ? 'rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground'
                : 'rounded-full border border-border px-4 py-1.5 text-sm hover:bg-accent'
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default function PreferencesPage() {
  const s = useSettings()
  const { profile, isSignedIn } = useMyProfile()
  const set = (patch: Partial<Settings>) => updateSettings(patch)

  return (
    <div className="mx-auto max-w-2xl">
      <header className="border-b border-border px-4 py-4">
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Saved on this device.</p>
      </header>

      <Section title="Appearance">
        <Choice
          label="Theme"
          value={s.theme}
          onChange={(theme) => set({ theme })}
          options={[
            { value: 'nightside', label: 'Night side (dark)' },
            { value: 'dayside', label: 'Day side (light)' },
          ]}
        />
        <Choice
          label="Text size"
          value={s.textSize}
          onChange={(textSize) => set({ textSize })}
          options={[
            { value: 'small', label: 'Small' },
            { value: 'default', label: 'Default' },
            { value: 'large', label: 'Large' },
            { value: 'xlarge', label: 'Extra large' },
          ]}
        />
        <Toggle label="Compact posts" hint="Smaller pictures and tighter spacing in the feed." checked={s.compactPosts} onChange={(compactPosts) => set({ compactPosts })} />
      </Section>

      <Section title="Accessibility">
        <Toggle label="High contrast" hint="Brighter secondary text and stronger dividers." checked={s.highContrast} onChange={(highContrast) => set({ highContrast })} />
        <Toggle
          label="Readable font"
          hint="Switches all text to Atkinson Hyperlegible, a typeface designed for low-vision readers."
          checked={s.readableFont}
          onChange={(readableFont) => set({ readableFont })}
        />
        <Toggle label="Reduce motion" hint="Turns off animations." checked={s.reduceMotion} onChange={(reduceMotion) => set({ reduceMotion })} />
        <Toggle
          label="Read-aloud buttons"
          hint="Adds a speaker button to posts and messages, for hands-busy work in a suit."
          checked={s.readAloud}
          onChange={(readAloud) => set({ readAloud })}
        />
        {s.readAloud && (
          <button type="button" onClick={() => speak('Read aloud is on. Signal received.')} className="text-sm underline">
            Test the voice
          </button>
        )}
      </Section>

      <Section title="Feed">
        <Toggle label="Show bot posts" hint="Habitat computers, rovers, relays, and unexplained signals." checked={s.showBots} onChange={(showBots) => set({ showBots })} />
        <Toggle
          label="Bandwidth saver"
          hint="Photos and videos load only when you tap them. Useful on a slow Mars link."
          checked={s.bandwidthSaver}
          onChange={(bandwidthSaver) => set({ bandwidthSaver })}
        />
      </Section>

      <Section title="Messages">
        <Choice
          label="Default signal speed"
          value={s.defaultSpeed}
          onChange={(defaultSpeed) => set({ defaultSpeed })}
          options={[
            { value: 1, label: 'Real time' },
            { value: 10, label: '10× demo' },
            { value: 60, label: '60× demo' },
          ]}
        />
      </Section>

      <Section title="Account">
        {isSignedIn ? (
          <div className="flex flex-wrap gap-3">
            <Link to="/profile" className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-accent">
              {profile ? 'Edit profile' : 'Set up profile'}
            </Link>
            {profile && (
              <Link to={`/u/${profile.username}`} className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-accent">
                View my profile
              </Link>
            )}
            <button type="button" onClick={() => signOut()} className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-accent">
              Sign out
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sign in to edit your profile.</p>
        )}
        <button type="button" onClick={resetSettings} className="text-sm text-muted-foreground underline">
          Reset all settings
        </button>
      </Section>
    </div>
  )
}
