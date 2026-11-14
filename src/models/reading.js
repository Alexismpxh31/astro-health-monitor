/**
 * A single measurement of one health indicator for one user.
 *
 * @typedef {Object} Reading
 * @property {string} id - UUID.
 * @property {string} userId - UUID of the user the reading belongs to.
 * @property {string} indicatorCode - Indicator code: HR, SPO2, SBP, DBP, RR, TSKIN, BMD, RAD_D...
 * @property {number} value - Measured value.
 * @property {string} unit - Unit symbol (bpm, %, mmHg, ...).
 * @property {string} measuredAt - ISO 8601 UTC timestamp.
 * @property {'simulated'|'dataset'|'ble'} source - Where the reading came from.
 * @property {'pending'|'synced'} syncStatus - Whether it has been pushed to Supabase.
 */

/**
 * Builds a new Reading ready to be stored locally (not yet synced).
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.indicatorCode
 * @param {number} params.value
 * @param {string} params.unit
 * @param {'simulated'|'dataset'|'ble'} params.source
 * @returns {Reading}
 */
export function createReading({ userId, indicatorCode, value, unit, source }) {
  return {
    id: crypto.randomUUID(),
    userId,
    indicatorCode,
    value,
    unit,
    measuredAt: new Date().toISOString(),
    source,
    syncStatus: 'pending',
  }
}
