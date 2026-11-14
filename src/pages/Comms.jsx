import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { getPendingCount } from '../sync/queue.js'

export default function Comms() {
  const { t } = useTranslation()
  const pendingCount = useLiveQuery(getPendingCount, [])

  return (
    <section className="page">
      <h1>{t('pages.comms')}</h1>
      <p role="status">
        {pendingCount === undefined
          ? t('comms.loading')
          : t('comms.pendingCount', { count: pendingCount })}
      </p>
    </section>
  )
}