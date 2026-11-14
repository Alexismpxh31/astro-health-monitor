import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { getPendingCount, syncPending } from '../sync/queue.js'
import { supabase } from '../sync/supabaseClient.js'

export default function Comms() {
  const { t } = useTranslation()
  const pendingCount = useLiveQuery(getPendingCount, [])
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function handleSync() {
    setBusy(true)
    setFeedback(null)

    try {
      if (!supabase) {
        setFeedback({ key: 'comms.notConfigured' })
        return
      }

      if (!navigator.onLine) {
        setFeedback({ key: 'comms.offline' })
        return
      }

      const { data, error } = await supabase.auth.getSession()
      if (error) throw error

      if (!data.session) {
        setFeedback({ key: 'comms.signInRequired' })
        return
      }

      const { pushed } = await syncPending()
      setFeedback(
        pushed > 0
          ? { key: 'comms.sent', count: pushed }
          : { key: 'comms.nothingToSend' },
      )
    } catch (error) {
      console.error('[sync] Manual sync failed', error)
      setFeedback({ key: 'comms.syncError' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0E1B3E', marginBottom: '16px' }}>{t('pages.comms')}</h1>
      <p role="status" style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
        {pendingCount === undefined
          ? t('comms.loading')
          : t('comms.pendingCount', { count: pendingCount })}
      </p>
      <button 
        type="button" 
        onClick={handleSync} 
        disabled={busy}
        style={{
          background: '#0B57D0',
          color: '#FFFFFF',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '13px',
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.7 : 1
        }}
      >
        {t(busy ? 'comms.syncing' : 'comms.syncNow')}
      </button>
      {feedback && (
        <p role="status" style={{ marginTop: '12px', fontSize: '13px', color: '#059669', fontWeight: '600' }}>
          {t(feedback.key, { count: feedback.count })}
        </p>
      )}
    </section>
  )
}
