import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

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

// Shows "En línea" / "Sin señal" based on navigator.onLine and online/offline events.
export default function ConnectionStatus() {
  const { t } = useTranslation()
  const isOnline = useSyncExternalStore(subscribe, getSnapshot)

  return (
    <span
      className={`connection-status ${isOnline ? 'is-online' : 'is-offline'}`}
      role="status"
      aria-live="polite"
    >
      <span className="connection-dot" aria-hidden="true" />
      {isOnline ? t('connection.online') : t('connection.offline')}
    </span>
  )
}
