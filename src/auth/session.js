// Local session handling. Works fully offline: the PIN is checked against the
// hash stored in IndexedDB and the session lives in sessionStorage (or only in
// memory when storage is unavailable).

import { useSyncExternalStore } from 'react'
import { db } from '../db/db.js'
import { verifyPin } from './pin.js'

/**
 * @typedef {Object} Session
 * @property {string} userId
 * @property {string|null} roleCode - roles.code of the user ('astronaut' | 'flight_surgeon').
 * @property {boolean} [isMedicalOfficer] - Astronaut flagged as crew medical officer (crew table):
 *   may view crewmates' health in read-only mode.
 * @property {string} startedAt - ISO 8601 UTC timestamp.
 *
 * @typedef {Object} LoginResult
 * @property {boolean} ok
 * @property {Session} [session] - When ok.
 * @property {'invalid'|'locked'|'unavailable'} [reason] - When not ok.
 * @property {number} [attemptsLeft] - Wrong PINs left before the lock (reason 'invalid').
 * @property {number} [lockedUntil] - Epoch ms when the lock ends (reason 'locked').
 */

export const ROLE = { ASTRONAUT: 'astronaut', FLIGHT_SURGEON: 'flight_surgeon' }
/** Landing page of a role: the crew panel for the flight surgeon, the home page for everyone else. */
export function homePathFor(roleCode) {
  return roleCode === ROLE.FLIGHT_SURGEON ? '/crew' : '/'
}

export const MAX_FAILED_ATTEMPTS = 5
export const LOCK_MS = 30000

const SESSION_KEY = 'astrohealth.session'
const LOCKS_KEY = 'astrohealth.pinLocks'

function readStored(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null')
  } catch {
    return null // storage blocked or corrupted value
  }
}

function writeStored(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable: the in-memory copy below still works until reload.
  }
}

// ---------- Session store ----------

const stored = readStored(SESSION_KEY)
/** @type {Session|null} */
let current = typeof stored?.userId === 'string' ? stored : null
const listeners = new Set()

function setSession(session) {
  current = session
  writeStored(SESSION_KEY, session)
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** @returns {Session|null} the current session, or null if nobody is logged in. */
export function getSession() {
  return current
}

/** React hook: the current session; re-renders on login and logout. */
export function useSession() {
  return useSyncExternalStore(subscribe, getSession)
}

/** @returns {Promise<Object|null>} db.users row of the logged-in user plus `roleCode`, or null. */
export async function getCurrentUser() {
  if (!current) return null
  const user = await db.users.get(current.userId)
  return user ? { ...user, roleCode: current.roleCode } : null
}

/** Ends the current session. */
export function logout() {
  setSession(null)
}

// ---------- Failed attempts lock ----------

// userId -> { failures: number, lockedUntil: number (epoch ms, 0 = not locked) }
const locks = new Map(Object.entries(readStored(LOCKS_KEY) ?? {}))

function saveLocks() {
  writeStored(LOCKS_KEY, locks.size ? Object.fromEntries(locks) : null)
}

/**
 * @param {string} userId
 * @returns {number} epoch ms when the PIN lock of this user ends, 0 when not locked.
 */
export function getLockedUntil(userId) {
  const lockedUntil = locks.get(userId)?.lockedUntil ?? 0
  return lockedUntil > Date.now() ? lockedUntil : 0
}

/** Counts one wrong PIN. @returns {{ attemptsLeft: number, lockedUntil: number }} */
function registerFailure(userId) {
  const failures = (locks.get(userId)?.failures ?? 0) + 1
  const locked = failures >= MAX_FAILED_ATTEMPTS
  // A lock starts a fresh count once it expires.
  const entry = locked
    ? { failures: 0, lockedUntil: Date.now() + LOCK_MS }
    : { failures, lockedUntil: 0 }
  locks.set(userId, entry)
  saveLocks()
  return { attemptsLeft: MAX_FAILED_ATTEMPTS - failures, lockedUntil: entry.lockedUntil }
}

// ---------- Login ----------

/**
 * Checks the PIN of a user and, when it is right, starts the session.
 * After MAX_FAILED_ATTEMPTS wrong PINs the user is locked for LOCK_MS.
 * The PIN is never stored or logged.
 *
 * @param {string} userId
 * @param {string} pin
 * @returns {Promise<LoginResult>}
 */
export async function login(userId, pin) {
  const lockedUntil = getLockedUntil(userId)
  if (lockedUntil) return { ok: false, reason: 'locked', lockedUntil }

  const user = await db.users.get(userId)
  if (!user || user.active === false) return { ok: false, reason: 'unavailable' }

  if (!(await verifyPin(user, pin))) {
    const failure = registerFailure(userId)
    return failure.lockedUntil
      ? { ok: false, reason: 'locked', lockedUntil: failure.lockedUntil }
      : { ok: false, reason: 'invalid', attemptsLeft: failure.attemptsLeft }
  }

  locks.delete(userId)
  saveLocks()
  const role = await db.roles.get(user.roleId)
  const crewRows = await db.crew.where('userId').equals(userId).toArray()
  const session = {
    userId,
    roleCode: role?.code ?? null,
    isMedicalOfficer: crewRows.some((row) => row.isMedicalOfficer),
    startedAt: new Date().toISOString(),
  }
  setSession(session)
  return { ok: true, session }
}
