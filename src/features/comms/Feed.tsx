// The home timeline: people's posts and reposts, colony chatter from the bot colonists, and intercepted
// alien posts, with reply previews under each post. Guests can read everything; posting, replying,
// quoting, liking, and reposting need an account.
// - World tabs show posts from that world: the post's location tag, or else where the author lives.
// - Sort: newest first, most liked, or most replies.
// - Refresh: new items appear right away while you're at the top. If you've scrolled down to read, they
//   wait (so nothing jumps under you) and a "new transmissions" button shows how many are waiting.
// - Only the first 30 items are drawn; "Show more" adds 30 at a time, so slow phones stay smooth.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAuthToken, useAuth, useMutations, useUser } from 'deepspace'
import { RefreshCw } from 'lucide-react'
import { BODY_LABELS, PLANET_COLORS } from '../../lib/space'
import AlienCard from '../aliens/AlienCard'
import type { AlienPost } from '../aliens/generator'
import { latestAliens, quotesFrom } from '../aliens/latest'
import ColonyCard from '../chatter/ColonyCard'
import { latestColonyPosts, type ColonyPost } from '../chatter/colonyChatter'
import { useSlotClock } from '../chatter/stream'
import { updateSettings, useSettings } from '../settings/settings'
import { useMyProfile, useProfiles } from '../social/profiles'
import PostCard from './PostCard'
import PostComposer from './PostComposer'
import { originOf, useFeedData, useReactionActions } from './feedData'
import type { Body, Post, PostRecord } from './types'

const TABS: (Body | 'all')[] = ['all', 'mars', 'moon', 'earth', 'station']
const PAGE = 30
type Sort = 'new' | 'liked' | 'replies'

type FeedItem =
  | { kind: 'post'; key: string; at: number; mine: boolean; world: Body | null; post: PostRecord; repostedBy?: { label: string; href?: string } }
  | { kind: 'colony'; key: string; at: number; mine: false; world: Body; colony: ColonyPost }
  | { kind: 'alien'; key: string; at: number; mine: false; world: Body | null; alien: AlienPost }

/** The scrolling area of the app (the <main> element in the layout). */
function scroller(): HTMLElement | null {
  return document.querySelector('main')
}
const NEAR_TOP = 120 // px: "at the top of the feed"

