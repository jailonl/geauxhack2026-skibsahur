// One colony chatter post in the feed: the same transmission look as a person's post (origin strip with
// the light delay to you), but read-only and badged "Bot".
import { memo } from 'react'
import { BODY_LABELS, PLANET_COLORS, formatDelay, lightDelaySeconds, type Place } from '../../lib/space'
import { useSettings } from '../settings/settings'
import UserAvatar from '../social/UserAvatar'
import type { ColonyPost } from './colonyChatter'

function secondsAgo(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function ColonyCard({ post, myHome }: { post: ColonyPost; myHome: Place }) {
  const color = PLANET_COLORS[post.world]
  const delay = lightDelaySeconds(post.world, myHome, post.at)
  const c = post.colonist
  const { bandwidthSaver } = useSettings()

  return (
    <article className="border border-border bg-card">
      <div
        className="font-signal flex flex-wrap items-center gap-x-2 px-4 py-1 text-sm"
        style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, borderBottom: `1px solid color-mix(in srgb, ${color} 35%, transparent)` }}
      >
        <span style={{ color }}>From {BODY_LABELS[post.world]}</span>
        {delay >= 0.05 && (
          <span className="text-muted-foreground">reached {BODY_LABELS[myHome]} {formatDelay(delay)} after it was sent</span>
        )}
      </div>
      <div className="flex gap-3 px-4 py-3">
        <UserAvatar name={c.name} accent={c.accent} size={40} />
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold">{c.name}</span>
            <span className="text-sm text-muted-foreground">@{c.handle}</span>
            <span className="border border-border px-1.5 text-xs text-muted-foreground">Bot</span>
            <span className="ml-auto text-sm text-muted-foreground">{secondsAgo(post.at)}</span>
          </header>
          <p className="font-post mt-1 text-[1.05rem] break-words">{post.text}</p>
          {post.image && !bandwidthSaver && (
            <img src={post.image.mediaKey} alt={post.image.mediaAlt} loading="lazy" decoding="async" className="mt-3 max-h-72 w-full object-cover" />
          )}
        </div>
      </div>
    </article>
  )
}

export default memo(ColonyCard)
