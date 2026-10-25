// Personal settings (theme, text size, motion, feed and message preferences).
// Saved in this browser only. Wrapped in try/catch because browser storage can be blocked.
import { useSyncExternalStore } from 'react'
import type { AlienChatter } from '../aliens/useAlienStream'

export type Settings = {
  theme: 'nightside' | 'dayside'
  textSize: 'small' | 'default' | 'large' | 'xlarge'
  highContrast: boolean
  readableFont: boolean // Atkinson Hyperlegible everywhere
  reduceMotion: boolean
  compactPosts: boolean
  bandwidthSaver: boolean // don't load photos/videos until tapped (Mars has slow links)
  showBots: boolean
  alienChatter: AlienChatter // how often intercepted alien posts appear in the feed
  readAloud: boolean // show a "read aloud" button on posts and messages
  defaultSpeed: 1 | 10 | 60 // light-delay demo speed for new messages
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'nightside',
  textSize: 'default',
  highContrast: false,
  readableFont: false,
  reduceMotion: false,
  compactPosts: false,
  bandwidthSaver: false,
  showBots: true,
  alienChatter: 'lively',
  readAloud: true,
  defaultSpeed: 1,
}

const KEY = 'colony-settings-v1'
const TEXT_SIZES: Record<Settings['textSize'], string> = { small: '14px', default: '16px', large: '18px', xlarge: '20px' }

const listeners = new Set<() => void>()
let current: Settings = load()

function load(): Settings {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Put the appearance settings onto <html> so the CSS in themes.css picks them up. */
export function applySettings(s: Settings = current) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  html.setAttribute('data-theme', s.theme)
  html.style.setProperty('--app-font-size', TEXT_SIZES[s.textSize])
  if (s.highContrast) html.setAttribute('data-contrast', 'high')
  else html.removeAttribute('data-contrast')
  if (s.readableFont) html.setAttribute('data-font', 'readable')
  else html.removeAttribute('data-font')
  if (s.reduceMotion) html.setAttribute('data-motion', 'reduced')
  else html.removeAttribute('data-motion')
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // ignore: the setting still applies until the page reloads
  }
  applySettings(current)
  listeners.forEach((l) => l())
}

export function resetSettings() {
  updateSettings(DEFAULT_SETTINGS)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Read settings in a component; re-renders when they change. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, () => current, () => DEFAULT_SETTINGS)
}

/** Read text aloud with the browser's built-in voice (no API needed). */
export function speak(text: string) {
  try {
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  } catch {
    // speech not supported in this browser
  }
}
