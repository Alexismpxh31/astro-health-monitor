import { db } from '../../db/db.js'

// Recent alerts of the whole crew for the flight surgeon (offline, from IndexedDB).
// Alerts come from the rules engine (indicatorCode / alertLevelId / direction stored on
// the row) and from the daily check-in (only readingId + recommendationId), so every
// field is derived from the reading and the recommendation when the row lacks it.

const SCAN_LIMIT = 300

/**
 * @typedef {Object} CrewAlert
 * @property {Object} alert - Row from db.alerts.
 * @property {Object} reading
 * @property {Object} user
 * @property {Object|null} indicator
 * @property {Object|null} recommendation
 * @property {'caution'|'critical'|null} levelCode
 * @property {'low'|'high'|null} direction
 */

/**
 * @param {Object[]} users - Crew members to include (astronauts).
 * @returns {Promise<{ items: CrewAlert[], unattended: number }>} newest first.
 */
export async function loadCrewAlerts(users) {
  const userById = new Map(users.map((user) => [user.id, user]))
  const recent = await db.alerts.orderBy('generatedAt').reverse().limit(SCAN_LIMIT).toArray()
  if (recent.length === 0) return { items: [], unattended: 0 }

  const recommendationIds = [...new Set(recent.map((row) => row.recommendationId).filter(Boolean))]
  const [readings, recommendations, indicators, alertLevels, messages] = await Promise.all([
    db.readings.bulkGet(recent.map((row) => row.readingId)),
    db.recommendations.bulkGet(recommendationIds),
    db.indicators.toArray(),
    db.alertLevels.toArray(),
    db.messages.toArray(),
  ])
  // Latest note sent about each alert (notes written from 'Send note' carry alertId).
  const noteByAlertId = new Map()
  for (const message of messages) {
    if (!message.alertId) continue
    const previous = noteByAlertId.get(message.alertId)
    if (!previous || message.sentAt > previous.sentAt) noteByAlertId.set(message.alertId, message)
  }

  const recommendationById = new Map(recommendations.filter(Boolean).map((row) => [row.id, row]))
  const indicatorByCode = new Map(indicators.map((row) => [row.code, row]))
  const levelCodeById = new Map(alertLevels.map((row) => [row.id, row.code?.toLowerCase()]))

  const items = []
  recent.forEach((alert, index) => {
    const reading = readings[index]
    const user = reading && userById.get(reading.userId)
    if (!user) return
    const recommendation = recommendationById.get(alert.recommendationId) ?? null
    items.push({
      alert,
      reading,
      user,
      indicator: indicatorByCode.get(alert.indicatorCode ?? reading.indicatorCode) ?? null,
      recommendation,
      levelCode: levelCodeById.get(alert.alertLevelId ?? recommendation?.alertLevelId) ?? null,
      direction: alert.direction ?? recommendation?.direction ?? null,
      note: noteByAlertId.get(alert.id) ?? null,
    })
  })

  return { items, unattended: items.filter((item) => !item.alert.attendedAt).length }
}
