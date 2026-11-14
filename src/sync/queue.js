// Sync queue (STUB).
// Pushes locally stored rows with syncStatus 'pending' to Supabase when online.

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
  // TODO: sum db[table].where('syncStatus').equals('pending').count() over SYNCABLE_TABLES.
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
export async function syncPending() {
  if (!supabase) throw new Error('Falta configurar Supabase.')
  if (!navigator.onLine) throw new Error('El navegador está sin conexión.')

  const { data: appUserId, error: profileError } =
    await supabase.rpc('app_user_id')

  if (profileError) throw profileError
  if (!appUserId) {
    throw new Error('Inicia sesión con un perfil de astronauta vinculado.')
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
export function startAutoSync(options = {}) {
  // TODO: window.addEventListener('online', syncPending) + setInterval(syncPending, intervalMs).
  console.warn('[sync] startAutoSync is not implemented yet', options)
  return () => {}
}
