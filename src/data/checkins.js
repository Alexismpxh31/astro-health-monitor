// Data layer for daily check-ins.
// Check-ins are astronaut self-reports: a flight surgeon can never save one,
// no matter which screen (or console call) tries to.

import { getSession, ROLE } from '../auth/session.js'
import { db } from '../db/db.js'

/** Thrown when the role of the user is not allowed to save a daily check-in. */
export class CheckinNotAllowedError extends Error {
  constructor() {
    super('[checkins] Flight surgeons cannot save daily check-ins')
    this.name = 'CheckinNotAllowedError'
  }
}

/**
 * Saves (or replaces) the daily check-in of a user for one date, its symptoms
 * and the readings derived from it, in a single transaction.
 *
 * @param {Object} checkin
 * @param {string} checkin.userId - Astronaut the check-in belongs to.
 * @param {string} checkin.date - UTC date, YYYY-MM-DD.
 * @param {number} checkin.mood
 * @param {number} checkin.sleepHours
 * @param {number} checkin.stress
 * @param {string|null} checkin.notes
 * @param {string[]} [checkin.symptomIds]
 * @param {Object[]} [checkin.readings] - Reading rows (see src/models/reading.js) stored with it.
 * @returns {Promise<string>} id of the saved check-in.
 * @throws {CheckinNotAllowedError} when the logged-in user or the owner is a flight surgeon.
 */
export async function saveDailyCheckin({ userId, date, mood, sleepHours, stress, notes, symptomIds = [], readings = [] }) {
  if (getSession()?.roleCode === ROLE.FLIGHT_SURGEON) throw new CheckinNotAllowedError()

  return db.transaction(
    'rw',
    [db.dailyCheckins, db.checkinSymptoms, db.readings, db.users, db.roles],
    async () => {
      // Also checked against the database, so a missing or stale session cannot bypass it.
      const owner = await db.users.get(userId)
      const ownerRole = owner ? await db.roles.get(owner.roleId) : null
      if (ownerRole?.code === ROLE.FLIGHT_SURGEON) throw new CheckinNotAllowedError()

      const existing = await db.dailyCheckins.where('[userId+date]').equals([userId, date]).first()
      const checkinId = existing?.id ?? crypto.randomUUID()

      if (existing) {
        const oldSymptoms = await db.checkinSymptoms
          .where('[checkinId+symptomId]')
          .between([checkinId, ''], [checkinId, '￿'])
          .toArray()
        await db.checkinSymptoms.bulkDelete(oldSymptoms.map((item) => [item.checkinId, item.symptomId]))
      }

      await db.dailyCheckins.put({
        id: checkinId,
        userId,
        date,
        mood,
        sleepHours,
        stress,
        notes,
        syncStatus: 'pending',
      })
      await db.checkinSymptoms.bulkPut(symptomIds.map((symptomId) => ({ checkinId, symptomId })))

      // Readings also go to db.readings, so charts and the flight surgeon panel see them.
      await db.readings.bulkPut(readings)
      return checkinId
    },
  )
}
