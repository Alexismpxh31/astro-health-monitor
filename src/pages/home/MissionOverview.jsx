import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '../../auth/session.js'
import Icon from '../../components/icons.jsx'
import TrafficLight from '../../components/TrafficLight.jsx'
import { getProfilePendingCount } from '../../sync/queue.js'
import CrewAlerts from '../crew/CrewAlerts.jsx'
import { loadCrewAlerts } from '../crew/crewAlerts.js'
import { formatCommDelay, loadCrewData } from '../crew/crewData.js'
import { setCurrentMission } from '../missions/missionStore.js'
import '../missions/Missions.css'
import { LEVEL, severityOf } from '../crew/crewStatus.js'
import { avatarLetters } from '../crew/avatar.js'
import { DISPLAY_CODE, localName } from '../crew/display.js'

/** The indicator behind the worst system of a crew member (what the surgeon should look at first). */
function worstReading(row) {
  let worst = null
  for (const status of Object.values(row.systems)) {
    if (!status.reading) continue
    if (!worst || severityOf(status.level) > severityOf(worst.level)) worst = status
  }
  return worst
}

// Flight surgeon: how one mission (from /missions/:missionId) is doing at a glance.
export default function MissionOverview() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const { missionId } = useParams()
  const userId = useSession()?.userId
  const data = useLiveQuery(() => (userId ? loadCrewData(userId, missionId) : null), [userId, missionId])

  // Remember the mission, so "Crew" and the detail pages show the same one.
  useEffect(() => {
    if (userId && missionId) setCurrentMission(userId, missionId)
  }, [userId, missionId])
  const userKey = data?.astronauts.map((user) => user.id).join('|') ?? ''
  const alerts = useLiveQuery(() => (data ? loadCrewAlerts(data.astronauts) : null), [userKey])
  const pending = useLiveQuery(() => userId ? getProfilePendingCount(userId) : 0, [userId], 0)

  if (!data) return <p className="muted">{t('crew.loading')}</p>

  const { mission, astronauts, rows } = data
  const delay = formatCommDelay(mission)
  const count = (level) => rows.filter((row) => row.overall === level).length
  const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })
  const letters = avatarLetters(rows.map((row) => row.user.name))

  const kpis = [
    { key: 'critical', value: count(LEVEL.CRITICAL), tone: 'is-critical', icon: 'bell' },
    { key: 'warning', value: count(LEVEL.WARNING), tone: 'is-warning', icon: 'vitals' },
    { key: 'alerts', value: alerts?.unattended ?? 0, tone: alerts?.unattended ? 'is-warning' : 'is-normal', icon: 'comms' },
    { key: 'pending', value: pending, tone: 'is-info', icon: 'sensors' },
  ]

  return (
    <section className="home mission">
      <header className="home-head mission-head">
        <div>
          <Link to="/missions" className="mission-switch">
            ← {t('missions.title')}
          </Link>
          <h1>{t('overview.title')}</h1>
          <p className="muted">
            {t('overview.subtitle', { mission: mission ? localName(mission, lang) : '', count: rows.length })}{' '}
            {delay && <span className="mission-delay">{t('missions.delayShort', { delay })}</span>}
          </p>
        </div>
        <div className="mission-actions">
          <Link to="/crew" className="button-link is-primary">
            {t('overview.openTable')}
            <Icon name="chevronRight" size={20} />
          </Link>
        </div>
      </header>

      <div className="kpi-cards">
        {kpis.map((kpi) => (
          <article key={kpi.key} className={`kpi-card glass ${kpi.tone}`}>
            <span className="kpi-icon"><Icon name={kpi.icon} size={24} /></span>
            <span className="kpi-value">{kpi.value}</span>
            <span className="kpi-label">{t(`overview.kpi.${kpi.key}`, { count: kpi.value })}</span>
          </article>
        ))}
      </div>

      <section aria-labelledby="crew-cards-title" className="mission-crew">
        <h2 id="crew-cards-title" className="card-title">{t('overview.crewTitle')}</h2>
        <ul className="crew-cards">
          {rows.map((row, index) => {
            const worst = worstReading(row)
            const user = astronauts.find((item) => item.id === row.user.id) ?? row.user
            return (
              <li key={row.user.id}>
                <Link to={`/crew/${row.user.id}`} className={`crew-card glass is-${row.overall.toLowerCase().replace('_', '-')}`}>
                  <span className="crew-avatar" aria-hidden="true">{letters[index]}</span>
                  <span className="crew-card-body">
                    <span className="crew-card-name">
                      {row.user.name}
                      {user.isMedicalOfficer && <span className="crew-officer-badge">{t('crew.medicalOfficer')}</span>}
                    </span>
                    <span className="crew-card-detail muted">
                      {worst
                        ? `${DISPLAY_CODE[worst.reading.indicatorCode] ?? localName({ code: worst.reading.indicatorCode }, lang)} ${numberFormat.format(worst.reading.value)} ${worst.reading.unit}`
                        : t('overview.noData')}
                      {row.lastMeasuredAt && ` · ${timeFormat.format(new Date(row.lastMeasuredAt))}`}
                    </span>
                  </span>
                  <TrafficLight level={row.overall} />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <CrewAlerts users={astronauts} canSendNotes />
    </section>
  )
}
