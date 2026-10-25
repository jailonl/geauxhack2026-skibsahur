// Loads the shared data ONCE for the whole app and hands it to every page through context:
// profiles, posts + likes/reposts, my direct messages, and recent forum activity. Notifications, the forum
// list, and the side menu are worked out from the same data, so nothing is fetched twice.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth, useQuery } from 'deepspace'
import { FeedContext, useFeedQuery } from '../comms/feedData'
import {
  NotificationsContext, buildNotifications, loadLastSeen, saveLastSeen,
  type DmRec, type ForumCommentRec, type ForumThreadRec,
} from '../notifications/notifications'
import { ProfilesContext, useProfilesQuery } from './profiles'

export type ForumActivity = { threads: ForumThreadRec[]; comments: ForumCommentRec[] }
const ForumActivityContext = createContext<ForumActivity>({ threads: [], comments: [] })

/** Recent forum threads and comments, newest first (shared). */
export function useForumActivity(): ForumActivity {
  return useContext(ForumActivityContext)
}

/** Current time, refreshed every 30 s (for "has this DM arrived yet?" in notifications). */
function useSlowClock(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export default function SocialProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const profiles = useProfilesQuery()
  const feed = useFeedQuery()
  const dms = useQuery('dms', { where: { toId: userId ?? '__signed_out__' }, orderBy: 'createdAt', orderDir: 'desc', limit: 300 })
  const threads = useQuery('threads', { orderBy: 'createdAt', orderDir: 'desc', limit: 500 })
  const comments = useQuery('comments', { orderBy: 'createdAt', orderDir: 'desc', limit: 1000 })
  const now = useSlowClock()

  const [lastSeen, setLastSeen] = useState(() => loadLastSeen(userId))
  useEffect(() => setLastSeen(loadLastSeen(userId)), [userId])

  const forumActivity = useMemo<ForumActivity>(
    () => ({ threads: threads.records as ForumThreadRec[], comments: comments.records as ForumCommentRec[] }),
    [threads.records, comments.records],
  )

  const items = useMemo(
    () =>
      buildNotifications({
        myId: userId,
        feed,
        profiles,
        dms: dms.records as DmRec[],
        threads: forumActivity.threads,
        comments: forumActivity.comments,
        now,
      }),
    [userId, feed, profiles, dms.records, forumActivity, now],
  )

  const markAllSeen = useCallback(() => {
    const at = Date.now()
    saveLastSeen(userId, at)
    setLastSeen(at)
  }, [userId])

  const notifications = useMemo(
    () => ({ items, unread: items.filter((n) => n.at > lastSeen).length, lastSeen, markAllSeen }),
    [items, lastSeen, markAllSeen],
  )

  return (
    <ProfilesContext.Provider value={profiles}>
      <FeedContext.Provider value={feed}>
        <ForumActivityContext.Provider value={forumActivity}>
          <NotificationsContext.Provider value={notifications}>{children}</NotificationsContext.Provider>
        </ForumActivityContext.Provider>
      </FeedContext.Provider>
    </ProfilesContext.Provider>
  )
}
