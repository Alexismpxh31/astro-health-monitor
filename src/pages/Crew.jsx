import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import TrafficLight from '../components/TrafficLight.jsx'
import { addDemoReadings, ensureDemoCrew } from '../data/demoCrew.js'
import { db } from '../db/db.js'
import { buildCrewStatus, LEVEL } from './crew/crewStatus.js'
import './Crew.css'

const ASTRONAUT_ROLE_CODE = 'ASTRONAUT'
const SUMMARY_LEVELS = [LEVEL.CRITICAL, LEVEL.WARNING, LEVEL.NORMAL]
const DISPLAY_CODE = { SPO2: 'SpO₂', TSKIN: 'T piel', RAD_DOSE: 'Dosis' }

// Reads everything from IndexedDB (offline-first); re-runs whenever those tables change.
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

  const astronautRoleId = roles.find((role) => role.code === ASTRONAUT_ROLE_CODE)?.id
  const crewUserIds = new Set(crew.map((member) => member.userId))
  const astronauts = users.filter((user) => crewUserIds.has(user.id) && user.roleId === astronautRoleId)
  const readings = astronauts.length
    ? await db.readings.where('userId').anyOf(astronauts.map((user) => user.id)).toArray()
    : []

  return {
    mission: missions[0] ?? null,
    bodySystems,
    rows: buildCrewStatus({ astronauts, bodySystems, indicators, thresholds, readings }),
  }
}

export default function Crew() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const data = useLiveQuery(loadCrewData)
  const [errorKey, setErrorKey] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)

  useEffect(() => {
    ensureDemoCrew().catch((error) => {
      console.error('[crew] Could not prepare the demo crew', error)
      setErrorKey('crew.loadError')
    })
  }, [])

  const localName = (row) => (lang === 'en' ? row.nameEn : row.nameEs) ?? row.name ?? row.code
  const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })
  const formatReading = (reading) =>
    `${DISPLAY_CODE[reading.indicatorCode] ?? reading.indicatorCode} ${numberFormat.format(reading.value)} ${reading.unit}`

  async function handleSimulate() {
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

  return (
    <section className="page crew-page">
      <header className="crew-header">
        <div>
          <h1>{t('pages.crew')}</h1>
          <p className="muted">
            {t('crew.subtitle', { count: rows.length, mission: mission?.name ?? '' })}
          </p>
        </div>
        <button type="button" onClick={handleSimulate} disabled={isSimulating}>
          {isSimulating ? t('crew.simulating') : t('crew.simulate')}
        </button>
      </header>

      {errorKey && (
        <p className="crew-error" role="alert">
          {t(errorKey)}
        </p>
      )}

      {hasSimulatedData && <p className="crew-simulated-note">{t('crew.simulatedNote')}</p>}

      {rows.length === 0 ? (
        <p className="muted">{t('crew.empty')}</p>
      ) : (
        <>
          <ul className="crew-summary" aria-label={t('crew.summaryLabel')}>
            {SUMMARY_LEVELS.map((level) => (
              <li key={level}>
                <span className="crew-summary-count">{countByLevel[level]}</span>
                <TrafficLight level={level} />
              </li>
            ))}
          </ul>

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
                {rows.map((row) => (
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
        </>
      )}
    </section>
  )
}
