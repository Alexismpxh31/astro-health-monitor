import { db } from '../../db/db.js'
import { loadCrewAlerts } from './crewAlerts.js'
import { buildCrewStatus, hasRole, LEVEL } from './crewStatus.js'

// Crew data shared by the mission list, the mission overview and the crew table.
// Reads everything from IndexedDB (offline-first).
// TODO(perf): this scans every reading of the crew. If it gets slow, add a
// [userId+indicatorCode+measuredAt] index in a new db.version() and read only the latest.

const ASTRONAUT_ROLE_CODE = 'astronaut'

async function loadReferenceData() {
  const [roles, crew, users, missions, bodySystems, indicators, thresholds] = await Promise.all([
    db.roles.toArray(),
    db.crew.toArray(),
    db.users.toArray(),
    db.missions.toArray(),
    db.bodySystems.toArray(),
    db.indicators.toArray(),
    db.thresholds.toArray(),
  ])
  // Only systems that have at least one indicator get a column.
  const systemsWithIndicators = bodySystems.filter((system) =>
    indicators.some((indicator) => indicator.bodySystemId === system.id),
  )
  return { roles, crew, users, missions, bodySystems: systemsWithIndicators, indicators, thresholds }
}

/** Astronauts of one mission (with their medical officer flag). */
function astronautsOf(missionId, ref) {
  const rows = ref.crew.filter((member) => member.missionId === missionId)
  return ref.users
    .filter((user) => rows.some((row) => row.userId === user.id) && hasRole(ref.roles, user, ASTRONAUT_ROLE_CODE))
    .map((user) => ({ ...user, isMedicalOfficer: rows.some((row) => row.userId === user.id && row.isMedicalOfficer) }))
}

/** Missions where this user is part of the crew (the flight surgeon is listed in crew too). */
function missionsOf(userId, ref) {
  return ref.missions.filter((mission) =>
    ref.crew.some((member) => member.missionId === mission.id && member.userId === userId),
  )
}

async function statusRows(astronauts, ref) {
  const readings = astronauts.length
    ? await db.readings.where('userId').anyOf(astronauts.map((user) => user.id)).toArray()
    : []
  return buildCrewStatus({
    astronauts,
    bodySystems: ref.bodySystems,
    indicators: ref.indicators,
    thresholds: ref.thresholds,
    readings,
  })
}

/**
 * Crew of one mission for the logged-in user.
 *
 * @param {string} userId - Logged-in user (flight surgeon or crew medical officer).
 * @param {string|null} preferredMissionId - Mission chosen by the user; the first of their
 *   missions is used when it is missing or not one of theirs.
 * @returns {Promise<{ mission: Object|null, missionCount: number, bodySystems: Object[], astronauts: Object[], rows: Object[] }>}
 *   rows: one status row per astronaut, worst first (see buildCrewStatus).
 */
export async function loadCrewData(userId, preferredMissionId = null, showAllMissions = false) {
  const ref = await loadReferenceData()
  const mine = missionsOf(userId, ref)
  const officerMissions = ref.crew.filter((row) => row.userId === userId && row.isMedicalOfficer)
  const visibleMissions = officerMissions.length && !showAllMissions
    ? mine.filter((item) => officerMissions.some((row) => row.missionId === item.id))
    : mine
  const allMissions = showAllMissions && !preferredMissionId
  const mission = allMissions
    ? null
    : visibleMissions.find((item) => item.id === preferredMissionId) ?? visibleMissions[0] ?? null
  const astronauts = allMissions
    ? [...new Map(mine.flatMap((item) => astronautsOf(item.id, ref)).map((user) => [user.id, user])).values()]
    : mission ? astronautsOf(mission.id, ref) : []

  return {
    mission,
    missionCount: mine.length,
    bodySystems: ref.bodySystems,
    astronauts,
    rows: await statusRows(astronauts, ref),
  }
}

/**
 * Every mission of the user, each with a status summary of its crew.
 *
 * @param {string} userId
 * @returns {Promise<Array<{ mission: Object, crewCount: number, counts: Record<string, number>, lastMeasuredAt: string|null }>>}
 */
