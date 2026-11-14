import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import TrafficLight from '../../components/TrafficLight.jsx'
import { recommendationText } from '../../rules/engine.js'
import { alertNoteState } from './alertNote.js'
import { loadCrewAlerts } from './crewAlerts.js'
import { localName } from './display.js'
import './CrewAlerts.css'

const MAX_VISIBLE = 12
const LEVEL_FROM_CODE = { caution: 'WARNING', critical: 'CRITICAL' }

/**
 * Recent alerts of the whole crew, with the advice the astronaut received, whether
 * it was attended, and a shortcut to send a note about it.
 *
 * @param {Object} props
 * @param {Object[]} props.users - Astronauts shown in the crew table.
 * @param {boolean} [props.canSendNotes=true] - false for the read-only medical officer view.
 */
export default function CrewAlerts({ users, canSendNotes = true }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const userKey = users.map((user) => user.id).join('|')
  const data = useLiveQuery(() => loadCrewAlerts(users), [userKey])
  const [onlyOpen, setOnlyOpen] = useState(false)

  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })
  const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })

  function sendNote(item) {
    navigate(`/crew/${item.user.id}`, { state: alertNoteState(t, lang, item) })
  }

  const items = (data?.items ?? []).filter((item) => !onlyOpen || !item.alert.attendedAt)
  const visible = items.slice(0, MAX_VISIBLE)

  return (
    <section className="crew-alerts" aria-labelledby="crew-alerts-title">
      <header className="crew-alerts-header">
        <div>
          <h2 id="crew-alerts-title">{t('crewAlerts.title')}</h2>
          {data && <p className="muted">{t('crewAlerts.unattended', { count: data.unattended })}</p>}
        </div>
        <label className="crew-alerts-toggle" htmlFor="crew-alerts-only-open">
          <input
            id="crew-alerts-only-open"
            type="checkbox"
            checked={onlyOpen}
            onChange={(event) => setOnlyOpen(event.target.checked)}
          />
          {t('crewAlerts.onlyOpen')}
        </label>
      </header>

      {data === undefined ? (
        <p className="muted">{t('crew.loading')}</p>
      ) : visible.length === 0 ? (
        <p className="crew-alerts-empty muted">{onlyOpen ? t('crewAlerts.emptyOpen') : t('crewAlerts.empty')}</p>
      ) : (
        <ol className="crew-alerts-list">
          {visible.map((item) => {
            const advice = recommendationText(item.recommendation, item.reading, lang)
            const level = LEVEL_FROM_CODE[item.levelCode] ?? 'NO_DATA'
            return (
              <li key={item.alert.id} className={`crew-alert is-${item.levelCode ?? 'unknown'}`}>
                <div className="crew-alert-main">
                  <div className="crew-alert-line">
                    <TrafficLight level={level} />
                    <Link to={`/crew/${item.user.id}`} className="crew-alert-who">
                      {item.user.name}
                    </Link>
                    <span className="crew-alert-what">
                      {item.indicator ? localName(item.indicator, lang) : item.reading.indicatorCode}{' '}
                      <strong>
                        {numberFormat.format(item.reading.value)} {item.reading.unit}
                      </strong>
                      {item.direction && (
                        <span className="crew-alert-direction">
                          <span aria-hidden="true">{item.direction === 'high' ? ' ↑' : ' ↓'}</span>
                          <span className="crew-visually-hidden">{t(`crewAlerts.direction.${item.direction}`)}</span>
                        </span>
                      )}
                    </span>
                    <time className="crew-alert-time" dateTime={item.alert.generatedAt}>
                      {timeFormat.format(new Date(item.alert.generatedAt))}
                    </time>
                  </div>
                  {advice && <p className="crew-alert-advice">{advice}</p>}
                </div>
                <div className="crew-alert-side">
                  <span
                    className={`crew-alert-status ${item.alert.attendedAt ? 'is-done' : item.note ? 'is-sent' : 'is-open'}`}
                  >
                    {item.alert.attendedAt
                      ? t('crewAlerts.attended', { time: timeFormat.format(new Date(item.alert.attendedAt)) })
                      : item.note
                        ? t('crewAlerts.noteSent')
                        : t('crewAlerts.open')}
                  </span>
                  {canSendNotes && (
                    <button type="button" onClick={() => sendNote(item)}>
                      {t('crewAlerts.sendNote')}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {items.length > MAX_VISIBLE && (
        <p className="muted crew-alerts-more">{t('crewAlerts.more', { count: items.length - MAX_VISIBLE })}</p>
      )}
    </section>
  )
}
