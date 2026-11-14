import { db } from '../db/db.js'
import { supabase } from './supabaseClient.js'

/** Tables that carry a syncStatus field and take part in the sync queue. */
export const SYNCABLE_TABLES = ['readings', 'alerts', 'dailyCheckins']

/**
 * Counts the rows still waiting to be synced in Dexie.
 *
 * @returns {Promise<number>}
 */
export async function getPendingCount() {
  const counts = await Promise.all(
    SYNCABLE_TABLES.filter((tableName) => db.tables.some((table) => table.name === tableName)).map(
      (tableName) => db.table(tableName).where('syncStatus').equals('pending').count(),
    ),
  )
  return counts.reduce((total, count) => total + count, 0)
}

/**
 * Pushes the logged-in user's pending readings to Supabase and marks them as 'synced'.
 * Client fields (camelCase, indicatorCode) are mapped to the server schema
 * (snake_case, indicator_id).
 *
 * @returns {Promise<{ pushed: number, failed: number }>}
 */
export async function syncPending() {
  if (!supabase) throw new Error('Falta configurar Supabase.')
  if (!navigator.onLine) throw new Error('El navegador está sin conexión.')

  // Supabase user linked to the app profile (RLS only allows writing your own data).
  const { data: appUserId, error: profileError } = await supabase.rpc('app_user_id')
  if (profileError) throw profileError
  if (!appUserId) {
    throw new Error('Inicia sesión con un perfil de astronauta vinculado.')
  }

  const readings = await db.readings
    .where('userId')
    .equals(appUserId)
    .filter((reading) => reading.syncStatus === 'pending')
    .toArray()

  if (readings.length === 0) return { pushed: 0, failed: 0 }

  // indicator code -> server indicator id
  const { data: indicators, error: indicatorError } = await supabase
    .from('indicators')
    .select('id, code')
  if (indicatorError) throw indicatorError
  const indicatorIdByCode = Object.fromEntries(indicators.map((row) => [row.code, row.id]))

  const known = readings.filter((reading) => indicatorIdByCode[reading.indicatorCode])
  const failed = readings.length - known.length
  if (failed > 0) {
    console.warn(`[sync] ${failed} lecturas con códigos que no existen en Supabase; se quedan pendientes.`)
  }
  if (known.length === 0) return { pushed: 0, failed }

  const rows = known.map((reading) => ({
    id: reading.id,
    user_id: reading.userId,
    indicator_id: indicatorIdByCode[reading.indicatorCode],
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
    .anyOf(known.map((reading) => reading.id))
    .modify({ syncStatus: 'synced' })

  return { pushed, failed }
}

/** Runs syncPending without throwing (for automatic/background syncs). */
async function trySync() {
  try {
    const result = await syncPending()
    if (result.pushed > 0) console.log(`[sync] ${result.pushed} lecturas enviadas a Supabase.`)
    return result
  } catch (error) {
    console.warn('[sync] Sincronización en espera:', error.message)
    return { pushed: 0, failed: 0 }
  }
}

/**
 * Starts automatic syncing: on the 'online' event and on a recurring interval.
 *
 * @param {Object} [options]
 * @param {number} [options.intervalMs=30000]
 * @returns {() => void} stop function.
 */
export function startAutoSync(options = {}) {
  const intervalMs = options.intervalMs || 30000

  const handleOnline = () => {
    trySync()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
  }

  const timer = setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) trySync()
  }, intervalMs)

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline)
    }
    clearInterval(timer)
  }
}