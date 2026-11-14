// Sync queue.
// Pushes locally stored rows with syncStatus 'pending' to Supabase when online.
// TODO(sync): syncPending() only uploads HR readings so far; alerts, dailyCheckins
// and messages are counted as pending but not uploaded yet.

import { getSession, ROLE } from '../auth/session.js'
import { db } from '../db/db.js'
import { supabase } from './supabaseClient.js'

/** Tables that carry a syncStatus field and take part in the sync queue. */
export const SYNCABLE_TABLES = ['readings', 'alerts', 'dailyCheckins', 'messages']

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

/**
 * Pushes every pending row to Supabase and marks it as 'synced'.
 *
 * @returns {Promise<{ pushed: number, failed: number }>}
 */
let activeSync

export async function getLinkedProfileId() {
  const { data, error } = await supabase.rpc('app_user_id')
  if (error) throw error
  return data
}

export function syncPending() {
  const session = getSession()
  if (!activeSync || activeSync.session !== session) {
    const operation = { session, promise: null }
    operation.promise = uploadPendingReadings(session).finally(() => {
      if (activeSync === operation) activeSync = null
    })
    activeSync = operation
  }
  return activeSync.promise
}

async function uploadPendingReadings(session) {
  if (!supabase) throw new Error('Falta configurar Supabase.')
  if (!navigator.onLine) throw new Error('El navegador está sin conexión.')

  if (session?.roleCode !== ROLE.ASTRONAUT) return { pushed: 0, failed: 0 }

  const appUserId = await getLinkedProfileId()
  if (appUserId !== session.userId || getSession() !== session) {
    throw new Error('La cuenta de Supabase debe coincidir con el perfil activo.')
  }

  const readings = await db.readings
    .where('[userId+indicatorCode]')
    .equals([appUserId, 'HR'])
    .filter((reading) => reading.syncStatus === 'pending' && reading.unit === 'bpm')
    .toArray()

  if (readings.length === 0) return { pushed: 0, failed: 0 }

  const { data: indicator, error: indicatorError } = await supabase
    .from('indicators')
    .select('id')
    .eq('code', 'HR')
    .single()

  if (indicatorError) throw indicatorError

  const rows = readings.map((reading) => ({
    id: reading.id,
    user_id: reading.userId,
    indicator_id: indicator.id,
    sensor_id: null,
    value: reading.value,
    measured_at: reading.measuredAt,
    source: reading.source,
  }))

  if (getSession() !== session) return { pushed: 0, failed: 0 }

  const { error: uploadError } = await supabase
    .from('readings')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })

  if (uploadError) throw uploadError

  const pushed = await db.readings
    .where('id')
    .anyOf(readings.map((reading) => reading.id))
    .modify({ syncStatus: 'synced' })

  return { pushed, failed: 0 }
}

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
    if (isRunning || !navigator.onLine || getSession()?.roleCode !== ROLE.ASTRONAUT) return
    isRunning = true
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!data.session) return

      const { pushed } = await syncPending()
      if (pushed > 0) console.info(`[sync] Uploaded ${pushed} readings`)
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
