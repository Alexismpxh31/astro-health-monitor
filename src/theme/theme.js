// Light / dark theme. The choice is stored per device and applied to <html data-theme>
// before the first render, so the page never flashes the wrong palette.

import { useSyncExternalStore } from 'react'

export const THEMES = ['light', 'dark']
const DEFAULT_THEME = 'light'
const STORAGE_KEY = 'astrohealth.theme'
const THEME_COLORS = { light: '#eef3fa', dark: '#0b1220' }

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return THEMES.includes(stored) ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME // storage blocked: use the default
  }
}

let current = readStored()
const listeners = new Set()

function apply(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

apply(current)

export function getTheme() {
  return current
}

export function setTheme(theme) {
  if (!THEMES.includes(theme) || theme === current) return
  current = theme
  apply(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Ignore: the choice will not persist across reloads.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** React hook: the current theme; re-renders when it changes. */
export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme)
}
