// Crew status for the flight surgeon panel: latest reading per indicator,
// classified against thresholds and rolled up per body system.
// TODO: switch classifyValue() to evaluateReading() from src/rules/engine.js
// once the rules engine is implemented, so both panels share one logic.

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
  const { criticalMin, warnMin, warnMax, criticalMax } = threshold
  const below = (limit) => limit != null && value < limit
  const above = (limit) => limit != null && value > limit

  if (below(criticalMin) || above(criticalMax)) return LEVEL.CRITICAL
  if (below(warnMin) || above(warnMax)) return LEVEL.WARNING
  return LEVEL.NORMAL
}

/** @returns {number} sort weight, higher is worse. */
export function severityOf(level) {
  return SEVERITY[level] ?? SEVERITY.NO_DATA
}

function latestReadingsByKey(readings) {
  const latest = new Map()
  for (const reading of readings) {
    const key = `${reading.userId}|${reading.indicatorCode}`
    const previous = latest.get(key)
    if (!previous || reading.measuredAt > previous.measuredAt) latest.set(key, reading)
  }
  return latest
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
  const latest = latestReadingsByKey(readings)

  const rows = astronauts.map((user) => {
    let lastMeasuredAt = null
    let hasSimulatedData = false
    const systems = {}

    for (const system of bodySystems) {
      let worst = null
      let anyReading = null

      for (const indicator of indicators) {
        if (indicator.bodySystemId !== system.id) continue
        const reading = latest.get(`${user.id}|${indicator.code}`)
        if (!reading) continue

        anyReading ??= reading
        if (!lastMeasuredAt || reading.measuredAt > lastMeasuredAt) lastMeasuredAt = reading.measuredAt
        if (reading.source === 'simulated') hasSimulatedData = true

        const level = classifyValue(reading.value, findThreshold(thresholds, user.id, indicator.id))
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
