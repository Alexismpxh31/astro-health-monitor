// Sync queue.
// Pushes locally stored rows with syncStatus 'pending' to Supabase when online, and pulls
// the notes (messages) of the active profile, so a note the flight surgeon writes on their
// device reaches the astronaut's device (and the "read" mark travels back).
//
// Requirements (scripts/schema.sql, section 4): the device must be linked to a Supabase Auth
// user whose profile (users.auth_user_id) is the active session (Comms > "Link account").
// Row Level Security decides what each profile may write: its own readings, alerts and
// check-ins, the notes it sends, and read_at on the notes it receives.
//
// Name mapping client -> server: camelCase -> snake_case; reading.indicatorCode -> indicator_id
// (catalog ids are the same fixed UUIDs on both sides, so the lookup is local).

import { getSession } from '../auth/session.js'
import { db } from '../db/db.js'
import { supabase } from './supabaseClient.js'

/** Tables that carry a syncStatus field and take part in the sync queue. */
export const SYNCABLE_TABLES = ['readings', 'alerts', 'dailyCheckins', 'messages']

/** Rows per upsert request. */
const BATCH_SIZE = 500
/** localStorage key (per profile) with the updated_at of the last note pulled. */
const PULL_SINCE_KEY = 'astrohealth.sync.messagesSince'

/**
 * Counts the rows still waiting to be synced.
 *
 * @returns {Promise<number>}
 */
export async function getPendingCount() {
  const counts = await Promise.all(
    SYNCABLE_TABLES.map((tableName) =>
      db.table(tableName).where('syncStatus').equals('pending').count(),
    ),
  )

  return counts.reduce((total, count) => total + count, 0)
}

/** Pending records associated with a single profile, including blocked dependencies. */
export async function getProfilePendingCount(userId) {
  const [readings, alerts, checkins, messages] = await Promise.all([
    db.readings.where('userId').equals(userId).filter((row) => row.syncStatus === 'pending').count(),
    db.alerts.where('syncStatus').equals('pending').toArray(),
    db.dailyCheckins.where('syncStatus').equals('pending').filter((row) => row.userId === userId).count(),
    db.messages.where('syncStatus').equals('pending').filter(
      (row) => row.senderId === userId || (row.recipientId === userId && Boolean(row.readAt)),
    ).count(),
  ])
  const alertReadings = await db.readings.bulkGet(alerts.map((alert) => alert.readingId))
  return readings + checkins + messages + alertReadings.filter((row) => row?.userId === userId).length
}

/** Profile id (users.id) linked to the Supabase Auth session, or null. */
export async function getLinkedProfileId() {
  const { data, error } = await supabase.rpc('app_user_id')
  if (error) throw error
  return data
}

let activeSync

/**
 * Pushes every pending row to Supabase, marks it as 'synced' and pulls new notes.
 * One sync runs at a time per session.
 *
 * @returns {Promise<{ pushed: number, pulled: number, failed: number }>}
 */
export function syncPending() {
  const session = getSession()
  if (!activeSync || activeSync.session !== session) {
    const operation = { session, promise: null }
    operation.promise = runSync(session).finally(() => {
      if (activeSync === operation) activeSync = null
    })
    activeSync = operation
  }
  return activeSync.promise
}

async function runSync(session) {
  if (!supabase) throw new Error('Falta configurar Supabase.')
  if (!navigator.onLine) throw new Error('El navegador está sin conexión.')
  if (!session) return { pushed: 0, pulled: 0, failed: 0 }

  const userId = await getLinkedProfileId()
  if (userId !== session.userId || getSession() !== session) {
    throw new Error('La cuenta de Supabase debe coincidir con el perfil activo.')
  }
  // Nothing is written once the user logs out mid-sync.
  const stillActive = () => getSession() === session

  let pushed = 0
  pushed += await pushReadings(userId, stillActive)
  pushed += await pushAlerts(userId, stillActive)
  pushed += await pushCheckins(userId, stillActive)
  pushed += await pushMessages(userId, stillActive)
  const pulled = await pullMessages(userId, stillActive)

  return { pushed, pulled, failed: 0 }
}

/** Upserts `rows` in batches. `options` are passed to supabase.upsert(). */
async function upsertAll(table, rows, options) {
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const { error } = await supabase.from(table).upsert(rows.slice(start, start + BATCH_SIZE), options)
    if (error) throw error
  }
}

const markSynced = (table, ids) => db.table(table).where('id').anyOf(ids).modify({ syncStatus: 'synced' })

