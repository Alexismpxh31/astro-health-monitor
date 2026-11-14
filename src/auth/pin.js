// Offline PIN authentication.
// PINs are never stored or logged in plain text: only a salted hash lives in
// db.users (pinSalt, pinHash). Same rule as the server (supabase/setup_final.sql):
//   pinHash = hex SHA-256 of (pinSalt || pin), no separator.

/**
 * Hashes a PIN with a per-user salt using Web Crypto. Works offline.
 *
 * @param {string} salt - The user's pinSalt.
 * @param {string} pin
 * @returns {Promise<string>} lowercase hex SHA-256 of salt + pin.
 */
export async function hashPin(salt, pin) {
  // crypto.subtle only exists in secure contexts (https or localhost).
  if (!globalThis.crypto?.subtle) throw new Error('[auth] Web Crypto is not available')
  const bytes = new TextEncoder().encode(`${salt}${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Checks a PIN against the hash stored for a user.
 *
 * @param {{ pinSalt?: string|null, pinHash?: string|null }|null|undefined} user - Row from db.users.
 * @param {string} pin
 * @returns {Promise<boolean>} false when the user has no PIN set.
 */
export async function verifyPin(user, pin) {
  if (!user?.pinSalt || !user?.pinHash || typeof pin !== 'string' || !pin) return false
  return (await hashPin(user.pinSalt, pin)) === user.pinHash.toLowerCase()
}
