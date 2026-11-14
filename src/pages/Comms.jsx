import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { getPendingCount } from '../sync/queue.js'

export default function Comms() {
  const { t } = useTranslation()
  const pendingCount = useLiveQuery(getPendingCount, [])

  return (
    <section className="page" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0E1B3E', marginBottom: '16px' }}>{t('pages.comms')}</h1>
      <p role="status" style={{ fontSize: '14px', color: '#475569' }}>
        {pendingCount === undefined
          ? t('comms.loading')
          : t('comms.pendingCount', { count: pendingCount })}
      </p>
    </section>
  )
}