// ---------- push ----------

/** Own readings of every indicator. Readings are append-only on the server. */
async function pushReadings(userId, stillActive) {
  const readings = await db.readings
    .where('userId')
    .equals(userId)
    .filter((reading) => reading.syncStatus === 'pending')
    .toArray()
  if (readings.length === 0) return 0

  const indicators = await db.indicators.toArray()
  const indicatorIdByCode = new Map(indicators.map((indicator) => [indicator.code, indicator.id]))

  const rows = []
  for (const reading of readings) {
    const indicatorId = indicatorIdByCode.get(reading.indicatorCode)
    if (!indicatorId) continue // unknown code: stays pending until the catalog knows it
    rows.push({
      id: reading.id,
      user_id: reading.userId,
      indicator_id: indicatorId,
      sensor_id: null,
      value: reading.value,
      measured_at: reading.measuredAt,
      source: reading.source,
    })
  }
  if (rows.length === 0 || !stillActive()) return 0

  await upsertAll('readings', rows, { onConflict: 'id', ignoreDuplicates: true })
  return markSynced('readings', rows.map((row) => row.id))
}

/**
 * Alerts on own readings (RLS), including the attended_at update when the astronaut
 * marks them done or reads the note the surgeon sent from the alert.
 * An alert waits until its reading is on the server (foreign key).
 */
async function pushAlerts(userId, stillActive) {
  const pending = await db.alerts.where('syncStatus').equals('pending').toArray()
  if (pending.length === 0) return 0

  const readingIds = [...new Set(pending.map((alert) => alert.readingId))]
  const readings = await db.readings.where('id').anyOf(readingIds).toArray()
  const readyReadingIds = new Set(
    readings.filter((reading) => reading.userId === userId && reading.syncStatus === 'synced').map((reading) => reading.id),
  )

  const rows = pending
    .filter((alert) => readyReadingIds.has(alert.readingId) && alert.alertLevelId)
    .map((alert) => ({
      id: alert.id,
      reading_id: alert.readingId,
      recommendation_id: alert.recommendationId ?? null,
      alert_level_id: alert.alertLevelId,
      direction: alert.direction ?? null,
      generated_at: alert.generatedAt,
      attended_at: alert.attendedAt ?? null,
    }))
  if (rows.length === 0 || !stillActive()) return 0

  await upsertAll('alerts', rows, { onConflict: 'id' })
  return markSynced('alerts', rows.map((row) => row.id))
}

/** Own daily check-ins with their symptoms. */
async function pushCheckins(userId, stillActive) {
  const pending = await db.dailyCheckins
    .where('syncStatus')
    .equals('pending')
    .filter((checkin) => checkin.userId === userId)
    .toArray()
  if (pending.length === 0 || !stillActive()) return 0

  const rows = pending.map((checkin) => ({
    id: checkin.id,
    user_id: checkin.userId,
    date: checkin.date,
    mood: checkin.mood,
    sleep_hours: checkin.sleepHours,
    stress: checkin.stress,
    notes: checkin.notes ?? null,
  }))
  await upsertAll('daily_checkins', rows, { onConflict: 'id' })

  const symptomRows = []
  for (const checkin of pending) {
    const symptoms = await db.checkinSymptoms
      .where('[checkinId+symptomId]')
      .between([checkin.id, ''], [checkin.id, '￿'])
      .toArray()
    symptomRows.push(...symptoms.map((item) => ({ checkin_id: item.checkinId, symptom_id: item.symptomId })))
  }
  if (symptomRows.length > 0) {
    await upsertAll('checkin_symptoms', symptomRows, { onConflict: 'checkin_id,symptom_id', ignoreDuplicates: true })
  }

  return markSynced('dailyCheckins', rows.map((row) => row.id))
}

/**
 * Notes: the ones this profile sent are inserted; for the ones it received only read_at
 * is updated (that is all RLS lets a recipient change).
 * alert_id is sent only when that alert is already on the server (foreign key).
 */