export default function Feed() {
  const [tab, setTab] = useState<Body | 'all'>('all')
  const [sort, setSort] = useState<Sort>('new')
  const [limit, setLimit] = useState(PAGE)
  const [summoning, setSummoning] = useState(false)
  const { showBots, alienChatter } = useSettings()
  const [cutoff, setCutoff] = useState(() => Date.now()) // items after this time wait for a refresh
  const [spinning, setSpinning] = useState(false)

  const feed = useFeedData()
  const profiles = useProfiles()
  const { profile: me, isSignedIn } = useMyProfile()
  const { userId } = useAuth()
  const { user } = useUser()
  const { remove } = useMutations<Post>('posts')
  const reactions = useReactionActions()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true
  const botsVisible = !isSignedIn || showBots // only signed-in people get the "Show bots" switch
  const myHome: Body = me?.homeBody ?? 'earth'

  // People's posts and reposts. Worked out only when the data changes, not on every clock tick.
  const postItems = useMemo(() => {
    const list: FeedItem[] = []
    for (const p of feed.posts) {
      if (p.data.replyToId) continue
      list.push({ kind: 'post', key: p.recordId, post: p, world: originOf(p, profiles), at: new Date(p.createdAt).getTime(), mine: userId != null && p.createdBy === userId })
    }
    for (const r of feed.reposts) {
      const post = feed.byId.get(r.data.targetId)
      if (!post) continue
      const who = profiles.byUserId.get(r.createdBy)
      const isMe = userId != null && r.createdBy === userId
      list.push({
        kind: 'post',
        key: `repost-${r.recordId}`,
        post,
        world: originOf(post, profiles),
        at: new Date(r.createdAt).getTime(),
        mine: isMe,
        repostedBy: { label: isMe ? 'You' : who ? `@${who.username}` : 'Someone', href: who ? `/u/${who.username}` : undefined },
      })
    }
    return list
  }, [feed, profiles, userId])

  // Generated posts (no database): colony chatter for every world, and aliens who quote recent human posts.
  const slot = useSlotClock()
  const quotes = useMemo(() => quotesFrom(feed.posts.filter((p) => !p.data.botKind && !p.data.replyToId).map((p) => p.data.text)), [feed.posts])
  const generated = useMemo(() => {
    const list: FeedItem[] = []
    if (botsVisible) {
      const colony = latestColonyPosts(slot, 6)
      const shown = tab === 'all' ? colony.slice(0, 8) : colony.filter((c) => c.world === tab)
      for (const c of shown) list.push({ kind: 'colony', key: c.id, colony: c, world: c.world, at: c.at, mine: false })
    }
    for (const a of latestAliens(slot, alienChatter, quotes, 5)) {
      list.push({ kind: 'alien', key: a.id, alien: a, world: a.species.feedTab ?? null, at: a.at, mine: false })
    }
    return list
  }, [slot, botsVisible, tab, alienChatter, quotes])

  // Score for the sort menu (generated posts have no likes or replies, so they sort last).
  const score = (i: FeedItem) => {
    if (i.kind !== 'post' || sort === 'new') return 0
    const s = feed.stats(i.post.recordId)
    return sort === 'liked' ? s.likes + s.reposts : s.replies
  }
  const all = [...postItems.filter((i) => botsVisible || (i.kind === 'post' && !i.post.data.botKind)), ...generated]
    .filter((i) => tab === 'all' || i.world === tab)
    .sort((a, b) => score(b) - score(a) || b.at - a.at)
  // Your own posts always show at once; everything newer than the cutoff waits for a refresh.
  const waiting = all.filter((i) => i.at > cutoff && !i.mine)
  const visible = all.filter((i) => i.at <= cutoff || i.mine)

  function refresh() {
    setCutoff(Date.now())
    setSpinning(true)
    window.setTimeout(() => setSpinning(false), 600)
    scroller()?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function chooseTab(t: Body | 'all') {
    setTab(t)
    setLimit(PAGE)
  }

  // At the top of the feed, new items flow in live. Scrolled down, they wait until you come back up or tap the button.
  const waitingRef = useRef(0)
  waitingRef.current = waiting.length
  useEffect(() => {
    const main = scroller()
    if (waiting.length > 0 && (!main || main.scrollTop < NEAR_TOP)) setCutoff(Date.now())
  }, [waiting.length])
  useEffect(() => {
    const main = scroller()
    if (!main) return
    const onScroll = () => {
      if (waitingRef.current > 0 && main.scrollTop < NEAR_TOP) setCutoff(Date.now())
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [])

  // Stable handlers (same function every render) so unchanged post cards can skip re-rendering.
  // They read the latest remove/toggle through a ref.
  const actions = useRef({ remove, reactions })
  actions.current = { remove, reactions }
  const onDelete = useCallback(async (postId: string) => {
    if (!window.confirm('Delete this post?')) return
    try {
      await actions.current.remove(postId)
    } catch (err) {
      window.alert('Delete failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }, [])
  const onToggle = useCallback((postId: string, kind: 'like' | 'repost', existingId: string | null) => {
    actions.current.reactions.toggle(postId, kind, existingId)?.catch((err: unknown) => {
      window.alert('Could not update: ' + (err instanceof Error ? err.message : String(err)))
    })
  }, [])

  // Admin-only: ask the server to post one bot message right now (src/actions/index.ts).
  async function onSummonBot() {
    setSummoning(true)
    try {
      const res = await fetch('/api/actions/summonBot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getAuthToken()}` },
        body: '{}',
      })
      const result = (await res.json()) as { success: boolean; error?: string }
      if (!result.success) window.alert('Could not summon bot: ' + (result.error ?? 'unknown error'))
    } catch (err) {
      window.alert('Could not summon bot: ' + (err instanceof Error ? err.message : String(err)))
    }
    setSummoning(false)
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <h1 className="font-display text-3xl leading-none">The feed</h1>
          <p className="mt-1 text-sm text-muted-foreground">Transmissions from every colony, as they arrive.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5 text-muted-foreground">
            Sort
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as Sort)
                setLimit(PAGE)
              }}
              className="border border-border bg-card px-1.5 py-0.5 text-foreground"
            >
              <option value="new">Newest</option>
              <option value="liked">Most liked</option>
              <option value="replies">Most replies</option>
            </select>
          </label>
          {isSignedIn && (
            <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
              <input
                type="checkbox"
                checked={showBots}
                onChange={(e) => updateSettings({ showBots: e.target.checked })}
                className="accent-[var(--color-primary)]"
              />
              Show bots
            </label>
          )}
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1.5 border border-border px-2.5 py-1 font-bold hover:bg-accent"
            aria-label={waiting.length > 0 ? `Refresh, ${waiting.length} new` : 'Refresh the feed'}
          >
            <RefreshCw className={`h-4 w-4 ${spinning ? 'refresh-spin' : ''}`} aria-hidden />
            Refresh
            {waiting.length > 0 && <span className="bg-primary px-1.5 text-xs text-primary-foreground">{waiting.length}</span>}
          </button>
          {isAdmin && (
            <button type="button" onClick={onSummonBot} disabled={summoning} className="font-bold text-primary hover:underline disabled:opacity-50">
              {summoning ? 'Summoning...' : 'Summon a bot'}
            </button>
          )}
        </div>
      </header>

      <nav aria-label="Filter by world" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = tab === t
          const color = t === 'all' ? 'var(--color-primary)' : PLANET_COLORS[t]
          return (
            <button
              key={t}
              type="button"
              onClick={() => chooseTab(t)}
              aria-pressed={active}
              className="flex shrink-0 items-center gap-2 border px-3 py-1.5 text-sm font-bold"
              style={
                active
                  ? { background: `color-mix(in srgb, ${color} 22%, transparent)`, borderColor: color, color: 'var(--color-foreground)' }
                  : { borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }
              }
            >
              <span aria-hidden className="h-2 w-2" style={{ background: color }} />
              {t === 'all' ? 'Every world' : BODY_LABELS[t]}
            </button>
          )
        })}
      </nav>

      <PostComposer compact />

      {feed.status === 'loading' && <p className="py-6 text-muted-foreground">Tuning in to the colony feed...</p>}
      {feed.status === 'error' && <p role="alert" className="py-6 text-destructive">Could not load the feed: {feed.error}</p>}
      {feed.status === 'ready' && visible.length === 0 && (
        <p className="border border-dashed border-border py-10 text-center text-muted-foreground">
          {tab === 'all' ? 'No transmissions yet. Be the first to post.' : `Nothing from ${BODY_LABELS[tab]} yet.`}
        </p>
      )}

      {/* Waiting items: a button that stays at the top of the screen while you scroll. */}
      {waiting.length > 0 && (
        <div className="sticky top-2 z-10 flex justify-center">
          <button type="button" onClick={refresh} className="bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
            ▲ {waiting.length} new {waiting.length === 1 ? 'transmission' : 'transmissions'}
          </button>
        </div>
      )}

      {visible.slice(0, limit).map((item) =>
        item.kind === 'alien' ? (
          <AlienCard key={item.key} post={item.alien} />
        ) : item.kind === 'colony' ? (
          <ColonyCard key={item.key} post={item.colony} myHome={myHome} />
        ) : (
          <PostCard
            key={item.key}
            post={item.post}
            profiles={profiles}
            feed={feed}
            stats={feed.stats(item.post.recordId)}
            canDelete={isAdmin || (userId != null && item.post.createdBy === userId)}
            canReact={Boolean(me)}
            onToggle={onToggle}
            onDelete={onDelete}
            repostedBy={item.repostedBy}
            showReplyPreview
          />
        ),
      )}

      {visible.length > limit && (
        <button type="button" onClick={() => setLimit(limit + PAGE)} className="w-full border border-border py-2.5 font-bold hover:bg-accent">
          Show more ({visible.length - limit} left)
        </button>
      )}
    </div>
  )
}
