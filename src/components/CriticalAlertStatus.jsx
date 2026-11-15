import { useLiveQuery } from 'dexie-react-hooks'
import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { db } from '../db/db.js'

async function countCriticalAlerts(userId) {
  const [levels, openAlerts] = await Promise.all([
    db.alertLevels.toArray(),
    db.alerts.filter((alert) => !alert.attendedAt).toArray(),
  ])
  const criticalId = levels.find((level) => level.code.toLowerCase() === 'critical')?.id
  if (!criticalId) return 0

  const readingIds = openAlerts
    .filter((alert) => alert.alertLevelId === criticalId)
    .map((alert) => alert.readingId)
  const readings = await db.readings.bulkGet(readingIds)
  return readings.filter((reading) => reading?.userId === userId).length
}

export default function CriticalAlertStatus({ userId }) {
  const { t } = useTranslation()
  const count = useLiveQuery(() => countCriticalAlerts(userId), [userId], 0)

  return (
    <div className="critical-alert-status" role="status">
      {count > 0 && (
        <Link className="connection-status critical-alert-link" to="/alerts">
          <AlertCircle size={18} aria-hidden="true" />
          {t('connection.criticalAlerts', { count })}
        </Link>
      )}
    </div>
  )
}