async function pushMessages(userId, stillActive) {
  const pending = await db.messages.where('syncStatus').equals('pending').toArray()
  if (pending.length === 0) return 0

  const sent = pending.filter((message) => message.senderId === userId)
  const received = pending.filter((message) => message.recipientId === userId && message.readAt)

  const alertIds = [...new Set(sent.map((message) => message.alertId).filter(Boolean))]
  const alerts = alertIds.length > 0 ? await db.alerts.where('id').anyOf(alertIds).toArray() : []
  const syncedAlertIds = new Set(alerts.filter((alert) => alert.syncStatus === 'synced').map((alert) => alert.id))

  if (!stillActive()) return 0
  let pushed = 0

  if (sent.length > 0) {
    const rows = sent.map((message) => ({
      id: message.id,
      sender_id: message.senderId,
      recipient_id: message.recipientId,
      content: message.content,
      sent_at: message.sentAt,
      read_at: message.readAt ?? null,
      alert_id: message.alertId && syncedAlertIds.has(message.alertId) ? message.alertId : null,
    }))
    await upsertAll('messages', rows, { onConflict: 'id', ignoreDuplicates: true })
    pushed += await markSynced('messages', rows.map((row) => row.id))
  }

  for (const message of received) {
    const { error } = await supabase.from('messages').update({ read_at: message.readAt }).eq('id', message.id)
    if (error) throw error
    pushed += await markSynced('messages', [message.id])
  }

  return pushed
}

// ---------- pull ----------

const sinceKey = (userId) => `${PULL_SINCE_KEY}.${userId}`

function readSince(userId) {
  try {
    return localStorage.getItem(sinceKey(userId))
  } catch {
    return null
  }
}

function writeSince(userId, value) {
  try {
    localStorage.setItem(sinceKey(userId), value)
  } catch {
    // Private mode or storage disabled: the next sync pulls again from the start (harmless).
  }
}

/**
 * Notes sent to or by this profile that changed since the last pull (RLS limits the query
 * to those rows). Local rows still pending are never overwritten.
 * When a received note linked to an alert comes back read, the local alert is attended too,
 * so the flight surgeon's device shows "Atendida" without pulling the alerts table.
 */
async function pullMessages(userId, stillActive) {
  const since = readSince(userId)
  let query = supabase
    .from('messages')
    .select('id, sender_id, recipient_id, content, sent_at, read_at, alert_id, updated_at')
    .order('updated_at', { ascending: true })
    .limit(BATCH_SIZE)
  if (since) query = query.gt('updated_at', since)

  const { data, error } = await query
  if (error) throw error
  if (!data || data.length === 0 || !stillActive()) return 0

  const pendingIds = new Set(await db.messages.where('syncStatus').equals('pending').primaryKeys())
  const rows = data
    .filter((message) => !pendingIds.has(message.id))
    .map((message) => ({
      id: message.id,
      senderId: message.sender_id,
      recipientId: message.recipient_id,
      content: message.content,
      sentAt: message.sent_at,
      readAt: message.read_at,
      alertId: message.alert_id,
      syncStatus: 'synced',
    }))

  await db.transaction('rw', db.messages, db.alerts, async () => {
    await db.messages.bulkPut(rows)
    for (const message of rows) {
      if (!message.alertId || !message.readAt) continue
      const alert = await db.alerts.get(message.alertId)
      if (alert && !alert.attendedAt) await db.alerts.update(alert.id, { attendedAt: message.readAt })
    }
  })

  writeSince(userId, data.at(-1).updated_at)
  return rows.length
}

// ---------- auto sync ----------

/**
 * Starts automatic syncing: on the 'online' event and on a timer.
 *
 * @param {Object} [options]
 * @param {number} [options.intervalMs=30000]
 * @returns {() => void} stop function.
 */
export function startAutoSync({ intervalMs = 30000 } = {}) {
  if (!supabase) {
    console.info('[sync] Supabase is not configured: auto-sync is off (offline-only mode).')
    return () => {}
  }

  let isRunning = false
  let lastErrorMessage = null

  const run = async () => {
    if (isRunning || !navigator.onLine || !getSession()) return
    isRunning = true
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!data.session) return

      const { pushed, pulled } = await syncPending()
      if (pushed > 0 || pulled > 0) console.info(`[sync] Uploaded ${pushed} rows, received ${pulled} notes`)
      lastErrorMessage = null
    } catch (error) {
      // Expected while nobody is linked to Supabase (offline PIN login): report once, retry later.
      const message = error?.message ?? String(error)
      if (message !== lastErrorMessage) console.warn('[sync] Auto-sync skipped:', message)
      lastErrorMessage = message
    } finally {
      isRunning = false
    }
  }

  window.addEventListener('online', run)
  const intervalId = setInterval(run, intervalMs)
  run()

  return () => {
    window.removeEventListener('online', run)
    clearInterval(intervalId)
  }
}
