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
 */
export default function NotesPanel({ recipientId, senderId, notes, lang }) {
  const { t } = useTranslation()
  const fieldId = useId()
  const [text, setText] = useState('')
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
        syncStatus: 'pending',
      })
      setText('')
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
        <textarea
          id={fieldId}
          rows={4}
          maxLength={MAX_LENGTH}
          value={text}
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
