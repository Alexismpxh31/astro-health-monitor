// Mission the flight surgeon is currently working on. Kept per user for the
// browser session (sessionStorage, like the login session), so the crew pages
// know which mission to show.

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'astrohealth.mission'

function readStored() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    return typeof value?.userId === 'string' && typeof value?.missionId === 'string' ? value : null
  } catch {
    return null // storage blocked or corrupted value
  }
}

/** @type {{ userId: string, missionId: string } | null} */
let current = readStored()
const listeners = new Set()

/** @returns {string|null} mission chosen by this user, or null. */
export function getCurrentMission(userId) {
  return current?.userId === userId ? current.missionId : null
}

export function setCurrentMission(userId, missionId) {
  if (current?.userId === userId && current?.missionId === missionId) return
  current = { userId, missionId }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Storage unavailable: the in-memory value still works until reload.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** React hook: mission chosen by this user (null when none yet). */
export function useCurrentMission(userId) {
  return useSyncExternalStore(subscribe, () => getCurrentMission(userId))
}
