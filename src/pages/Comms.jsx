import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { db } from '../db/db.js'
import { createReading } from '../models/reading.js'
import { getPendingCount } from '../sync/queue.js'

export default function Comms() {
  const { t } = useTranslation()
  const pendingCount = useLiveQuery(getPendingCount, [])

  function addTestReading() {
    return db.readings.add(createReading({
      userId: '00000000-0000-4000-8000-000000000901',
      indicatorCode: 'HR',
      value: 72,
      unit: 'bpm',
      source: 'simulated',
    }))
  }

  return (
    <section className="page">
      <h1>{t('pages.comms')}</h1>
      <p role="status">
        {pendingCount === undefined
          ? t('comms.loading')
          : t('comms.pendingCount', { count: pendingCount })}
      </p>
      <button type="button" onClick={addTestReading}>
        Agregar lectura de prueba
      </button>
    </section>
  )
}