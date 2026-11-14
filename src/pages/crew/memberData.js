import { getSession } from '../../auth/session.js'
import { db } from '../../db/db.js'
import { classifyValue, effectiveThreshold, hasRole, LEVEL, severityOf } from './crewStatus.js'

// Data for /crew/:userId. Everything comes from IndexedDB, so the screen works offline.
// Readings from any source (simulator, NASA dataset adapter, BLE) show up here as long
// as they follow the Reading shape in src/models/reading.js.

const MAX_POINTS = 60
const FLIGHT_SURGEON_ROLE_CODE = 'flight_surgeon'

function resolveSurgeonId(roles, users) {
  // TODO(auth): remove the fallback once the PIN login stores a real session.
  const session = getSession()
  if (session?.userId) return session.userId
  return users.find((user) => hasRole(roles, user, FLIGHT_SURGEON_ROLE_CODE))?.id ?? null
}

/**
 * @param {string} userId
 * @returns {Promise<null | {
 *   user: Object, surgeonId: string|null, overall: string, items: Object[],
 *   readings: Object[], notes: Object[], hasSimulatedData: boolean
 * }>} null when the user does not exist.
 */
export async function loadMemberData(userId) {
  const user = await db.users.get(userId)
  if (!user) return null

  const [roles, users, bodySystems, indicators, thresholds, readings, messages] = await Promise.all([
    db.roles.toArray(),
    db.users.toArray(),
    db.bodySystems.toArray(),
    db.indicators.toArray(),
    db.thresholds.toArray(),
    db.readings.where('userId').equals(userId).toArray(),
    db.messages.where('recipientId').equals(userId).toArray(),
  ])

  readings.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  const readingsByCode = new Map()
  for (const reading of readings) {
    if (!readingsByCode.has(reading.indicatorCode)) readingsByCode.set(reading.indicatorCode, [])
    readingsByCode.get(reading.indicatorCode).push(reading)
  }

  const systemById = new Map(bodySystems.map((system) => [system.id, system]))
  const levelFor = (reading, threshold) => classifyValue(reading.value, threshold) ?? LEVEL.NO_DATA

  const thresholdByCode = new Map()
  const items = indicators
    .filter((indicator) => readingsByCode.has(indicator.code))
    .map((indicator) => {
      const series = readingsByCode.get(indicator.code)
      const latest = series.at(-1)
      const { rule, threshold, baseline } = effectiveThreshold(thresholds, userId, indicator, series, latest)
      thresholdByCode.set(indicator.code, threshold)
      return {
        indicator,
        system: systemById.get(indicator.bodySystemId) ?? null,
        unit: latest.unit,
        rule, // stored row: what the threshold editor changes
        threshold, // absolute limits used for the level and the chart lines
        baseline, // { value, count } for personal-baseline indicators, else null
        isPersonal: rule?.userId === userId,
        latest,
        level: levelFor(latest, threshold),
        series: series.slice(-MAX_POINTS),
      }
    })
    // Worst first, so the surgeon sees the problem without scrolling.
    .sort((a, b) => severityOf(b.level) - severityOf(a.level))

  // CSV levels use the current thresholds (and the current personal baseline).
  const exportRows = readings.map((reading) => {
    const threshold = thresholdByCode.get(reading.indicatorCode) ?? null
    return { ...reading, level: levelFor(reading, threshold) }
  })

  return {
    user,
    surgeonId: resolveSurgeonId(roles, users),
    overall: items.reduce((worst, item) => (severityOf(item.level) > severityOf(worst) ? item.level : worst), LEVEL.NO_DATA),
    items,
    exportRows,
    notes: messages.sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    hasSimulatedData: readings.some((reading) => reading.source === 'simulated'),
  }
}
