// One intercepted alien post in the feed: who sent it, from which world, how long the signal took to
// reach Earth, the message in their language, and a Translate button that shows the English.
import { useState } from 'react'
import { Languages, Volume2 } from 'lucide-react'
import { formatLongDelay } from '../../lib/space'
import { speak, useSettings } from '../settings/settings'
import type { AlienPost } from './generator'

function secondsAgo(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

export default function AlienCard({ post }: { post: AlienPost }) {
  const [translated, setTranslated] = useState(false)
  const { readAloud } = useSettings()
  const { species } = post
  const translationId = `${post.id}-english`

  return (
    <article className="border border-border bg-card" aria-label={`Alien transmission from ${post.name} on ${species.world}`}>
      <div
        className="font-signal flex flex-wrap items-center gap-x-2 px-4 py-1 text-sm"
        style={{ background: `color-mix(in srgb, ${species.color} 16%, transparent)`, borderBottom: `1px solid color-mix(in srgb, ${species.color} 35%, transparent)` }}
      >
        <span style={{ color: species.color }}>&gt; INTERCEPTED FROM {species.world.toUpperCase()}</span>
        <span className="text-muted-foreground">signal took {formatLongDelay(post.signalSeconds)} to reach Earth</span>
      </div>

      <div className="px-4 py-3">
        <header className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-bold">{post.name}</span>
          <span className="border px-1.5 text-xs" style={{ borderColor: species.color, color: species.color }}>
            {species.name}
          </span>
          <span className="text-sm text-muted-foreground">of {post.from}</span>
          <span className="ml-auto text-sm text-muted-foreground">{secondsAgo(post.at)}</span>
        </header>

        <p className="font-post mt-1 text-[1.05rem] tracking-wide break-words">{post.alien}</p>

        {translated && (
          <p id={translationId} className="mt-2 border-l-4 pl-3 text-[0.95rem] text-muted-foreground" style={{ borderColor: species.color }}>
            {post.english}
          </p>
        )}

        <footer className="-ml-2 mt-2 flex flex-wrap gap-1 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => setTranslated(!translated)}
            aria-expanded={translated}
            aria-controls={translated ? translationId : undefined}
            className="flex items-center gap-1.5 px-2 py-1 hover:bg-accent/60 hover:text-foreground"
          >
            <Languages className="h-4 w-4" aria-hidden />
            {translated ? 'Hide translation' : 'Translate'}
          </button>
          {readAloud && (
            <button
              type="button"
              onClick={() => speak(`${post.name} of ${species.world} says: ${post.english}`)}
              aria-label="Read the translation aloud"
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-accent/60 hover:text-foreground"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
            </button>
          )}
        </footer>
      </div>
    </article>
  )
}
