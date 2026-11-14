// Crew status for the flight surgeon panel: latest reading per indicator,
// classified against thresholds and rolled up per body system.
// Classification uses classify() from the rules engine, so the astronaut and
// flight surgeon panels always agree on the level.

import { computeBaseline, isBaselineThreshold, resolveThreshold } from '../../rules/baseline.js'
import { classify } from '../../rules/engine.js'

export const LEVEL = {
  NO_DATA: 'NO_DATA',
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
}

const SEVERITY = { NO_DATA: -1, NORMAL: 0, WARNING: 1, CRITICAL: 2 }

/**
 * Classifies a value against a threshold row. A null bound means "no limit on that side".
 *
 * @param {number} value
 * @param {{ criticalMin: number|null, warnMin: number|null, warnMax: number|null, criticalMax: number|null } | null} threshold
 * @returns {'NORMAL'|'WARNING'|'CRITICAL'|null} null when there is no threshold to compare with.
 */
export function classifyValue(value, threshold) {
  if (!threshold) return null
  return classify(value, threshold).toUpperCase()
}

/** @returns {number} sort weight, higher is worse. */
export function severityOf(level) {
  return SEVERITY[level] ?? SEVERITY.NO_DATA
}

/** Groups readings by "userId|indicatorCode". */
function readingsByKey(readings) {
  const groups = new Map()
  for (const reading of readings) {
    const key = `${reading.userId}|${reading.indicatorCode}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(reading)
  }
  return groups
}

function latestOf(history) {
  return history.reduce((latest, reading) => (reading.measuredAt > latest.measuredAt ? reading : latest))
}

/**
 * Threshold to apply to the latest reading of one user + indicator.
 * For personal-baseline thresholds (mode 'baseline') the deviations are turned into
 * absolute limits around the user's usual value.
 *
 * @param {Object[]} thresholds - All threshold rows.
 * @param {string} userId
 * @param {Object} indicator
 * @param {Object[]} history - Readings of this user + indicator.
 * @param {Object} latest - Reading being evaluated.
 * @returns {{ rule: Object|null, threshold: Object|null, baseline: { value: number|null, count: number }|null }}
 *   rule = stored row (what the editor changes); threshold = limits to compare against
 *   (null while the baseline is calibrating); baseline = null for absolute thresholds.
 */
export function effectiveThreshold(thresholds, userId, indicator, history, latest) {
  const rule = findThreshold(thresholds, userId, indicator.id)
  if (!isBaselineThreshold(rule)) return { rule, threshold: rule, baseline: null }
  const baseline = computeBaseline(history, latest.measuredAt, latest.id)
  return { rule, threshold: resolveThreshold(rule, baseline.value), baseline }
}

/**
 * Threshold that applies to a user: the personal one wins over the general one (userId null).
 *
 * @returns {Object|null}
 */
export function findThreshold(thresholds, userId, indicatorId) {
  return (
    thresholds.find((row) => row.indicatorId === indicatorId && row.userId === userId) ??
    thresholds.find((row) => row.indicatorId === indicatorId && row.userId == null) ??
    null
  )
}

/**
 * @typedef {Object} SystemStatus
 * @property {'NO_DATA'|'NORMAL'|'WARNING'|'CRITICAL'} level - Worst level among the system's indicators.
 * @property {Object|null} reading - Reading that set the level (or the latest one when it could not be evaluated).
 *
 * @typedef {Object} CrewMemberStatus
 * @property {Object} user
 * @property {Record<string, SystemStatus>} systems - Keyed by body system id.
 * @property {'NO_DATA'|'NORMAL'|'WARNING'|'CRITICAL'} overall
 * @property {string|null} lastMeasuredAt - ISO timestamp of the most recent reading.
 * @property {boolean} hasSimulatedData
 */

/**
 * Builds one status row per astronaut, worst first.
 *
 * @param {Object} params
 * @param {Object[]} params.astronauts
 * @param {Object[]} params.bodySystems
 * @param {Object[]} params.indicators
 * @param {Object[]} params.thresholds
 * @param {Object[]} params.readings - Readings of the given astronauts.
 * @returns {CrewMemberStatus[]}
 */
export function buildCrewStatus({ astronauts, bodySystems, indicators, thresholds, readings }) {
  const groups = readingsByKey(readings)

  const rows = astronauts.map((user) => {
    let lastMeasuredAt = null
    let hasSimulatedData = false
    const systems = {}

    for (const system of bodySystems) {
      let worst = null
      let anyReading = null

      for (const indicator of indicators) {
        if (indicator.bodySystemId !== system.id) continue
        const history = groups.get(`${user.id}|${indicator.code}`)
        if (!history) continue
        const reading = latestOf(history)

        anyReading ??= reading
        if (!lastMeasuredAt || reading.measuredAt > lastMeasuredAt) lastMeasuredAt = reading.measuredAt
        if (reading.source === 'simulated') hasSimulatedData = true

        const { threshold } = effectiveThreshold(thresholds, user.id, indicator, history, reading)
        const level = classifyValue(reading.value, threshold)
        if (level && (!worst || severityOf(level) > severityOf(worst.level))) worst = { level, reading }
      }

      systems[system.id] = worst ?? { level: LEVEL.NO_DATA, reading: anyReading }
    }

    const overall = Object.values(systems).reduce(
      (current, status) => (severityOf(status.level) > severityOf(current) ? status.level : current),
      LEVEL.NO_DATA,
    )

    return { user, systems, overall, lastMeasuredAt, hasSimulatedData }
  })

  return rows.sort(
    (a, b) => severityOf(b.overall) - severityOf(a.overall) || a.user.name.localeCompare(b.user.name),
  )
}
