// Who wrote a forum thread or comment: a person (links to their profile) or a bot colonist (badged).
import { Link } from 'react-router-dom'
import UserAvatar from '../social/UserAvatar'
import type { Profiles } from '../social/profiles'
import { findColonist } from './colonists'

export default function ForumAuthor({
  createdBy, botName, fallbackName, profiles, withAvatar = false,
}: { createdBy: string; botName?: string; fallbackName?: string; profiles: Profiles; withAvatar?: boolean }) {
  if (botName) {
    const c = findColonist(botName)
    return (
      <span className="inline-flex items-center gap-1.5">
        {withAvatar && <UserAvatar name={c?.name ?? botName} accent={c?.accent} emoji="◍" size={22} />}
        <strong title={c ? `${c.name}, ${c.home}` : undefined}>{c?.name ?? botName}</strong>
        <span className="rounded-full border border-border px-1.5 text-[11px] text-muted-foreground">Bot</span>
      </span>
    )
  }
  const p = profiles.byUserId.get(createdBy)
  if (!p) return <strong>@{fallbackName ?? 'unknown'}</strong>
  return (
    <Link to={`/u/${p.username}`} className="inline-flex items-center gap-1.5 hover:underline">
      {withAvatar && <UserAvatar name={p.username} avatarKey={p.avatarKey} accent={p.accent} size={22} />}
      <strong>@{p.username}</strong>
    </Link>
  )
}
