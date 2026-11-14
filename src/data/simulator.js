// Vital signs simulator (STUB).
// Generates plausible readings for demo purposes when no dataset or BLE sensor is used.
// Readings must be built with createReading() from src/models/reading.js (source: 'simulated').

/**
 * @typedef {import('../models/reading.js').Reading} Reading
 */

/**
 * Generates one simulated reading for an indicator.
 *
 * @param {string} userId
 * @param {string} indicatorCode - e.g. 'HR', 'SPO2'.
 * @returns {Reading | null} null until implemented.
 */
export function generateReading(userId, indicatorCode) {
  // TODO: pick a baseline + noise per indicatorCode, then
  // return createReading({ userId, indicatorCode, value, unit, source: 'simulated' }).
  console.warn('[simulator] generateReading is not implemented yet', userId, indicatorCode)
  return null
}

/**
 * Starts emitting simulated readings periodically.
 *
 * @param {Object} options
 * @param {string} options.userId
 * @param {string[]} [options.indicatorCodes] - Defaults to all simulated indicators.
 * @param {number} [options.intervalMs=5000]
 * @param {(reading: Reading) => void} [options.onReading] - Called for every new reading.
 * @returns {() => void} stop function.
 */
export function startSimulator(options) {
  // TODO: setInterval -> generateReading -> db.readings.add -> rules engine -> onReading.
  console.warn('[simulator] startSimulator is not implemented yet', options)
  return () => {}
}
