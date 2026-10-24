// "/messages" — private direct messages with light-delay, including the AI operators.
import Messages from '../../features/messages/Messages'

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-1 font-display text-xl font-bold">Messages</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Messages travel at the speed of light between your home planet and theirs, so a DM to Mars arrives minutes later.
      </p>
      <Messages />
    </div>
  )
}
