import Dexie from 'dexie'

export const db = new Dexie('AstroHealthMonitor')

db.version(1).stores({
  readings: 'id, userId, indicatorCode, measuredAt, syncStatus',
})