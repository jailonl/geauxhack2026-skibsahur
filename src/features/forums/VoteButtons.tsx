// Up/down vote arrows with the score between them (stacked, or in a row with `horizontal`).
import type { Votes } from './forums'

export default function VoteButtons({ id, votes, enabled, label, horizontal = false }: {
  id: string
  votes: Votes
  enabled: boolean
  label: string
  horizontal?: boolean
}) {
  const mine = votes.myVote(id)
  const button = (value: 1 | -1) => (
    <button
      type="button"
      disabled={!enabled || !votes.ready}
      onClick={() => void votes.vote(id, value)}
      aria-pressed={mine === value}
      aria-label={`${value === 1 ? 'Upvote' : 'Downvote'} ${label}`}
      title={enabled ? undefined : 'Sign in to vote'}
      className="px-1 leading-none hover:bg-muted disabled:opacity-40"
      style={mine === value ? { color: value === 1 ? '#f97316' : '#6366f1' } : undefined}
    >
      {value === 1 ? '▲' : '▼'}
    </button>
  )
  return (
    <div className={`flex items-center text-sm ${horizontal ? 'gap-1.5' : 'flex-col'}`} aria-label={`Score ${votes.score(id)}`}>
      {button(1)}
      <span className="font-semibold">{votes.score(id)}</span>
      {button(-1)}
    </div>
  )
}
