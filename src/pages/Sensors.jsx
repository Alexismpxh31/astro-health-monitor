// Sensors page (merged): Walter's biomedical sensor hub + sync panel on top,
// and the simulator controls, live readings and alerts from main below.

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Settings, Wifi, Battery, RefreshCw, CheckCircle, Activity, Cpu } from 'lucide-react'
import catalogs from '../data/seed/catalogs.json'
import usersSeed from '../data/seed/users.json'
import * as simulator from '../data/simulator.js'
import * as queue from '../sync/queue.js'
import { supabase } from '../sync/supabaseClient.js'
import { db } from '../db/db.js'
import { requestNotificationPermission } from '../rules/engine.js'

// The simulator always feeds the demo astronaut from the seed.
const ASTRONAUT_ROLE_ID = catalogs.roles.find((role) => role.code === 'ASTRONAUT')?.id
const DEMO_ASTRONAUT_ID =
  usersSeed.users.find((user) => user.roleId === ASTRONAUT_ROLE_ID)?.id ??
  '00000000-0000-4000-8000-000000000901'

// alertLevels.code -> CSS color variable. The level name is always shown as text too.
const LEVEL_COLORS = {
  NORMAL: 'var(--ok)',
  WARNING: 'var(--warn)',
  CAUTION: 'var(--warn)',
  CRITICAL: 'var(--danger)',
}

// Reference devices (based on real ISS hardware). Values are simulated for the demo.
const SENSORS = [
  { id: 'astroskin', name: 'Astroskin / Bio-Monitor (CSA)', type: 'Cardio-respiratorio', battery: 92, rate: '2 s', signal: '100%' },
  { id: 'ecg', name: 'ECG de 3 derivaciones', type: 'Electrocardiograma', battery: 88, rate: '2 s', signal: '98%' },
  { id: 'dosimeter', name: 'Dosímetro activo', type: 'Radiación (dosis diaria y acumulada)', battery: 95, rate: '2 s', signal: '100%' },
  { id: 'pvt', name: 'Prueba de vigilancia psicomotora (PVT)', type: 'Neurocognitivo y fatiga', battery: 84, rate: 'Bajo demanda', signal: '95%' },
]

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

/** Pending sync count, tolerant to queue.js not exposing getPendingCount yet. */
async function readPendingCount() {
  if (typeof queue.getPendingCount === 'function') return queue.getPendingCount()
  return db.readings.where('syncStatus').equals('pending').count()
}

export default function Sensors() {
  const { t, i18n } = useTranslation()
  const spanish = i18n.resolvedLanguage === 'es'

  // ---------- Sync panel (Walter) ----------
  const [syncCount, setSyncCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    readPendingCount().then(setSyncCount).catch(() => {})
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  async function handleManualSync() {
    setIsSyncing(true)
    setSyncResult(null)
    try {
      if (typeof queue.syncPending !== 'function') {
        setSyncResult({ ok: false, text: 'La sincronización manual aún no está disponible.' })
        return
      }
      const res = await queue.syncPending()
      setSyncResult({ ok: true, text: `Sincronización completada: ${res?.pushed ?? 0} registros enviados.` })
    } catch {
      setSyncResult({ ok: false, text: 'Error al sincronizar con Supabase.' })
    } finally {
      setIsSyncing(false)
      readPendingCount().then(setSyncCount).catch(() => {})
    }
  }

  // ---------- Simulator (main) ----------
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
      requestNotificationPermission()
      simulator.start(DEMO_ASTRONAUT_ID)
    }
    setRunning(simulator.isRunning())
  }

  function changeScenario(event) {
    simulator.setScenario(event.target.value)
    setScenario(simulator.getScenario())
  }

  const cardClass =
    'p-5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-2'

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ---------- Header + manual sync (Walter) ---------- */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-blue-600 font-bold uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            CONFIGURACIÓN DEL SISTEMA · TELEMETRÍA & BASE DE DATOS
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0E1B3E] mt-1 tracking-tight">
            {t('pages.sensors')}
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Gestión de telemetría, periféricos biomédicos y enlace con Control de Misión.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing || !online}
          className="min-h-[48px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : online ? 'Sincronizar ahora' : 'Sin señal'}
        </button>
      </div>

      {syncResult && (
        <div
          role="status"
          className={`p-4 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            syncResult.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>{syncResult.text}</span>
        </div>
      )}

      {/* ---------- Cloud & local DB status (Walter) ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={cardClass}>
          <span className="text-xs font-mono text-slate-500 font-bold uppercase">CONTROL DE MISIÓN (SUPABASE)</span>
          <div className="text-xl font-extrabold text-[#0E1B3E]">
            {!supabase ? 'Sin configurar' : online ? 'En línea' : 'Sin señal'}
          </div>
          <p className="text-xs text-slate-500">Base PostgreSQL con seguridad por filas (RLS).</p>
        </div>

        <div className={cardClass}>
          <span className="text-xs font-mono text-slate-500 font-bold uppercase">BASE LOCAL (PWA)</span>
          <div className="text-xl font-extrabold text-[#0E1B3E]">IndexedDB activa</div>
          <p className="text-xs text-slate-500">Funciona sin conexión; los datos se guardan primero en el dispositivo.</p>
        </div>

        <div className={cardClass}>
          <span className="text-xs font-mono text-slate-500 font-bold uppercase">COLA DE SINCRONIZACIÓN</span>
          <div className="text-xl font-extrabold text-[#0E1B3E] tabular-nums">{syncCount} registros</div>
          <p className="text-xs text-slate-500">Lecturas pendientes de envío a la Tierra.</p>
        </div>
      </div>

      {/* ---------- Simulator (main) ---------- */}
      <section className="page">
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
              const levelCode = (alert.level?.code ?? 'WARNING').toUpperCase()
              const advice = spanish ? alert.recommendation?.textEs : alert.recommendation?.textEn
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

      {/* ---------- Reference devices (Walter) ---------- */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-4">
        <h3 className="text-sm font-mono tracking-wider uppercase text-[#0E1B3E] font-bold flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          Dispositivos biomédicos (simulados)
        </h3>

        <div className="space-y-3">
          {SENSORS.map((sensor) => (
            <div
              key={sensor.id}
              className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Activity size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0E1B3E]">{sensor.name}</h4>
                  <span className="text-xs text-slate-500 font-mono">{sensor.type}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Wifi size={14} className="text-emerald-500" />
                  <span>Enlace: {sensor.signal}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Battery size={14} className="text-emerald-600" />
                  <span>{sensor.battery}%</span>
                </div>
                <div className="text-slate-600">
                  Tasa: <strong className="text-[#0E1B3E]">{sensor.rate}</strong>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {running ? '● Simulado · activo' : '○ Simulado · detenido'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}