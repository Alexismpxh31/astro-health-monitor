// Offline PIN authentication (STUB).
// PINs are never stored in plain text: only a salted hash lives in db.users (pinHash, pinSalt).

/**
 * Hashes a PIN with a per-user salt.
 *
 * @param {string} pin
 * @param {string} salt
 * @returns {Promise<string>} hex-encoded hash.
 */
export async function hashPin(pin, salt) {
  // TODO: crypto.subtle (PBKDF2, or SHA-256 over salt + pin) -> hex string.
  console.warn('[auth] hashPin is not implemented yet', typeof pin, typeof salt)
  return ''
}

/**
 * Checks a PIN against the hash stored for the user.
 *
 * @param {string} userId
 * @param {string} pin
 * @returns {Promise<boolean>}
 */
export async function verifyPin(userId, pin) {
  // TODO: user = await db.users.get(userId)
  //       return (await hashPin(pin, user.pinSalt)) === user.pinHash
  console.warn('[auth] verifyPin is not implemented yet', userId, typeof pin)
  return false
}
