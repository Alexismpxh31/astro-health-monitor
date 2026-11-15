import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { getSession, useSession } from '../auth/session.js'
import { DEMO_ASTRONAUT_ID } from '../data/demoUser.js'
import { db } from '../db/db.js'
import { getLinkedProfileId, getProfilePendingCount, syncPending } from '../sync/queue.js'
import { supabase } from '../sync/supabaseClient.js'

export default function Comms() {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const userId = session?.userId ?? DEMO_ASTRONAUT_ID
  const pendingCount = useLiveQuery(() => getProfilePendingCount(userId), [userId])
  const [readError, setReadError] = useState(false)

  const notes = useLiveQuery(async () => {
    const messages = await db.messages.where('recipientId').equals(userId).sortBy('sentAt')
    return messages.reverse()
  }, [userId])

  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  async function markAsRead(noteId) {
    setReadError(false)

    try {
      await db.transaction('rw', db.messages, db.alerts, async () => {
        const note = await db.messages.get(noteId)
        if (note?.recipientId !== userId || note.readAt) return

        const now = new Date().toISOString()
        await db.messages.update(noteId, { readAt: now, syncStatus: 'pending' })

        // A note sent from an alert: reading it means the astronaut got the advice,
        // so the alert is attended for the flight surgeon too.
        if (note.alertId) {
          const alert = await db.alerts.get(note.alertId)
          if (alert && !alert.attendedAt) {
            await db.alerts.update(note.alertId, { attendedAt: now, syncStatus: 'pending' })
          }
        }
      })
    } catch (error) {
      console.error('[comms] Could not mark note as read', error)
      setReadError(true)
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

      {session && <CloudSync key={session.userId} session={session} />}

      <section className="notes-panel" aria-labelledby="medical-notes-title">
        <h2 id="medical-notes-title">{t('comms.notes.title')}</h2>
        {readError && <p role="alert">{t('comms.notes.readError')}</p>}
        {notes === undefined ? (
          <p role="status">{t('comms.notes.loading')}</p>
        ) : notes.length === 0 ? (
          <p className="muted">{t('comms.notes.empty')}</p>
        ) : (
          <ol className="notes-list">
            {notes.map((note) => (
              <li key={note.id}>
                <p className="notes-content">{note.content}</p>
                <p className="notes-meta muted">
                  <time dateTime={note.sentAt}>
                    {dateFormat.format(new Date(note.sentAt))}
                  </time>
                </p>
                {note.readAt ? (
                  <span>{t('crewDetail.notes.read')}</span>
                ) : (
                  <button type="button" onClick={() => markAsRead(note.id)}>
                    {t('comms.notes.markAsRead')}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  )
}
function CloudSync({ session }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  async function run(action) {
    setBusy(true)
    setFeedback(null)
    try {
      if (!supabase) {
        setFeedback({ key: 'notConfigured' })
      } else if (!navigator.onLine) {
        setFeedback({ key: 'offline' })
      } else {
        await action()
      }
    } catch {
      setFeedback({ key: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function linkAccount(event) {
    event.preventDefault()
    const form = event.currentTarget
    const credentials = new FormData(form)
    await run(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.get('email'),
        password: credentials.get('password'),
      })
      if (error) throw error
      if ((await getLinkedProfileId()) !== session.userId || getSession() !== session) {
        await supabase.auth.signOut({ scope: 'local' })
        setFeedback({ key: 'wrongProfile' })
        return
      }
      setShowLogin(false)
      setFeedback({ key: 'linked' })
    })
    form.reset()
  }

  async function handleSync() {
    await run(async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!data.session || (await getLinkedProfileId()) !== session.userId) {
        setShowLogin(true)
        setFeedback({ key: 'linkRequired' })
        return
      }
      const { pushed, pulled, crewRecords } = await syncPending()
      const remaining = await getProfilePendingCount(session.userId)
      setFeedback({ key: 'summary', pushed, pulled, crewRecords, remaining })
    })
  }

  return (
    <section aria-label={t('comms.cloud.syncNow')}>
      <button type="button" disabled={busy} onClick={handleSync}>
        {t('comms.cloud.syncNow')}
      </button>
      {showLogin && (
        <form onSubmit={linkAccount}>
          <label>
            {t('comms.cloud.email')}
            <input type="email" name="email" autoComplete="username" required />
          </label>
          <label>
            {t('comms.cloud.password')}
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button type="submit" disabled={busy}>{t('comms.cloud.link')}</button>
        </form>
      )}
      <p role="status">
        {busy ? t('comms.cloud.working') : feedback && t('comms.cloud.' + feedback.key, feedback)}
      </p>
    </section>
  )
}
