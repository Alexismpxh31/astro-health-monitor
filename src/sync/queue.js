// Sync queue (STUB).
// Pushes locally stored rows with syncStatus 'pending' to Supabase when online.

import { db } from '../db/db.js'

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
  // TODO:
  // 1. If the supabase client is null or navigator.onLine is false -> return zeros.
  // 2. For each table in SYNCABLE_TABLES:
  //    a. Read rows where syncStatus === 'pending'.
  //    b. Upsert them to Supabase in batches (onConflict: 'id').
  //    c. On success set syncStatus = 'synced' locally; on error count as failed (retried later).
  return { pushed: 0, failed: 0 }
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
