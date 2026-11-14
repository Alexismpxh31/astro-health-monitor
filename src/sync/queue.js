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
  let count = 0
  for (const table of SYNCABLE_TABLES) {
    if (db[table]) {
      const pending = await db[table].where('syncStatus').equals('pending').count()
      count += pending
    }
  }
  return count
}

/**
 * Pushes every pending row to Supabase and marks it as 'synced'.
 *
 * @returns {Promise<{ pushed: number, failed: number }>}
 */
export async function syncPending() {
  if (!supabase || typeof navigator === 'undefined' || !navigator.onLine) {
    return { pushed: 0, failed: 0 }
  }

  let pushed = 0
  let failed = 0

  for (const table of SYNCABLE_TABLES) {
    if (!db[table]) continue

    try {
      const pendingRows = await db[table].where('syncStatus').equals('pending').toArray()
      if (pendingRows.length === 0) continue

      for (const row of pendingRows) {
        // Strip out local-only fields before sending to Supabase
        const { syncStatus, ...payload } = row
        const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' })

        if (error) {
          // If RLS blocks anon write or server error, record as failed
          console.warn(`[sync] Failed to push ${table}/${row.id}:`, error.message)
          failed++
        } else {
          // Mark as synced locally
          await db[table].update(row.id, { syncStatus: 'synced' })
          pushed++
        }
      }
    } catch (err) {
      console.error(`[sync] Error during sync of ${table}:`, err)
      failed++
    }
  }

  return { pushed, failed }
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
    syncPending().then(({ pushed, failed }) => {
      if (pushed > 0) console.log(`[sync] Online sync: pushed ${pushed} records to Supabase.`)
    })
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
  }

  const timer = setInterval(() => {
    syncPending()
  }, intervalMs)

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline)
    }
    clearInterval(timer)
  }
}
