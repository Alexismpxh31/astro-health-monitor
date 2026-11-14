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

// Reference data (table name -> seed rows). The JSON files in src/data/seed/
// are the single source of truth (supabase/setup_final.sql is generated from
// them), so these tables are synchronized with the seed on every start:
// devices seeded with an older catalog get the new rows and lose the stale ones.
const REFERENCE_SEED = {
  ...catalogs, // roles, bodySystems, units, indicators, alertLevels, symptoms, sensorTypes, missions
  recommendations,
}

/** Makes a reference table match its seed rows exactly (upsert + delete stale rows). */
async function syncReferenceTable(name, rows) {
  const table = db.table(name)
  const seedIds = new Set(rows.map((row) => row.id))
  const staleIds = (await table.toCollection().primaryKeys()).filter((id) => !seedIds.has(id))
  await table.bulkDelete(staleIds)
  await table.bulkPut(rows)
}

/**
 * Refreshes the general thresholds (userId null) from the seed. Personal
 * thresholds (userId set) are never touched.
 */
async function syncGeneralThresholds() {
  const seedIds = new Set(thresholds.map((row) => row.id))
  const staleIds = await db.thresholds
    .filter((row) => row.userId == null && !seedIds.has(row.id))
    .primaryKeys()
  await db.thresholds.bulkDelete(staleIds)
  await db.thresholds.bulkPut(thresholds)
}

/**
 * Loads the JSON files in src/data/seed/ into IndexedDB.
 * - Reference data (catalogs, general thresholds, recommendations, demo crew)
 *   is synchronized with the seed on every call.
 * - Demo users are only added when missing, so local changes to an existing
 *   user (e.g. a PIN set on this device) are never overwritten.
 *
 * @returns {Promise<boolean>} true if any demo user was inserted.
 */
export async function seedIfEmpty() {
  const tableNames = [...Object.keys(REFERENCE_SEED), 'thresholds', 'users', 'crew']
  return db.transaction('rw', tableNames, async () => {
    for (const [name, rows] of Object.entries(REFERENCE_SEED)) {
      await syncReferenceTable(name, rows)
    }
    await syncGeneralThresholds()

    await db.crew.clear()
    await db.crew.bulkPut(usersSeed.crew)

    const existingIds = new Set(await db.users.toCollection().primaryKeys())
    const missingUsers = usersSeed.users.filter((user) => !existingIds.has(user.id))
    await db.users.bulkAdd(missingUsers)
    return missingUsers.length > 0
  })
}
