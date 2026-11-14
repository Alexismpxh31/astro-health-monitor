import { db } from '../../db/db.js'
import { buildCrewStatus, hasRole } from './crewStatus.js'

// Crew data shared by the crew table (/crew) and the flight surgeon's mission overview (/).
// Reads everything from IndexedDB (offline-first).
// TODO(perf): this scans every reading of the crew. If it gets slow, add a
// [userId+indicatorCode+measuredAt] index in a new db.version() and read only the latest.

const ASTRONAUT_ROLE_CODE = 'astronaut'

/**
 * @returns {Promise<{ mission: Object|null, bodySystems: Object[], astronauts: Object[], rows: Object[] }>}
 *   rows: one status row per astronaut, worst first (see buildCrewStatus).
 */
export async function loadCrewData() {
  const [roles, crew, users, missions, bodySystems, indicators, thresholds] = await Promise.all([
    db.roles.toArray(),
    db.crew.toArray(),
    db.users.toArray(),
    db.missions.toArray(),
    db.bodySystems.toArray(),
    db.indicators.toArray(),
    db.thresholds.toArray(),
  ])

  const crewByUserId = new Map(crew.map((member) => [member.userId, member]))
  const astronauts = users
    .filter((user) => crewByUserId.has(user.id) && hasRole(roles, user, ASTRONAUT_ROLE_CODE))
    .map((user) => ({ ...user, isMedicalOfficer: Boolean(crewByUserId.get(user.id).isMedicalOfficer) }))
  const readings = astronauts.length
    ? await db.readings.where('userId').anyOf(astronauts.map((user) => user.id)).toArray()
    : []

  // Only systems that have at least one indicator get a column.
  const systemsWithIndicators = bodySystems.filter((system) =>
    indicators.some((indicator) => indicator.bodySystemId === system.id),
  )

  return {
    mission: missions[0] ?? null,
    bodySystems: systemsWithIndicators,
    astronauts,
    rows: buildCrewStatus({ astronauts, bodySystems: systemsWithIndicators, indicators, thresholds, readings }),
  }
}
