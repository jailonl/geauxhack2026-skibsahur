// Notifications are worked out from data the app already has (no extra collection to keep in sync):
// likes/reposts/quotes/replies on my posts, direct messages that reached me, and forum activity on my
// threads and comments. "Unread" = newer than the last time I opened the Notifications page (per device).
import { createContext, useContext } from 'react'
import { findOperator } from '../social/operators'
import type { Profiles } from '../social/profiles'
import { authorOf, type FeedData } from '../comms/feedData'
import { findColonist } from '../forums/colonists'

export type NotificationKind = 'like' | 'repost' | 'reply' | 'quote' | 'message' | 'comment'

export type Actor = { name: string; handle?: string; avatarKey?: string; accent?: string; emoji?: string; isBot?: boolean }

export type Notification = {
  id: string
  kind: NotificationKind
  actor: Actor
  snippet: string // what they said, or the post they reacted to
  href: string
  at: number // ms timestamp
}

export type ForumThreadRec = { recordId: string; data: { forum: string; title: string; text?: string; authorName?: string; botName?: string }; createdBy: string; createdAt: string }
export type ForumCommentRec = { recordId: string; data: { threadId: string; parentId?: string; text: string; authorName?: string; botName?: string }; createdBy: string; createdAt: string }
export type DmRec = { recordId: string; data: { toId: string; content: string; deliverAt: number; isOperator?: number | boolean; fromId?: string }; createdBy: string; createdAt: string }

function actorFromUser(userId: string, profiles: Profiles): Actor {
  const p = profiles.byUserId.get(userId)
  return p
    ? { name: p.displayName || p.username, handle: p.username, avatarKey: p.avatarKey, accent: p.accent }
    : { name: 'A colonist' }
}

function actorFromBotName(handle: string): Actor {
  const c = findColonist(handle)
  return { name: c?.name ?? handle, handle, accent: c?.accent, emoji: '◍', isBot: true }
}

const snip = (t: string) => (t.length > 120 ? t.slice(0, 117) + '...' : t)

export function buildNotifications(args: {
  myId: string | null
  feed: FeedData
  profiles: Profiles
  dms: DmRec[]
  threads: ForumThreadRec[]
  comments: ForumCommentRec[]
  now: number
}): Notification[] {
  const { myId, feed, profiles, dms, threads, comments, now } = args
  if (!myId) return []
  const list: Notification[] = []

  // Posts I wrote. (Bot posts are also created under the app owner's account, so skip anything with botKind.)
  const mine = new Set(feed.posts.filter((p) => p.createdBy === myId && !p.data.botKind).map((p) => p.recordId))
  const isMe = (createdBy: string, isBot: boolean) => createdBy === myId && !isBot

  for (const r of feed.reactionRecords) {
    if (!mine.has(r.data.targetId) || r.createdBy === myId) continue
    const post = feed.byId.get(r.data.targetId)
    list.push({
      id: `r-${r.recordId}`,
      kind: r.data.kind,
      actor: actorFromUser(r.createdBy, profiles),
      snippet: snip(post?.data.text ?? ''),
      href: `/post/${r.data.targetId}`,
      at: new Date(r.createdAt).getTime(),
    })
  }

  for (const p of feed.posts) {
    const isBot = Boolean(p.data.botKind)
    if (isMe(p.createdBy, isBot)) continue
    const kind: NotificationKind | null =
      p.data.replyToId && mine.has(p.data.replyToId) ? 'reply' : p.data.quoteOfId && mine.has(p.data.quoteOfId) ? 'quote' : null
    if (!kind) continue
    const a = authorOf(p, profiles)
    list.push({
      id: `p-${p.recordId}`,
      kind,
      actor: { name: a.name, handle: a.handle ?? undefined, avatarKey: a.avatarKey, accent: a.accent, emoji: a.emoji, isBot },
      snippet: snip(p.data.text),
      href: `/post/${p.recordId}`,
      at: new Date(p.createdAt).getTime(),
    })
  }

  // Direct messages that have actually arrived (light-delay respected).
  for (const m of dms) {
    if (m.data.toId !== myId || m.data.deliverAt > now) continue
    const op = m.data.isOperator ? findOperator(m.data.fromId ?? '') : undefined
    const actor: Actor = op
      ? { name: op.name, handle: op.handle, accent: op.accent, emoji: '◎', isBot: true }
      : actorFromUser(m.createdBy, profiles)
    list.push({
      id: `m-${m.recordId}`,
      kind: 'message',
      actor,
      snippet: snip(m.data.content),
      href: `/messages?to=${actor.handle ?? ''}`,
      at: m.data.deliverAt,
    })
  }

  // Forum: comments on my threads, and replies to my comments.
  const myThreads = new Set(threads.filter((t) => isMe(t.createdBy, Boolean(t.data.botName))).map((t) => t.recordId))
  const myComments = new Set(comments.filter((c) => isMe(c.createdBy, Boolean(c.data.botName))).map((c) => c.recordId))
  for (const c of comments) {
    const isBot = Boolean(c.data.botName)
    if (isMe(c.createdBy, isBot)) continue
    const onMyThread = myThreads.has(c.data.threadId) && !c.data.parentId
    const replyToMe = c.data.parentId != null && myComments.has(c.data.parentId)
    if (!onMyThread && !replyToMe) continue
    list.push({
      id: `c-${c.recordId}`,
      kind: 'comment',
      actor: isBot ? actorFromBotName(c.data.botName!) : actorFromUser(c.createdBy, profiles),
      snippet: snip(c.data.text),
      href: `/thread/${c.data.threadId}`,
      at: new Date(c.createdAt).getTime(),
    })
  }

  return list.sort((a, b) => b.at - a.at).slice(0, 100)
}

export type NotificationsState = {
  items: Notification[]
  unread: number
  lastSeen: number
  markAllSeen: () => void
}

export const NotificationsContext = createContext<NotificationsState>({ items: [], unread: 0, lastSeen: 0, markAllSeen: () => {} })

export function useNotifications(): NotificationsState {
  return useContext(NotificationsContext)
}

// "Last seen" is remembered per device. try/catch because browser storage can be blocked.
export function loadLastSeen(userId: string | null): number {
  if (!userId) return 0
  try {
    return Number(localStorage.getItem(`colony-notif-seen-${userId}`)) || 0
  } catch {
    return 0
  }
}
export function saveLastSeen(userId: string | null, at: number) {
  if (!userId) return
  try {
    localStorage.setItem(`colony-notif-seen-${userId}`, String(at))
  } catch {
    // ignore
  }
}
