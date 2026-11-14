import Dexie from 'dexie'
import catalogs from '../data/seed/catalogs.json'
import recommendations from '../data/seed/recommendations.json'
import thresholds from '../data/seed/thresholds.json'
import usersSeed from '../data/seed/users.json'

// Local offline-first database. All primary keys are string UUIDs
// (never auto-incremented) so rows can be synced to Supabase as-is.
export const db = new Dexie('AstroHealthDB')

// NOTE: do not edit version(1) once teammates are using it; add version(2) instead.
db.version(1).stores({
  roles: 'id',
  bodySystems: 'id',
  units: 'id',
  indicators: 'id, code, bodySystemId',
  alertLevels: 'id',
  symptoms: 'id',
  sensorTypes: 'id',
  missions: 'id',
  users: 'id, roleId',
  crew: '[missionId+userId], missionId, userId',
  sensors: 'id, userId',
  readings: 'id, userId, indicatorCode, measuredAt, syncStatus, [userId+indicatorCode]',
  thresholds: 'id, indicatorId, userId',
  recommendations: 'id, [indicatorId+alertLevelId]',
  alerts: 'id, readingId, generatedAt, attendedAt, syncStatus',
  dailyCheckins: 'id, [userId+date], syncStatus',
  checkinSymptoms: '[checkinId+symptomId]',
  messages: 'id, senderId, recipientId, sentAt, syncStatus',
})

// Reference data (table name -> seed rows). Rows have fixed IDs, so they are
// upserted on every start: devices seeded with an older catalog get the new rows.
const REFERENCE_SEED = {
  ...catalogs, // roles, bodySystems, units, indicators, alertLevels, symptoms, sensorTypes, missions
  thresholds,
  recommendations,
}

// Demo data (table name -> seed rows). Only loaded on first run so local
// changes (e.g. a PIN set on this device) are never overwritten.
const DEMO_SEED = {
  users: usersSeed.users,
  crew: usersSeed.crew,
}

/**
 * Loads the JSON files in src/data/seed/ into IndexedDB.
 * - Reference data (catalogs, default thresholds, recommendations) is
 *   refreshed on every call.
 * - Demo users and crew are only inserted when the users table is empty
 *   (first run on this device).
 *
 * @returns {Promise<boolean>} true if the demo users were inserted.
 */
export async function seedIfEmpty() {
  const referenceTables = Object.keys(REFERENCE_SEED)
  const demoTables = Object.keys(DEMO_SEED)
  return db.transaction('rw', [...referenceTables, ...demoTables], async () => {
    await Promise.all(
      referenceTables.map((name) => db.table(name).bulkPut(REFERENCE_SEED[name])),
    )
    if ((await db.users.count()) > 0) return false
    await Promise.all(demoTables.map((name) => db.table(name).bulkPut(DEMO_SEED[name])))
    return true
  })
}
