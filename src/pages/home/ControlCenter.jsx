import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../auth/session.js'
import Icon from '../../components/icons.jsx'
import TrafficLight from '../../components/TrafficLight.jsx'
import { ensureDemoCrew } from '../../data/demoCrew.js'
import { db } from '../../db/db.js'
import { alertNoteState } from '../crew/alertNote.js'
import { avatarLetters } from '../crew/avatar.js'
import { formatCommDelay, loadControlCenter } from '../crew/crewData.js'
import { LEVEL, severityOf } from '../crew/crewStatus.js'
import { DISPLAY_CODE, localName } from '../crew/display.js'
import LiveDemoToggle from '../crew/LiveDemoToggle.jsx'
import { setCurrentMission } from '../missions/missionStore.js'
import '../missions/Missions.css'
import './ControlCenter.css'

const STATUS_LEVELS = [LEVEL.CRITICAL, LEVEL.WARNING, LEVEL.NORMAL]

/** The reading behind the worst body system of a crew member. */
function worstReading(row) {
  let worst = null
  for (const status of Object.values(row.systems)) {
    if (!status.reading) continue
    if (!worst || severityOf(status.level) > severityOf(worst.level)) worst = status
  }
  return worst?.reading ?? null
}

// Flight surgeon home: every mission at once, with what needs action first.
export default function ControlCenter() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const navigate = useNavigate()
  const session = useSession()
  const userId = session?.userId
  const data = useLiveQuery(() => (userId ? loadControlCenter(userId) : null), [userId])
  const surgeon = useLiveQuery(() => (userId ? db.users.get(userId) : null), [userId])

  useEffect(() => {
    ensureDemoCrew().catch((error) => console.error('[control] Could not prepare demo data', error))
  }, [])

  if (!data) return <p className="muted">{t('crew.loading')}</p>

  const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })
  const dateFormat = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' })
  const { totals, attention, missions, recentNotes } = data
  const letters = avatarLetters(attention.map((entry) => entry.user.name))

  const kpis = [
    { key: 'astronauts', value: totals.astronauts, tone: 'is-info', icon: 'crew' },
    { key: 'critical', value: totals.critical, tone: totals.critical ? 'is-critical' : 'is-normal', icon: 'bell' },
    { key: 'warning', value: totals.warning, tone: totals.warning ? 'is-warning' : 'is-normal', icon: 'vitals' },
    { key: 'unattended', value: totals.unattended, tone: totals.unattended ? 'is-warning' : 'is-normal', icon: 'checkin' },
    { key: 'unreadNotes', value: totals.unreadNotes, tone: 'is-info', icon: 'comms' },
  ]

  function goToMember(entry, state) {
    setCurrentMission(userId, entry.mission.id)
    navigate(`/crew/${entry.user.id}`, state ? { state } : undefined)
  }

  function openMission(missionId) {
    setCurrentMission(userId, missionId)
    navigate(`/missions/${missionId}`)
  }

  return (
    <section className="home control">
      <header className="home-head mission-head">
        <div>
          <h1>{t('control.title')}</h1>
          <p className="muted control-date">
            {t('control.greeting', { name: surgeon?.name ?? '' })} · {dateFormat.format(new Date())}
          </p>
        </div>
        <div className="mission-actions">
          <LiveDemoToggle />
        </div>
      </header>

      <div className="kpi-cards control-kpis">
        {kpis.map((kpi) => (
          <article key={kpi.key} className={`kpi-card glass ${kpi.tone}`}>
            <span className="kpi-icon"><Icon name={kpi.icon} size={24} /></span>
            <span className="kpi-value">{kpi.value}</span>
            <span className="kpi-label">{t(`control.kpi.${kpi.key}`, { count: kpi.value })}</span>
          </article>
        ))}
      </div>

      <div className="control-grid">
        <section className="attention glass" aria-labelledby="attention-title">
          <h2 id="attention-title" className="card-title">{t('control.attentionTitle')}</h2>
          {attention.length === 0 ? (
            <p className="attention-empty">
              <TrafficLight level={LEVEL.NORMAL} /> {t('control.allStable')}
            </p>
          ) : (
            <ol className="attention-list">
              {attention.map((entry, index) => {
                const reading = worstReading(entry.row)
                const latestAlert = entry.alerts[0] ?? null
                const delay = formatCommDelay(entry.mission)
                return (
                  <li key={entry.user.id} className={`attention-row is-${entry.row.overall.toLowerCase().replace('_', '-')}`}>
                    <span className="crew-avatar" aria-hidden="true">{letters[index]}</span>
                    <div className="attention-body">
                      <p className="attention-name">
                        {entry.user.name}
                        {entry.user.isMedicalOfficer && <span className="crew-officer-badge">{t('crew.medicalOfficer')}</span>}
                      </p>
                      <p className="attention-mission muted">
                        {localName(entry.mission, lang)}
                        {delay && ` · ${t('missions.delayShort', { delay })}`}
                      </p>
                      <div className="attention-tags">
                        <TrafficLight level={entry.row.overall} />
                        {reading && (
                          <span className="attention-tag">
                            {DISPLAY_CODE[reading.indicatorCode] ?? reading.indicatorCode} {numberFormat.format(reading.value)} {reading.unit}
                          </span>
                        )}
                        {entry.alerts.length > 0 && (
                          <span className="attention-tag is-alert">{t('control.openAlerts', { count: entry.alerts.length })}</span>
                        )}
                        {entry.unreadNotes > 0 && (
                          <span className="attention-tag is-note">{t('control.unreadNotes', { count: entry.unreadNotes })}</span>
                        )}
                      </div>
                    </div>
                    <div className="attention-actions">
                      <button
                        type="button"
                        className="is-primary"
                        onClick={() => goToMember(entry, latestAlert ? alertNoteState(t, lang, latestAlert) : null)}
                      >
                        {t('crewAlerts.sendNote')}
                      </button>
                      <button type="button" onClick={() => goToMember(entry, null)}>
                        {t('control.viewMember')}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <div className="control-side">
          <section className="glass control-panel" aria-labelledby="control-missions-title">
            <h2 id="control-missions-title" className="card-title">{t('control.missionsTitle')}</h2>
            <ul className="mini-missions">
              {missions.map(({ mission, crewCount, counts }) => (
                <li key={mission.id}>
                  <button type="button" className="mini-mission" onClick={() => openMission(mission.id)}>
                    <span className="mini-mission-head">
                      <span className="mini-mission-name">{localName(mission, lang)}</span>
                      <Icon name="chevronRight" size={18} />
                    </span>
                    <span className="muted mini-mission-meta">
                      {t('missions.crewCount', { count: crewCount })}
                      {formatCommDelay(mission) && ` · ${t('missions.delayShort', { delay: formatCommDelay(mission) })}`}
                    </span>
                    <span className="mini-mission-status">
                      {STATUS_LEVELS.map((level) => (
                        <span key={level} className="mini-status">
                          <b>{counts[level]}</b>
                          <TrafficLight level={level} />
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Link to="/missions" className="mission-switch">{t('control.allMissions')} →</Link>
          </section>

          <section className="glass control-panel" aria-labelledby="control-notes-title">
            <h2 id="control-notes-title" className="card-title">{t('control.notesTitle')}</h2>
            {recentNotes.length === 0 ? (
              <p className="muted">{t('control.noNotes')}</p>
            ) : (
              <ul className="recent-notes">
                {recentNotes.map(({ note, recipient, mission }) => (
                  <li key={note.id}>
                    <p className="recent-note-head">
                      <strong>{recipient?.name ?? '—'}</strong>
                      <span className={`recent-note-status ${note.readAt ? 'is-read' : 'is-unread'}`}>
                        {note.readAt ? t('crewDetail.notes.read') : t('control.unread')}
                      </span>
                    </p>
                    <p className="recent-note-text">{note.content}</p>
                    <p className="muted recent-note-meta">
                      {mission ? `${localName(mission, lang)} · ` : ''}
                      {timeFormat.format(new Date(note.sentAt))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </section>
  )
}
