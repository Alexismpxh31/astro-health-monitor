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
    <section className="page">
      <h1>{t('pages.comms')}</h1>
      <p role="status">
        {pendingCount === undefined
          ? t('comms.loading')
          : t('comms.pendingCount', { count: pendingCount })}
      </p>
      <button type="button" onClick={handleSync} disabled={busy}>
        {t(busy ? 'comms.syncing' : 'comms.syncNow')}
      </button>
      {feedback && (
        <p role="status">{t(feedback.key, { count: feedback.count })}</p>
      )}
    </section>
  )
}