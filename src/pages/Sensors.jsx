import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import * as heartRate from '../bluetooth/heartRate.js'
import * as simulator from '../data/simulator.js'
import { db } from '../db/db.js'
import { recommendationText, requestNotificationPermission } from '../rules/engine.js'
import { isSecureContext } from '../utils/secureContext.js'

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

  // BLE heart rate sensor (state lives in src/bluetooth/heartRate.js).
  const ble = heartRate.useHeartRate()
  const [bleErrorCode, setBleErrorCode] = useState(null)
  const bleBusy = ble.status === 'connecting' || ble.status === 'reconnecting'
  const bleActive = ble.status !== 'disconnected'
  // Why the sensor cannot be used here, if so: not https, or a browser without Web Bluetooth.
  const bleBlockedCode = !isSecureContext() ? 'insecure' : !heartRate.isSupported() ? 'unsupported' : null
  const bleMessageCode = bleBlockedCode ?? bleErrorCode ?? ble.error
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
      // Simulated and real readings never run at the same time.
      heartRate.disconnect()
      // Ask for notification permission here because it needs a user gesture.
      requestNotificationPermission()
      // No user id: the simulator feeds the logged-in user or the demo astronaut.
      simulator.start()
    }
    setRunning(simulator.isRunning())
  }

  async function toggleHeartRate() {
    setBleErrorCode(null)
    if (bleActive) {
      heartRate.disconnect()
      return
    }
    // Ask for notification permission here because it needs a user gesture.
    requestNotificationPermission()
    try {
      const connecting = heartRate.connect() // stops the simulator
      setRunning(simulator.isRunning())
      await connecting
    } catch (error) {
      // Closing the device picker is not an error worth showing.
      if (error?.code !== 'cancelled') setBleErrorCode(error?.code ?? 'failed')
    }
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

      <div className="sim-panel ble-panel">
        <p className="ble-badge">{t('sensors.ble.title')}</p>

        <button
          type="button"
          className={`sim-toggle${bleActive ? ' is-running' : ''}`}
          aria-pressed={bleActive}
          disabled={Boolean(bleBlockedCode) || bleBusy}
          onClick={toggleHeartRate}
        >
          {bleActive ? t('sensors.ble.disconnect') : t('sensors.ble.connect')}
        </button>

        <p className={`ble-status is-${ble.status}`} role="status">
          <span aria-hidden="true">{ble.status === 'connected' ? '●' : '○'}</span>{' '}
          {t(`sensors.ble.status.${ble.status}`, { name: ble.deviceName || t('sensors.ble.unnamedDevice') })}
          {ble.status === 'connected' && ble.lastBpm != null && (
            <span className="sim-row-value">
              {' · '}
              {ble.lastBpm} bpm
            </span>
          )}
        </p>

        {bleMessageCode && (
          <p className="ble-error" role="alert">
            <span aria-hidden="true">⚠</span> {t(`sensors.ble.errors.${bleMessageCode}`)}
          </p>
        )}
        <p className="muted">{t('sensors.ble.exclusiveNote')}</p>
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
