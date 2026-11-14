import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '../../db/db.js'

const MAX_LENGTH = 500

function noteStatusKey(note) {
  if (note.readAt) return 'crewDetail.notes.read'
  return note.syncStatus === 'synced' ? 'crewDetail.notes.synced' : 'crewDetail.notes.pending'
}

/**
 * Flight surgeon -> astronaut notes. Saved locally in db.messages (syncStatus 'pending');
 * the sync queue uploads them and the astronaut reads them in /comms.
 *
 * @param {Object} props
 * @param {string} props.recipientId
 * @param {string|null} props.senderId
 * @param {Object[]} props.notes - Messages sent to this crew member, newest first.
 * @param {string} props.lang
 * @param {string} [props.initialDraft] - Text to start with (e.g. written from an alert).
 * @param {string|null} [props.alertId] - Alert the note answers: reading the note attends it.
 */
export default function NotesPanel({ recipientId, senderId, notes, lang, initialDraft = '', alertId = null }) {
  const { t } = useTranslation()
  const fieldId = useId()
  const [text, setText] = useState(initialDraft.slice(0, MAX_LENGTH))
  const [linkedAlertId, setLinkedAlertId] = useState(alertId)
  const [errorKey, setErrorKey] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const dateFormat = new Intl.DateTimeFormat(lang, { dateStyle: 'short', timeStyle: 'short' })

  async function handleSubmit(event) {
    event.preventDefault()
    const content = text.trim()
    if (!content) return
    if (!senderId) {
      setErrorKey('crewDetail.notes.noSender')
      return
    }

    setIsSending(true)
    try {
      await db.messages.add({
        id: crypto.randomUUID(),
        senderId,
        recipientId,
        content,
        sentAt: new Date().toISOString(),
        readAt: null,
        // Link to the alert the note answers (Comms attends it when the note is read).
        // Uploaded as messages.alert_id by src/sync/queue.js.
        ...(linkedAlertId ? { alertId: linkedAlertId } : {}),
        syncStatus: 'pending',
      })
      setText('')
      setLinkedAlertId(null)
      setErrorKey(null)
    } catch (error) {
      console.error('[crew] Could not save the note', error)
      setErrorKey('crewDetail.notes.sendError')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="notes-panel" aria-labelledby={`${fieldId}-title`}>
      <h2 id={`${fieldId}-title`}>{t('crewDetail.notes.title')}</h2>

      <form onSubmit={handleSubmit} className="notes-form">
        <label htmlFor={fieldId} className="notes-label">
          {t('crewDetail.notes.label')}
        </label>
        {linkedAlertId && <p className="notes-linked">{t('crewDetail.notes.linkedToAlert')}</p>}
        <textarea
          id={fieldId}
          rows={4}
          maxLength={MAX_LENGTH}
          value={text}
          autoFocus={Boolean(initialDraft)}
          placeholder={t('crewDetail.notes.placeholder')}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="notes-form-footer">
          <span className="muted">
            {text.length}/{MAX_LENGTH}
          </span>
          <button type="submit" className="is-primary" disabled={isSending || !text.trim()}>
            {isSending ? t('crewDetail.notes.sending') : t('crewDetail.notes.send')}
          </button>
        </div>
        {errorKey && (
          <p className="notes-error" role="alert">
            {t(errorKey)}
          </p>
        )}
      </form>

      {notes.length === 0 ? (
        <p className="muted">{t('crewDetail.notes.empty')}</p>
      ) : (
        <ol className="notes-list">
          {notes.map((note) => (
            <li key={note.id}>
              <p className="notes-content">{note.content}</p>
              <p className="notes-meta muted">
                <time dateTime={note.sentAt}>{dateFormat.format(new Date(note.sentAt))}</time>
                <span>{t(noteStatusKey(note))}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
