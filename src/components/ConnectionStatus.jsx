import { useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { useSession } from '../auth/session.js'
import { getProfilePendingCount } from '../sync/queue.js'

function subscribe(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

// Shows "En línea" / "Sin señal" (navigator.onLine + online/offline events) and how
// many local rows are still waiting to be synced: "Sin señal · 3 pendientes".
export default function ConnectionStatus() {
  const { t } = useTranslation()
  const isOnline = useSyncExternalStore(subscribe, getSnapshot)
  const userId = useSession()?.userId
  const pending = useLiveQuery(async () => ({
    userId,
    count: userId ? await getProfilePendingCount(userId) : 0,
  }), [userId])
  const pendingCount = pending?.userId === userId ? pending?.count ?? 0 : 0

  return (
    <span
      className={`connection-status ${isOnline ? 'is-online' : 'is-offline'}`}
      role="status"
      aria-live="polite"
    >
      <span className="connection-dot" aria-hidden="true" />
      {isOnline ? t('connection.online') : t('connection.offline')}
      {pendingCount > 0 && (
        <span className="connection-pending"> · {t('connection.pending', { count: pendingCount })}</span>
      )}
    </span>
  )
}
