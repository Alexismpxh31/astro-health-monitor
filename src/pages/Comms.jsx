import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { getPendingCount } from '../sync/queue.js'

export default function Comms() {
  const { t } = useTranslation()
  const pendingCount = useLiveQuery(getPendingCount, [])

 alexis/fix-db
  function addTestReading() {
    return db.readings.add(createReading({
      userId: 'a0000000-0000-4000-8000-000000000002',
      indicatorCode: 'HR',
      value: 72,
      unit: 'bpm',
      source: 'simulated',
    }))
  }


 main
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