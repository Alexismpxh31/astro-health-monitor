import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import TrafficLight from '../components/TrafficLight.jsx'
import { addDemoReadings, ensureDemoCrew } from '../data/demoCrew.js'
import { db } from '../db/db.js'
import { buildCrewStatus, hasRole, LEVEL } from './crew/crewStatus.js'
import { DISPLAY_CODE } from './crew/display.js'
import LiveDemoToggle from './crew/LiveDemoToggle.jsx'
import { useLiveDemo } from './crew/useLiveDemo.js'
import './Crew.css'

const ASTRONAUT_ROLE_CODE = 'astronaut'
const SUMMARY_LEVELS = [LEVEL.CRITICAL, LEVEL.WARNING, LEVEL.NORMAL]

// Reads everything from IndexedDB (offline-first); re-runs whenever those tables change.
// TODO(perf): this scans every reading of the crew. If it gets slow, add a
// [userId+indicatorCode+measuredAt] index in a new db.version() and read only the latest.
async function loadCrewData() {
  const [roles, crew, users, missions, bodySystems, indicators, thresholds] = await Promise.all([
    db.roles.toArray(),
    db.crew.toArray(),
    db.users.toArray(),
    db.missions.toArray(),
    db.bodySystems.toArray(),
    db.indicators.toArray(),
    db.thresholds.toArray(),
  ])

  const crewUserIds = new Set(crew.map((member) => member.userId))
  const astronauts = users.filter((user) => crewUserIds.has(user.id) && hasRole(roles, user, ASTRONAUT_ROLE_CODE))
  const readings = astronauts.length
    ? await db.readings.where('userId').anyOf(astronauts.map((user) => user.id)).toArray()
    : []

  // Only systems that have at least one indicator get a column.
  const systemsWithIndicators = bodySystems.filter((system) =>
    indicators.some((indicator) => indicator.bodySystemId === system.id),
  )

  return {
    mission: missions[0] ?? null,
    bodySystems: systemsWithIndicators,
    rows: buildCrewStatus({ astronauts, bodySystems: systemsWithIndicators, indicators, thresholds, readings }),
  }
}

export default function Crew() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const data = useLiveQuery(loadCrewData)
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

  const { mission, bodySystems, rows } = data
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
            {t('crew.subtitle', { count: rows.length, mission: mission?.name ?? '' })}
          </p>
        </div>
        <div className="crew-actions">
          <LiveDemoToggle />
          <button type="button" onClick={handleSimulateOnce} disabled={isSimulating || isLive}>
            {isSimulating ? t('crew.simulating') : t('crew.simulate')}
          </button>
        </div>
      </header>

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
        </>
      )}
    </section>
  )
}
