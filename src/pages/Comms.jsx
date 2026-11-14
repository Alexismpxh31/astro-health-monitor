import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { getSession } from '../auth/session.js'
import { db } from '../db/db.js'
import { getPendingCount } from '../sync/queue.js'

const DEMO_ASTRONAUT_ID = 'a0000000-0000-4000-8000-000000000002'

export default function Comms() {
  const { t, i18n } = useTranslation()
  const userId = getSession()?.userId ?? DEMO_ASTRONAUT_ID
  const pendingCount = useLiveQuery(getPendingCount, [])
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
      await db.transaction('rw', db.messages, async () => {
        const note = await db.messages.get(noteId)
        if (note?.recipientId !== userId || note.readAt) return

        await db.messages.update(noteId, {
          readAt: new Date().toISOString(),
        })
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