import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import catalogs from '../data/seed/catalogs.json'
import usersSeed from '../data/seed/users.json'
import * as simulator from '../data/simulator.js'
import { db } from '../db/db.js'
import { recommendationText, requestNotificationPermission } from '../rules/engine.js'

// The simulator always feeds the demo astronaut from the seed.
const ASTRONAUT_ROLE_ID = catalogs.roles.find((role) => role.code === 'astronaut')?.id
const DEMO_ASTRONAUT_ID =
  usersSeed.users.find((user) => user.roleId === ASTRONAUT_ROLE_ID)?.id ??
  'a0000000-0000-4000-8000-000000000002'

// alertLevels.code -> CSS color variable. The level name is always shown as text too.
const LEVEL_COLORS = {
  normal: 'var(--ok)',
  caution: 'var(--warn)',
  critical: 'var(--danger)',
}

/** Latest alerts, joined with their reading, level and recommendation. */
async function loadLatestAlerts(limit) {
  const alerts = await db.alerts.orderBy('generatedAt').reverse().limit(limit).toArray()
  const levels = await db.alertLevels.toArray()
  return Promise.all(
    alerts.map(async (alert) => ({
      ...alert,
      reading: await db.readings.get(alert.readingId),
      level: levels.find((level) => level.id === alert.alertLevelId),
      recommendation: alert.recommendationId
        ? await db.recommendations.get(alert.recommendationId)
        : undefined,
    })),
  )
}

export default function Sensors() {
  const { t, i18n } = useTranslation()
  const spanish = i18n.resolvedLanguage === 'es'

  // The simulator lives outside React and keeps running across page changes,
  // so the initial state is read from it.
  const [running, setRunning] = useState(() => simulator.isRunning())
  const [scenario, setScenario] = useState(() => simulator.getScenario())

  const readings = useLiveQuery(
    () => db.readings.orderBy('measuredAt').reverse().limit(10).toArray(),
    [],
    [],
  )
  const alerts = useLiveQuery(() => loadLatestAlerts(5), [], [])
  const indicators = useLiveQuery(() => db.indicators.toArray(), [], [])

  const indicatorName = (code) => {
    const indicator = indicators.find((row) => row.code === code)
    return (spanish ? indicator?.nameEs : indicator?.nameEn) ?? code
  }
  const formatTime = (iso) => new Date(iso).toLocaleTimeString(i18n.resolvedLanguage)

  function toggleSimulator() {
    if (running) {
      simulator.stop()
    } else {
      // Ask for notification permission here because it needs a user gesture.
      requestNotificationPermission()
      simulator.start(DEMO_ASTRONAUT_ID)
    }
    setRunning(simulator.isRunning())
  }

  function changeScenario(event) {
    simulator.setScenario(event.target.value)
    setScenario(simulator.getScenario())
  }

  return (
    <section className="page">
      <h1>{t('pages.sensors')}</h1>

      <div className="sim-panel">
        <p className="sim-badge">{t('sensors.simulatedData')}</p>

        <button
          type="button"
          className={`sim-toggle${running ? ' is-running' : ''}`}
          aria-pressed={running}
          onClick={toggleSimulator}
        >
          {running ? t('sensors.stop') : t('sensors.start')}
        </button>

        <label className="sim-field">
          <span>{t('sensors.scenario')}</span>
          <select value={scenario} onChange={changeScenario}>
            {simulator.SCENARIOS.map((name) => (
              <option key={name} value={name}>
                {t(`sensors.scenarios.${name}`, name)}
              </option>
            ))}
          </select>
        </label>

        <p className="muted" role="status">
          {running ? t('sensors.statusRunning') : t('sensors.statusStopped')}
        </p>
      </div>

      <h2>{t('sensors.latestReadings')}</h2>
      {readings.length === 0 ? (
        <p className="muted">{t('sensors.noReadings')}</p>
      ) : (
        <ul className="sim-list">
          {readings.map((reading) => (
            <li key={reading.id} className="sim-row">
              <span className="sim-row-name">{indicatorName(reading.indicatorCode)}</span>
              <span className="sim-row-value">
                {reading.value} {reading.unit}
              </span>
              <time className="muted" dateTime={reading.measuredAt}>
                {formatTime(reading.measuredAt)}
              </time>
            </li>
          ))}
        </ul>
      )}

      <h2>{t('sensors.latestAlerts')}</h2>
      {alerts.length === 0 ? (
        <p className="muted">{t('sensors.noAlerts')}</p>
      ) : (
        <ul className="sim-list">
          {alerts.map((alert) => {
            const levelCode = (alert.level?.code ?? 'caution').toLowerCase()
            const advice = recommendationText(
              alert.recommendation,
              alert.reading,
              i18n.resolvedLanguage,
            )
            return (
              <li
                key={alert.id}
                className="sim-row sim-alert"
                style={{ '--level-color': LEVEL_COLORS[levelCode] ?? 'var(--warn)' }}
              >
                <span className="sim-level">
                  {t(`levels.${levelCode}`, levelCode)}
                  {alert.direction && (
                    <span title={t(`directions.${alert.direction}`, alert.direction)}>
                      {' '}
                      <span aria-hidden="true">{alert.direction === 'high' ? '↑' : '↓'}</span>
                      <span className="visually-hidden">
                        {t(`directions.${alert.direction}`, alert.direction)}
                      </span>
                    </span>
                  )}
                </span>
                <span className="sim-row-name">{indicatorName(alert.indicatorCode)}</span>
                {alert.reading && (
                  <span className="sim-row-value">
                    {alert.reading.value} {alert.reading.unit}
                  </span>
                )}
                <time className="muted" dateTime={alert.generatedAt}>
                  {formatTime(alert.generatedAt)}
                </time>
                {advice && <span className="sim-advice">{advice}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
