// The clock behind the generated posts (alien chatter and colony chatter). Time is cut into 3-second
// slots; each slot may hold a post, worked out from the slot number. Nothing is saved: every viewer
// computes the same posts from the same clock, so everyone sees the same stream.
import { useEffect, useState } from 'react'

export const SLOT_MS = 3000

/** The current slot number, updated every 3 seconds. */
export function useSlotClock(enabled = true): number {
  const [slot, setSlot] = useState(() => Math.floor(Date.now() / SLOT_MS))
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setSlot(Math.floor(Date.now() / SLOT_MS)), SLOT_MS)
    return () => window.clearInterval(id)
  }, [enabled])
  return slot
}

/** Walk back from `fromSlot`, collecting posts until `done` says we have enough (or we've looked far enough). */
export function collect<T>(fromSlot: number, make: (slot: number) => T | null, done: (items: T[]) => boolean, lookBack = 2400): T[] {
  const items: T[] = []
  for (let slot = fromSlot; slot > fromSlot - lookBack && !done(items); slot--) {
    const item = make(slot)
    if (item) items.push(item)
  }
  return items
}
