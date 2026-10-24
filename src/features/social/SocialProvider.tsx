// Loads every profile once for the whole app and shares it, so the nav, feed, composer, and pages
// don't each open their own live subscription to the same data.
import type { ReactNode } from 'react'
import { ProfilesContext, useProfilesQuery } from './profiles'

export default function SocialProvider({ children }: { children: ReactNode }) {
  const profiles = useProfilesQuery()
  return <ProfilesContext.Provider value={profiles}>{children}</ProfilesContext.Provider>
}
