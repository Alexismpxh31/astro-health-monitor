import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../auth/session.js'
import Icon from '../../components/icons.jsx'
import TrafficLight from '../../components/TrafficLight.jsx'
import { formatCommDelay, loadMyMissions } from '../crew/crewData.js'
import { LEVEL } from '../crew/crewStatus.js'
import { localName } from '../crew/display.js'
import { setCurrentMission, useCurrentMission } from './missionStore.js'
import './Missions.css'

const STATUS_LEVELS = [LEVEL.CRITICAL, LEVEL.WARNING, LEVEL.NORMAL]

// Flight surgeon: the missions they follow. Picking one opens its overview.
export default function MissionList() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const navigate = useNavigate()
  const userId = useSession()?.userId
  const currentId = useCurrentMission(userId)
  const missions = useLiveQuery(() => (userId ? loadMyMissions(userId) : []), [userId])
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })

  function open(missionId) {
    setCurrentMission(userId, missionId)
    navigate(`/missions/${missionId}`)
  }

  return (
    <section className="missions">
      <header className="home-head">
        <h1>{t('missions.title')}</h1>
        <p className="muted">{t('missions.subtitle')}</p>
      </header>

      {missions === undefined ? (
        <p className="muted">{t('crew.loading')}</p>
      ) : missions.length === 0 ? (
        <p className="crew-detail-empty muted">{t('missions.empty')}</p>
      ) : (
        <ul className="mission-cards">
          {missions.map(({ mission, crewCount, counts, lastMeasuredAt }) => {
            const delay = formatCommDelay(mission)
            const isCurrent = mission.id === currentId
            const worst = counts[LEVEL.CRITICAL] ? 'is-critical' : counts[LEVEL.WARNING] ? 'is-warning' : 'is-normal'
            return (
              <li key={mission.id}>
                <article className={`mission-card glass ${worst}${isCurrent ? ' is-current' : ''}`}>
                  <div className="mission-card-top">
                    <span className="mission-icon"><Icon name="missions" size={30} /></span>
                    <div className="mission-card-title">
                      <h2>{localName(mission, lang)}</h2>
                      <p className="muted">{mission.destination}</p>
                    </div>
                    {isCurrent && <span className="mission-current">{t('missions.current')}</span>}
                  </div>

                  <dl className="mission-facts">
                    <div>
                      <dt>{t('missions.crew')}</dt>
                      <dd>{t('missions.crewCount', { count: crewCount })}</dd>
                    </div>
                    {delay && (
                      <div>
                        <dt>{t('missions.delay')}</dt>
                        <dd>{delay}</dd>
                      </div>
                    )}
                    <div>
                      <dt>{t('crew.lastReading')}</dt>
                      <dd>{lastMeasuredAt ? timeFormat.format(new Date(lastMeasuredAt)) : '—'}</dd>
                    </div>
                  </dl>

                  <ul className="mission-status" aria-label={t('missions.status')}>
                    {STATUS_LEVELS.map((level) => (
                      <li key={level}>
                        <span className="mission-status-count">{counts[level]}</span>
                        <TrafficLight level={level} />
                      </li>
                    ))}
                  </ul>

                  <button type="button" className="mission-open" onClick={() => open(mission.id)}>
                    {t('missions.open')}
                    <Icon name="chevronRight" size={20} />
                  </button>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
