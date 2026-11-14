// Local session handling (STUB).
// Keeps track of which crew member is using the device. Works fully offline.

/**
 * @typedef {Object} Session
 * @property {string} userId
 * @property {string} startedAt - ISO 8601 UTC timestamp.
 */

/** @returns {Session | null} the current session, or null if nobody is logged in. */
export function getSession() {
  // TODO: read the session from sessionStorage/localStorage inside try/catch.
  return null
}

/**
 * Starts a session after a successful PIN check.
 *
 * @param {string} userId
 * @returns {Session}
 */
export function startSession(userId) {
  // TODO: persist the session.
  return { userId, startedAt: new Date().toISOString() }
}

/** Ends the current session (logout). */
export function endSession() {
  // TODO: remove the persisted session.
}
