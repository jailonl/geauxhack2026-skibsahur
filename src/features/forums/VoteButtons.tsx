// Up/down vote arrows with the score between them.
import type { Votes } from './forums'

export default function VoteButtons({ id, votes, enabled, label }: { id: string; votes: Votes; enabled: boolean; label: string }) {
  const mine = votes.myVote(id)
  const button = (value: 1 | -1) => (
    <button
      type="button"
      disabled={!enabled || !votes.ready}
      onClick={() => void votes.vote(id, value)}
      aria-pressed={mine === value}
      aria-label={`${value === 1 ? 'Upvote' : 'Downvote'} ${label}`}
      title={enabled ? undefined : 'Sign in to vote'}
      className="rounded px-1 leading-none hover:bg-muted disabled:opacity-40"
      style={mine === value ? { color: value === 1 ? '#f97316' : '#6366f1' } : undefined}
    >
      {value === 1 ? '▲' : '▼'}
    </button>
  )
  return (
    <div className="flex flex-col items-center text-sm" aria-label={`Score ${votes.score(id)}`}>
      {button(1)}
      <span className="font-semibold">{votes.score(id)}</span>
      {button(-1)}
    </div>
  )
}
