import { db } from '../../db/db.js'
import { buildCrewStatus, classifyValue, effectiveThreshold, LEVEL, severityOf } from '../crew/crewStatus.js'

// Data for the astronaut home dashboard. Everything comes from IndexedDB (offline)
// and uses the same classification as the flight surgeon panel, so both always
// show the same level for the same reading.

const SERIES_POINTS = 24

/**
 * @param {string} userId
 * @returns {Promise<null | {
 *   user: Object, systems: Object[], byCode: Record<string, Object>,
 *   hasData: boolean, hasSimulatedData: boolean, lastMeasuredAt: string|null
 * }>}
 */
export async function loadHomeData(userId) {
  const user = await db.users.get(userId)
  if (!user) return null

  const [bodySystems, indicators, thresholds, readings] = await Promise.all([
    db.bodySystems.toArray(),
    db.indicators.toArray(),
    db.thresholds.toArray(),
    db.readings.where('userId').equals(userId).toArray(),
  ])
  readings.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))

  const historyByCode = new Map()
  for (const reading of readings) {
    if (!historyByCode.has(reading.indicatorCode)) historyByCode.set(reading.indicatorCode, [])
    historyByCode.get(reading.indicatorCode).push(reading)
  }

  // One entry per indicator with readings: latest value, level and a short series for sparklines.
  const byCode = {}
  for (const indicator of indicators) {
    const history = historyByCode.get(indicator.code)
    if (!history) continue
    const latest = history.at(-1)
    const { threshold } = effectiveThreshold(thresholds, userId, indicator, history, latest)
    byCode[indicator.code] = {
      indicator,
      latest,
      level: classifyValue(latest.value, threshold) ?? LEVEL.NO_DATA,
      series: history.slice(-SERIES_POINTS).map((reading) => reading.value),
    }
  }

  const [status] = buildCrewStatus({ astronauts: [user], bodySystems, indicators, thresholds, readings })
  const systems = bodySystems
    .map((system) => ({
      system,
      level: status.systems[system.id]?.level ?? LEVEL.NO_DATA,
      items: indicators.filter((indicator) => indicator.bodySystemId === system.id).map((indicator) => ({
        indicator,
        entry: byCode[indicator.code] ?? null,
      })),
    }))
    .filter((row) => row.items.length > 0)

  return {
    user,
    systems,
    byCode,
    worstSystemCode: [...systems].sort((a, b) => severityOf(b.level) - severityOf(a.level))[0]?.system.code ?? null,
    hasData: readings.length > 0,
    hasSimulatedData: readings.some((reading) => reading.source === 'simulated'),
    lastMeasuredAt: status.lastMeasuredAt,
  }
}
