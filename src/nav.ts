/**
 * Navigation Config
 *
 * One entry per nav item. Routes are handled by generouted (file-based routing in src/pages/);
 * this just controls what appears in the top bar. Icons are matched by path in
 * src/components/Navigation.tsx. Profile, Settings, Search, and Notifications live in the top bar's
 * right side because they depend on who's signed in.
 */

type Role = 'viewer' | 'member' | 'admin'

export interface NavItem {
  path: string
  label: string
  roles?: Role[]
  devOnly?: boolean
}

export const nav: NavItem[] = [
  { path: '/home', label: 'Feed' },
  // The /api-status debug page still exists — add
  // `{ path: '/api-status', label: 'API Status', devOnly: true }` to surface it.
  // ── Features add nav items below this line ──
  { path: '/forums', label: 'Forums' },
  { path: '/messages', label: 'Messages' },
  { path: '/map', label: 'Map' },
  { path: '/vitals', label: 'Vitals' },
  { path: '/settings', label: 'Admin', roles: ['admin'] },
]
