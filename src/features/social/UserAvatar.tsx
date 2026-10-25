// Square (pixel-style) profile picture with the person's accent color as a frame. Falls back to their initial.
import { useR2Files } from 'deepspace'
import { DEFAULT_ACCENT } from './profiles'

type Props = {
  name: string
  avatarKey?: string
  accent?: string
  size?: number // pixels
  emoji?: string // used for bots and operators instead of a photo
}

export default function UserAvatar({ name, avatarKey, accent, size = 40, emoji }: Props) {
  const { getUrl } = useR2Files({ scope: 'app' })
  const color = accent || DEFAULT_ACCENT
  const style = { width: size, height: size, boxShadow: `0 0 0 2px ${color}` }

  if (avatarKey) {
    return <img src={getUrl(avatarKey)} alt="" loading="lazy" decoding="async" className="shrink-0 rounded-full object-cover" style={style} />
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ ...style, background: color, fontSize: size * 0.42 }}
    >
      {emoji ?? (name.replace(/^@/, '')[0] ?? '?').toUpperCase()}
    </span>
  )
}
