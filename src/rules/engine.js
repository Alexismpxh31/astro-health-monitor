// Rules engine.
// Compares a reading against its thresholds and raises an alert (plus a local
// notification for critical values) when it is out of range.

import { db } from '../db/db.js'
import i18n from '../i18n/index.js'

/**
 * @typedef {import('../models/reading.js').Reading} Reading
 *
 * @typedef {'normal'|'warning'|'critical'} Level
 *
 * @typedef {Object} Threshold
 * @property {number|null} minCritical - Below this -> critical. null = no limit.
 * @property {number|null} minNormal - Below this -> warning. null = no limit.
 * @property {number|null} maxNormal - Above this -> warning. null = no limit.
 * @property {number|null} maxCritical - Above this -> critical. null = no limit.
 *
 * @typedef {Object} Evaluation
 * @property {Level|null} level - null when no threshold exists for the indicator.
 * @property {Object|null} alert - Row added to db.alerts, if a new alert was raised.
 */

// Do not raise the same alert (indicator + level) again while an unattended
// one newer than this exists.
const ALERT_COOLDOWN_MS = 60000

// Temporary defaults, used ONLY while db.thresholds is empty
// (i.e. until src/data/seed/thresholds.json is completed).
const t = (minCritical, minNormal, maxNormal, maxCritical) => ({
  minCritical,
  minNormal,
  maxNormal,
  maxCritical,
})
const FALLBACK_THRESHOLDS = {
  HR: t(45, 55, 95, 130),
  SPO2: t(90, 95, null, null),
  SBP: t(80, 95, 130, 155),
  DBP: t(50, 60, 85, 100),
  RR: t(8, 12, 18, 28),
  TSKIN: t(34.5, 35.8, 37.3, 38.5),
  BMD: t(-1.5, -1.0, null, null),
  MUSCLE: t(80, 90, null, null),
  RAD_D: t(null, null, 0.8, 1.8),
  RAD_C: t(null, null, 400, 600),
  PVT: t(null, null, 300, 450),
  SLEEP: t(4, 6.5, 9, 14),
  WBC: t(2.5, 4.5, 10.5, 15),
  IL6: t(null, null, 5, 12),
  CORT: t(2, 5, 25, 45),
}

// Indicator codes already reported as missing a threshold / recommendation.
const warnedNoThreshold = new Set()
const warnedNoRecommendation = new Set()

function warnOnce(warned, indicatorCode, message) {
  if (warned.has(indicatorCode)) return
  warned.add(indicatorCode)
  console.warn(`[rules] ${message}: ${indicatorCode}`)
}

/**
 * Classifies a value against a threshold. A null/undefined bound means
 * "no limit on that side".
 *
 * Also accepts the legacy field names used by early seed rows
 * (criticalMin / warnMin / warnMax / criticalMax).
 *
 * @param {number} value
 * @param {Threshold} threshold
 * @returns {Level}
 */
export function classify(value, threshold) {
  const minCritical = threshold.minCritical ?? threshold.criticalMin ?? null
  const minNormal = threshold.minNormal ?? threshold.warnMin ?? null
  const maxNormal = threshold.maxNormal ?? threshold.warnMax ?? null
  const maxCritical = threshold.maxCritical ?? threshold.criticalMax ?? null

  if ((minCritical !== null && value < minCritical) || (maxCritical !== null && value > maxCritical)) {
    return 'critical'
  }
  if ((minNormal !== null && value < minNormal) || (maxNormal !== null && value > maxNormal)) {
    return 'warning'
  }
  return 'normal'
}

/**
 * Finds the threshold for a reading: the user's own one first, then the
 * general one (userId null). Falls back to FALLBACK_THRESHOLDS only when the
 * thresholds table is empty.
 */
async function findThreshold(reading, indicator) {
  if ((await db.thresholds.count()) === 0) {
    return FALLBACK_THRESHOLDS[reading.indicatorCode] ?? null
  }
  if (!indicator) return null
  const rows = await db.thresholds.where('indicatorId').equals(indicator.id).toArray()
  return (
    rows.find((row) => row.userId === reading.userId) ??
    rows.find((row) => row.userId == null) ??
    null
  )
}

// ---------- Notifications ----------

let permissionRequested = false

/**
 * Asks for notification permission, at most once per page load.
 * Best called from a user gesture (e.g. a button click). Never throws.
 */
export async function requestNotificationPermission() {
  if (permissionRequested) return
  permissionRequested = true
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    await Notification.requestPermission()
  } catch {
    // Unsupported or blocked: the app keeps working without notifications.
  }
}

async function notifyCritical(reading, indicator, recommendation) {
  try {
    await requestNotificationPermission()
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const spanish = i18n.language?.startsWith('es')
    const name = (spanish ? indicator?.nameEs : indicator?.nameEn) ?? reading.indicatorCode
    const advice = (spanish ? recommendation?.textEs : recommendation?.textEn) ?? ''
    new Notification(`${i18n.t('rules.criticalTitle')}: ${name}`, {
      body: `${reading.value} ${reading.unit}${advice ? ` — ${advice}` : ''}`,
      tag: `critical-${reading.indicatorCode}`,
    })
  } catch {
    // Some platforms (e.g. Android Chrome) only allow notifications from a
    // service worker. A missing notification must never break the engine.
  }
}

// ---------- Evaluation ----------

/**
 * Evaluates one stored reading. When it is out of range, adds a row to
 * db.alerts (unless a recent unattended alert for the same indicator and
 * level already exists) and, for critical values, shows a local notification.
 *
 * @param {Reading} reading
 * @returns {Promise<Evaluation>}
 */
export async function evaluateReading(reading) {
  const code = reading.indicatorCode
  const indicator = await db.indicators.where('code').equals(code).first()

  const threshold = await findThreshold(reading, indicator)
  if (!threshold) {
    warnOnce(warnedNoThreshold, code, 'No threshold for indicator')
    return { level: null, alert: null }
  }

  const level = classify(reading.value, threshold)
  if (level === 'normal') return { level, alert: null }

  const alertLevel = (await db.alertLevels.toArray()).find(
    (row) => row.code === level.toUpperCase(),
  )
  const recommendation =
    indicator && alertLevel
      ? await db.recommendations
          .where('[indicatorId+alertLevelId]')
          .equals([indicator.id, alertLevel.id])
          .first()
      : undefined
  if (!recommendation) {
    // The alert is still raised (without advice) so an out-of-range value is never hidden.
    warnOnce(warnedNoRecommendation, code, 'No recommendation for indicator')
  }

  const alert = {
    id: crypto.randomUUID(),
    readingId: reading.id,
    recommendationId: recommendation?.id ?? null,
    // Denormalized so the alert can be shown and de-duplicated without joins.
    indicatorCode: code,
    alertLevelId: alertLevel?.id ?? null,
    generatedAt: new Date().toISOString(),
    attendedAt: null,
    syncStatus: 'pending',
  }

  // Check + insert in one transaction so concurrent readings cannot both pass the check.
  const created = await db.transaction('rw', db.alerts, async () => {
    const since = new Date(Date.now() - ALERT_COOLDOWN_MS).toISOString()
    const duplicate = await db.alerts
      .where('generatedAt')
      .aboveOrEqual(since)
      .filter(
        (row) =>
          row.attendedAt == null &&
          row.indicatorCode === code &&
          row.alertLevelId === alert.alertLevelId,
      )
      .first()
    if (duplicate) return false
    await db.alerts.add(alert)
    return true
  })

  if (!created) return { level, alert: null }
  if (level === 'critical') notifyCritical(reading, indicator, recommendation)
  return { level, alert }
}
