import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import { ROLE, useSession } from '../auth/session.js'
import Icon from '../components/icons.jsx'
import TrafficLight from '../components/TrafficLight.jsx'
import { ensureDemoCrew } from '../data/demoCrew.js'
import { localName } from './crew/display.js'
import { RingGauge, Sparkline } from './home/charts.jsx'
import { loadHomeData } from './home/homeData.js'
import { getCurrentMission } from './missions/missionStore.js'
import ModelStage from './home/ModelStage.jsx'
import './Home.css'

const LEVEL_RANK = { NO_DATA: -1, NORMAL: 0, WARNING: 1, CRITICAL: 2 }
const worse = (a, b) => ((LEVEL_RANK[b] ?? -1) > (LEVEL_RANK[a] ?? -1) ? b : a)

// Astronaut home: vital cards, body systems with their traffic light, the 3D model
// stage (Walter) and the clinical card of the selected system.
export default function Home() {
  const session = useSession()
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const userId = session?.userId
  const data = useLiveQuery(() => (userId ? loadHomeData(userId) : null), [userId])
  const [selectedCode, setSelectedCode] = useState(null)

  useEffect(() => {
    ensureDemoCrew().catch((error) => console.error('[home] Could not prepare demo data', error))
  }, [])

  // The flight surgeon has no health data of their own: their home is the mission they
  // are following, or the list of their missions to pick one.
  if (session?.roleCode === ROLE.FLIGHT_SURGEON) {
    const missionId = getCurrentMission(session.userId)
    return <Navigate to={missionId ? `/missions/${missionId}` : '/missions'} replace />
  }
  if (data === undefined) return <p className="muted">{t('crew.loading')}</p>
  if (data === null) return <p className="muted">{t('crewDetail.notFound')}</p>

  const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })
  const format = (entry) => (entry ? numberFormat.format(entry.latest.value) : '—')

  const { byCode, systems } = data
  const sbp = byCode.SBP
  const dbp = byCode.DBP
  const spo2 = byCode.SPO2
  const hr = byCode.HR
  const bpLevel = worse(sbp?.level ?? 'NO_DATA', dbp?.level ?? 'NO_DATA')

  const selected = systems.find((row) => row.system.code === (selectedCode ?? data.worstSystemCode)) ?? systems[0]
  const levels = Object.fromEntries(systems.map((row) => [row.system.code, row.level]))
  const firstName = data.user.name ?? data.user.firstName

  return (
    <section className="home">
      <header className="home-head">
        <h1>{t('home.title', { name: firstName })}</h1>
        <p className="muted">
          {data.lastMeasuredAt
            ? t('home.lastReading', { time: timeFormat.format(new Date(data.lastMeasuredAt)) })
            : t('home.noReadingsYet')}
          {data.hasSimulatedData && <span className="home-sim-tag">{t('sensors.simulatedData')}</span>}
        </p>
      </header>

      <div className="vital-cards">
        <article className="vital-card glass">
          <span className="vital-icon"><Icon name="cardiovascular" size={28} /></span>
          <div className="vital-text">
            <span className="vital-label">{t('home.cards.bp')}</span>
            <span className="vital-value">
              {format(sbp)}/{format(dbp)} <small>mmHg</small>
            </span>
            <TrafficLight level={bpLevel} />
          </div>
          <Sparkline values={sbp?.series} />
        </article>

        <article className="vital-card glass">
          <span className="vital-icon"><Icon name="lungs" size={28} /></span>
          <div className="vital-text">
            <span className="vital-label">{t('home.cards.spo2')}</span>
            <span className="vital-value">
              {format(spo2)} <small>%</small>
            </span>
            <TrafficLight level={spo2?.level ?? 'NO_DATA'} />
          </div>
          <RingGauge value={spo2?.latest.value} />
        </article>

        <article className="vital-card glass">
          <span className="vital-icon"><Icon name="vitals" size={28} /></span>
          <div className="vital-text">
            <span className="vital-label">{t('home.cards.hr')}</span>
            <span className="vital-value">
              {format(hr)} <small>bpm</small>
            </span>
            <TrafficLight level={hr?.level ?? 'NO_DATA'} />
          </div>
          <Sparkline values={hr?.series} />
        </article>
      </div>

      {!data.hasData && (
        <div className="home-empty glass">
          <p>
            <strong>{t('home.emptyTitle')}</strong> {t('home.emptyText')}
          </p>
          <Link to="/sensors" className="button-link is-primary">
            {t('home.goSensors')}
          </Link>
        </div>
      )}

      <div className="home-grid">
        <section className="systems-card glass" aria-labelledby="systems-title">
          <h2 id="systems-title" className="card-title">{t('home.systemsTitle')}</h2>
          <ul className="system-list">
            {systems.map((row) => {
              const isSelected = row.system.code === selected?.system.code
              return (
                <li key={row.system.id}>
                  <button
                    type="button"
                    className={`system-row${isSelected ? ' is-selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCode(row.system.code)}
                  >
                    <span className="system-icon"><Icon name={row.system.code} /></span>
                    <span className="system-name">{localName(row.system, lang)}</span>
                    <TrafficLight level={row.level} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <ModelStage selectedSystem={selected?.system.code ?? null} levels={levels} onSelectSystem={setSelectedCode} />

        {selected && (
          <section className="clinical-card glass" aria-labelledby="clinical-title">
            <div className="clinical-top">
              <span className="card-title">{t('home.clinicalTitle')}</span>
              <TrafficLight level={selected.level} />
            </div>
            <h2 id="clinical-title" className="clinical-name">{localName(selected.system, lang)}</h2>
            <dl className="clinical-facts">
              <div>
                <dt>{t('home.hazard')}</dt>
                <dd>{t(`home.systems.${selected.system.code}.hazard`)}</dd>
              </div>
              <div>
                <dt>{t('home.risk')}</dt>
                <dd>{t(`home.systems.${selected.system.code}.risk`)}</dd>
              </div>
            </dl>
            <ul className="clinical-indicators">
              {selected.items.map(({ indicator, entry }) => (
                <li key={indicator.id}>
                  <span>{localName(indicator, lang)}</span>
                  <span className="clinical-value">
                    {entry ? `${numberFormat.format(entry.latest.value)} ${entry.latest.unit}` : '—'}
                  </span>
                  <TrafficLight level={entry?.level ?? 'NO_DATA'} />
                </li>
              ))}
            </ul>
            <Link to={`/system/${selected.system.code}`} className="button-link is-primary clinical-cta">
              {t('home.viewHistory')}
              <Icon name="chevronRight" size={20} />
            </Link>
          </section>
        )}
      </div>
    </section>
  )
}
