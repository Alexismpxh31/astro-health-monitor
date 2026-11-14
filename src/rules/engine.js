// Rules engine (STUB).
// Compares a reading against its thresholds and decides whether an alert must be raised.

/**
 * @typedef {import('../models/reading.js').Reading} Reading
 *
 * @typedef {Object} Evaluation
 * @property {string} alertLevelId - Level reached (see alertLevels table).
 * @property {string | null} thresholdId - Threshold that was applied.
 * @property {Object | null} recommendation - Matching row from recommendations, if any.
 */

/**
 * Evaluates one reading.
 *
 * @param {Reading} reading
 * @param {Object} context
 * @param {Object[]} context.indicators
 * @param {Object[]} context.thresholds - User-specific and default (userId null) rows.
 * @param {Object[]} context.alertLevels
 * @param {Object[]} context.recommendations
 * @returns {Evaluation | null} null when the reading is within the normal range.
 */
export function evaluateReading(reading, context) {
  // Pseudocode:
  // 1. indicator = context.indicators.find(code === reading.indicatorCode)
  // 2. threshold = context.thresholds.find(indicatorId === indicator.id && userId === reading.userId)
  //             ?? context.thresholds.find(indicatorId === indicator.id && userId === null)
  //    if no threshold -> return null
  // 3. (a null bound means "no limit on that side")
  //    if value < criticalMin or value > criticalMax -> level = CRITICAL
  //    else if value < warnMin or value > warnMax    -> level = WARNING
  //    else                                          -> return null (normal)
  // 4. recommendation = context.recommendations.find(
  //      indicatorId === indicator.id && alertLevelId === level.id) ?? null
  // 5. return { alertLevelId: level.id, thresholdId: threshold.id, recommendation }
  //
  // The caller creates the row in db.alerts:
  // { id, readingId, alertLevelId, generatedAt, attendedAt: null, syncStatus: 'pending' }
  console.warn('[rules] evaluateReading is not implemented yet', reading, context)
  return null
}
