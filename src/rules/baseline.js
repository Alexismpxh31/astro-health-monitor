// Personal-baseline thresholds.
// Some indicators (e.g. skin temperature) have no universal clinical range: what
// matters is how far a value moves from that person's usual value. A threshold row
// with `mode: 'baseline'` stores DEVIATIONS (minCritical / minNormal / maxNormal /
// maxCritical, in the indicator's unit) from the personal baseline instead of
// absolute limits. resolveThreshold() turns it into a normal absolute threshold,
// so classify() works unchanged.

/** Readings older than this are not part of the baseline. */
export const BASELINE_WINDOW_MS = 24 * 60 * 60 * 1000

/** Below this many past readings the baseline is still "calibrating". */
export const BASELINE_MIN_READINGS = 10

const BOUNDS = ['minCritical', 'minNormal', 'maxNormal', 'maxCritical']

/** @returns {boolean} true when the threshold is relative to the personal baseline. */
export function isBaselineThreshold(threshold) {
  return threshold?.mode === 'baseline'
}

function median(sortedValues) {
  const middle = Math.floor(sortedValues.length / 2)
  return sortedValues.length % 2
    ? sortedValues[middle]
    : (sortedValues[middle - 1] + sortedValues[middle]) / 2
}

/**
 * Personal baseline = median of the user's readings of one indicator in the
 * BASELINE_WINDOW_MS before `atIso` (the reading being evaluated is excluded).
 *
 * @param {Array<{ id: string, value: number, measuredAt: string }>} history - Readings of ONE user and ONE indicator.
 * @param {string} atIso - Time of the reading being evaluated.
 * @param {string} [excludeId] - Id of the reading being evaluated.
 * @returns {{ value: number|null, count: number }} value is null while calibrating.
 */
export function computeBaseline(history, atIso, excludeId) {
  const from = new Date(Date.parse(atIso) - BASELINE_WINDOW_MS).toISOString()
  const values = history
    .filter((reading) => reading.id !== excludeId && reading.measuredAt >= from && reading.measuredAt <= atIso)
    .map((reading) => reading.value)
    .sort((a, b) => a - b)

  if (values.length < BASELINE_MIN_READINGS) return { value: null, count: values.length }
  return { value: Math.round(median(values) * 100) / 100, count: values.length }
}

/**
 * Turns a baseline threshold into an absolute one (baseline + deviation).
 * Absolute thresholds are returned unchanged.
 *
 * @param {Object|null} threshold
 * @param {number|null} baseline - From computeBaseline().
 * @returns {Object|null} null when the threshold needs a baseline that is not available yet.
 */
export function resolveThreshold(threshold, baseline) {
  if (!isBaselineThreshold(threshold)) return threshold
  if (baseline == null) return null

  const resolved = { ...threshold, baseline }
  for (const bound of BOUNDS) {
    resolved[bound] = threshold[bound] == null ? null : Math.round((baseline + threshold[bound]) * 100) / 100
  }
  return resolved
}