export async function loadMyMissions(userId) {
  const ref = await loadReferenceData()
  return Promise.all(
    missionsOf(userId, ref).map(async (mission) => {
      const rows = await statusRows(astronautsOf(mission.id, ref), ref)
      const counts = Object.fromEntries(Object.values(LEVEL).map((level) => [level, 0]))
      for (const row of rows) counts[row.overall] += 1
      const lastMeasuredAt = rows.reduce((latest, row) => (row.lastMeasuredAt > (latest ?? '') ? row.lastMeasuredAt : latest), null)
      return { mission, crewCount: rows.length, counts, lastMeasuredAt }
    }),
  )
}

/**
 * One-way communication delay with Earth, e.g. "≈ 1 s" or "3–22 min".
 * Returns null when the mission has no delay data.
 */
export function formatCommDelay(mission) {
  const min = mission?.commDelayMinSec
  const max = mission?.commDelayMaxSec
  if (!Number.isFinite(max)) return null
  if (max < 60) return `≈ ${max} s`
  return min && min !== max ? `${Math.round(min / 60)}–${Math.round(max / 60)} min` : `${Math.round(max / 60)} min`
}

/**
 * Flight surgeon control center: every mission at once, ordered by what needs action.
 *
 * @param {string} userId - Flight surgeon.
 * @returns {Promise<{
 *   missions: Array<{ mission: Object, crewCount: number, counts: Record<string, number> }>,
 *   totals: { astronauts: number, critical: number, warning: number, unattended: number, unreadNotes: number },
 *   attention: Object[], recentNotes: Object[]
 * }>}
 */
export async function loadControlCenter(userId) {
  const ref = await loadReferenceData()
  const missions = await Promise.all(
    missionsOf(userId, ref).map(async (mission) => {
      const astronauts = astronautsOf(mission.id, ref)
      const rows = await statusRows(astronauts, ref)
      const counts = Object.fromEntries(Object.values(LEVEL).map((level) => [level, 0]))
      for (const row of rows) counts[row.overall] += 1
      return { mission, astronauts, rows, crewCount: rows.length, counts }
    }),
  )

  // One entry per astronaut (an astronaut could be in more than one mission: first one wins).
  const byUser = new Map()
  for (const { mission, astronauts, rows } of missions) {
    for (const row of rows) {
      if (byUser.has(row.user.id)) continue
      const user = astronauts.find((item) => item.id === row.user.id) ?? row.user
      byUser.set(row.user.id, { user, mission, row, alerts: [], unreadNotes: 0 })
    }
  }

  const { items: alertItems } = await loadCrewAlerts([...byUser.values()].map((entry) => entry.user))
  for (const item of alertItems) {
    if (!item.alert.attendedAt) byUser.get(item.user.id)?.alerts.push(item)
  }

  const sentNotes = (await db.messages.where('senderId').equals(userId).toArray()).sort((a, b) =>
    b.sentAt.localeCompare(a.sentAt),
  )
  for (const note of sentNotes) {
    const entry = byUser.get(note.recipientId)
    if (entry && !note.readAt) entry.unreadNotes += 1
  }

  // Needs action: critical first, then warning, then astronauts with open alerts or unread notes.
  const severity = { CRITICAL: 3, WARNING: 2 }
  const attention = [...byUser.values()]
    .filter((entry) => entry.row.overall === LEVEL.CRITICAL || entry.row.overall === LEVEL.WARNING || entry.alerts.length || entry.unreadNotes)
    .sort((a, b) => (severity[b.row.overall] ?? 0) - (severity[a.row.overall] ?? 0) || b.alerts.length - a.alerts.length)

  const recentNotes = sentNotes.slice(0, 5).map((note) => ({
    note,
    recipient: byUser.get(note.recipientId)?.user ?? ref.users.find((user) => user.id === note.recipientId) ?? null,
    mission: byUser.get(note.recipientId)?.mission ?? null,
  }))

  const rows = [...byUser.values()].map((entry) => entry.row)
  return {
    missions: missions.map(({ mission, crewCount, counts }) => ({ mission, crewCount, counts })),
    totals: {
      astronauts: rows.length,
      critical: rows.filter((row) => row.overall === LEVEL.CRITICAL).length,
      warning: rows.filter((row) => row.overall === LEVEL.WARNING).length,
      unattended: [...byUser.values()].reduce((sum, entry) => sum + entry.alerts.length, 0),
      unreadNotes: sentNotes.filter((note) => !note.readAt && byUser.has(note.recipientId)).length,
    },
    attention,
    recentNotes,
  }
}
