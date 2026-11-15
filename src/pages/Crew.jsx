import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import TrafficLight from '../components/TrafficLight.jsx'
import { addDemoReadings, ensureDemoCrew } from '../data/demoCrew.js'
import { useSession } from '../auth/session.js'
import { loadCrewData } from './crew/crewData.js'
import { clearCurrentMission, useCurrentMission } from './missions/missionStore.js'
import { LEVEL } from './crew/crewStatus.js'
import { DISPLAY_CODE } from './crew/display.js'
import CrewAlerts from './crew/CrewAlerts.jsx'
import LiveDemoToggle from './crew/LiveDemoToggle.jsx'
import { useCanManageCrew } from './crew/useCrewAccess.js'
import { useLiveDemo } from './crew/useLiveDemo.js'
import './Crew.css'

const SUMMARY_LEVELS = [LEVEL.CRITICAL, LEVEL.WARNING, LEVEL.NORMAL]

export default function Crew() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const userId = useSession()?.userId
  const canManage = useCanManageCrew()
  const currentMissionId = useCurrentMission(userId)
  const data = useLiveQuery(
    () => (userId ? loadCrewData(userId, currentMissionId, canManage) : null),
    [userId, currentMissionId, canManage],
  )
  const { isLive, hasError: liveFailed } = useLiveDemo()
  const [errorKey, setErrorKey] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [levelFilter, setLevelFilter] = useState(null)

  useEffect(() => {
    ensureDemoCrew().catch((error) => {
      console.error('[crew] Could not prepare the demo crew', error)
      setErrorKey('crew.loadError')
    })
  }, [])

  const shownErrorKey = errorKey ?? (liveFailed ? 'crew.simulateError' : null)

  const localName = (row) => (lang === 'en' ? row.nameEn : row.nameEs) ?? row.name ?? row.code
  const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatReading = (reading) =>
    `${DISPLAY_CODE[reading.indicatorCode] ?? reading.indicatorCode} ${numberFormat.format(reading.value)} ${reading.unit}`

  async function handleSimulateOnce() {
    setIsSimulating(true)
    try {
      await addDemoReadings()
      setErrorKey(null)
    } catch (error) {
      console.error('[crew] Could not add simulated readings', error)
      setErrorKey('crew.simulateError')
    } finally {
      setIsSimulating(false)
    }
  }

  function toggleLevelFilter(level) {
    setLevelFilter((current) => (current === level ? null : level))
  }

  if (!data) {
    return (
      <section className="page">
        <h1>{t('pages.crew')}</h1>
        <p className="muted">{t('crew.loading')}</p>
      </section>
    )
  }

  const { mission, missionCount, bodySystems, astronauts, rows } = data
  const hasSimulatedData = rows.some((row) => row.hasSimulatedData)
  const countByLevel = Object.fromEntries(
    SUMMARY_LEVELS.map((level) => [level, rows.filter((row) => row.overall === level).length]),
  )
  const visibleRows = levelFilter ? rows.filter((row) => row.overall === levelFilter) : rows

  return (
    <section className="page crew-page">
      <header className="crew-header">
        <div>
          <h1>{t('pages.crew')}</h1>
          <p className="muted">
            {t('crew.subtitle', { count: rows.length, mission: mission ? localName(mission) : t('crew.allMissions') })}
          </p>
          {canManage && currentMissionId && (
            <button type="button" className="mission-switch" onClick={() => { clearCurrentMission(); setLevelFilter(null) }}>
              {t('crew.allMissions')}
            </button>
          )}
          {canManage && missionCount > 1 && (
            <Link to="/missions" className="mission-switch">
              {t('missions.change')}
            </Link>
          )}
        </div>
        {canManage && (
          <div className="crew-actions">
            <LiveDemoToggle />
            <button type="button" onClick={handleSimulateOnce} disabled={isSimulating || isLive}>
              {isSimulating ? t('crew.simulating') : t('crew.simulate')}
            </button>
          </div>
        )}
      </header>

      {!canManage && <p className="crew-readonly-note">{t('crew.officerView')}</p>}

      {shownErrorKey && (
        <p className="crew-error" role="alert">
          {t(shownErrorKey)}
        </p>
      )}

      {hasSimulatedData && <p className="crew-simulated-note">{t('crew.simulatedNote')}</p>}

      {rows.length === 0 ? (
        <p className="muted">{t('crew.empty')}</p>
      ) : (
        <>
          <div className="crew-filters" role="group" aria-label={t('crew.filterLabel')}>
            {SUMMARY_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                className="crew-filter"
                aria-pressed={levelFilter === level}
                onClick={() => toggleLevelFilter(level)}
              >
                <span className="crew-filter-count">{countByLevel[level]}</span>
                <TrafficLight level={level} />
              </button>
            ))}
            {levelFilter && (
              <button type="button" className="crew-filter-clear" onClick={() => setLevelFilter(null)}>
                {t('crew.showAll')}
              </button>
            )}
          </div>

          <p className="crew-visually-hidden" role="status" aria-live="polite">
            {t('crew.visibleCount', { count: visibleRows.length })}
          </p>

          {visibleRows.length === 0 ? (
            <p className="crew-empty-filter muted">
              {t('crew.emptyFilter', { level: t(`trafficLight.${levelFilter}`) })}
            </p>
          ) : (
            <div className="crew-table-wrap">
              <table className="crew-table">
                <caption className="crew-visually-hidden">{t('crew.tableCaption')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('crew.member')}</th>
                    <th scope="col">{t('crew.overall')}</th>
                    {bodySystems.map((system) => (
                      <th key={system.id} scope="col">
                        {localName(system)}
                      </th>
                    ))}
                    <th scope="col">{t('crew.lastReading')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.user.id} className={`crew-row is-${row.overall.toLowerCase().replace('_', '-')}`}>
                      <th scope="row">
                        <Link to={`/crew/${row.user.id}`} className="crew-member-link">
                          {row.user.name}
                        </Link>
                        {row.user.isMedicalOfficer && (
                          <span className="crew-officer-badge">{t('crew.medicalOfficer')}</span>
                        )}
                      </th>
                      <td data-label={t('crew.overall')}>
                        <span className="crew-cell">
                          <TrafficLight level={row.overall} />
                        </span>
                      </td>
                      {bodySystems.map((system) => {
                        const status = row.systems[system.id]
                        return (
                          <td key={system.id} data-label={localName(system)}>
                            <span className="crew-cell">
                              <TrafficLight level={status.level} />
                              {status.reading && (
                                <span className="crew-cell-value">{formatReading(status.reading)}</span>
                              )}
                            </span>
                          </td>
                        )
                      })}
                      <td data-label={t('crew.lastReading')}>
                        <span className="crew-cell crew-time">
                          {row.lastMeasuredAt ? timeFormat.format(new Date(row.lastMeasuredAt)) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <CrewAlerts users={astronauts} canSendNotes={canManage} />
        </>
      )}
    </section>
  )
}
