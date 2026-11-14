import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Activity,
  Heart,
  Wind,
  Thermometer,
  Radio,
  Gauge,
  Play,
  RotateCw,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'

import { useSession } from '../auth/session.js'
import TrafficLight from '../components/TrafficLight.jsx'
import { isRunning, start as startSimulator, stop as stopSimulator } from '../data/simulator.js'
import { db } from '../db/db.js'
import { classifyValue, effectiveThreshold, LEVEL } from './crew/crewStatus.js'
import './Vitals.css'

const LIVE_INDICATORS_CONFIG = [
  { code: 'HR', icon: Heart, strokeColor: '#22d3ee', defaultMin: 45, defaultMax: 130 },
  { code: 'SPO2', icon: Wind, strokeColor: '#38bdf8', defaultMin: 90, defaultMax: 100 },
  { code: 'SBP', icon: Gauge, strokeColor: '#3b82f6', defaultMin: 80, defaultMax: 160 },
  { code: 'DBP', icon: Gauge, strokeColor: '#818cf8', defaultMin: 50, defaultMax: 105 },
  { code: 'RR', icon: Wind, strokeColor: '#a855f7', defaultMin: 8, defaultMax: 28 },
  { code: 'TSKIN', icon: Thermometer, strokeColor: '#f97316', defaultMin: 34.5, defaultMax: 38.5 },
  { code: 'RAD_D', icon: Radio, strokeColor: '#eab308', defaultMin: 0, defaultMax: 2.0 },
]

export default function Vitals() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'
  const session = useSession()
  const [isSimRunning, setIsSimRunning] = useState(isRunning())

  const vitalsData = useLiveQuery(async () => {
    let userId = session?.userId
    if (!userId) {
      const demoAstronaut = await db.users.where('roleId').equals('00000000-0000-4000-8000-000000000101').first()
      userId = demoAstronaut?.id
    }
    if (!userId) return null

    const [user, indicators, thresholds, readings] = await Promise.all([
      db.users.get(userId),
      db.indicators.toArray(),
      db.thresholds.toArray(),
      db.readings.where('userId').equals(userId).toArray(),
    ])

    readings.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))

    const readingsByCode = new Map()
    for (const r of readings) {
      if (!readingsByCode.has(r.indicatorCode)) readingsByCode.set(r.indicatorCode, [])
      readingsByCode.get(r.indicatorCode).push(r)
    }

    const indMap = new Map(indicators.map((i) => [i.code, i]))

    const cards = LIVE_INDICATORS_CONFIG.map((cfg) => {
      const ind = indMap.get(cfg.code) || { code: cfg.code, nameEs: cfg.code, nameEn: cfg.code }
      const series = readingsByCode.get(cfg.code) || []
      const latest = series.at(-1) || null
      const points = series.slice(-25).map((r) => ({
        time: new Date(r.measuredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        value: Number(r.value.toFixed(1)),
      }))

      let level = LEVEL.NORMAL
      let thresholdObj = null

      if (latest && ind.id) {
        const { threshold } = effectiveThreshold(thresholds, userId, ind, series, latest)
        thresholdObj = threshold
        level = classifyValue(latest.value, threshold) ?? LEVEL.NORMAL
      }

      return {
        ...cfg,
        indicator: ind,
        latest,
        points,
        level,
        threshold: thresholdObj,
        unit: latest?.unit || (cfg.code === 'HR' ? 'bpm' : cfg.code === 'SPO2' ? '%' : cfg.code === 'TSKIN' ? '°C' : 'mmHg'),
      }
    })

    const hasAnyReadings = readings.length > 0

    return { user, cards, hasAnyReadings }
  }, [session?.userId])

  const handleToggleSimulation = () => {
    if (isRunning()) {
      stopSimulator()
      setIsSimRunning(false)
    } else {
      let targetUserId = session?.userId
      startSimulator(targetUserId)
      setIsSimRunning(true)
    }
  }

  return (
    <section className="vitals-page">
      {/* Header Banner */}
      <header className="vitals-header">
        <div className="vitals-header-titles">
          <span className="vitals-header-sub">NASA Space Biomedical Telemetry · Live Feed</span>
          <h1>{isEs ? 'Signos Vitales y Telemetría en Vivo' : 'Live Vital Signs & Telemetry'}</h1>
        </div>
        <div className="vitals-pulse-indicator">
          <div className="pulse-dot" />
          <span>{isEs ? 'Telemetría Activa (1 Hz)' : 'Active Telemetry (1 Hz)'}</span>
        </div>
      </header>

      {/* Simulator CTA notice if no data or stopped */}
      {!vitalsData?.hasAnyReadings && (
        <aside className="vitals-sim-notice">
          <div className="sim-notice-text">
            <strong>{isEs ? 'Sin datos de telemetría recientes' : 'No recent telemetry data'}: </strong>
            <span>
              {isEs
                ? 'Activa el simulador integrado para generar flujo en tiempo real de signos vitales.'
                : 'Start the built-in simulator to generate real-time astronaut vital signs.'}
            </span>
          </div>
          <button type="button" onClick={handleToggleSimulation} className="sim-start-btn">
            <Play size={16} />
            <span>{isEs ? 'Iniciar Simulador' : 'Start Simulator'}</span>
          </button>
        </aside>
      )}

      {/* Vitals Grid with Recharts */}
      <div className="vitals-grid">
        {vitalsData?.cards?.map((card) => {
          const IconComp = card.icon
          const indName = isEs ? card.indicator.nameEs : card.indicator.nameEn
          const currentVal = card.latest ? card.latest.value.toFixed(1) : '--'

          return (
            <article key={card.code} className="vital-chart-card">
              <div className="vital-chart-card-header">
                <div className="vital-chart-title-area">
                  <div className="vital-chart-icon">
                    <IconComp size={20} />
                  </div>
                  <div>
                    <h3 className="vital-chart-heading">{indName}</h3>
                    <p className="vital-chart-sub">{card.code}</p>
                  </div>
                </div>
                <TrafficLight level={card.level} />
              </div>

              <div className="vital-chart-current">
                <span className="vital-current-val">{currentVal}</span>
                <span className="vital-current-unit">{card.unit}</span>
              </div>

              <div className="vital-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={card.points.length > 0 ? card.points : [{ time: '0', value: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      interval="preserveEnd"
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      domain={['auto', 'auto']}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111a2e',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#e2e8f0',
                      }}
                    />
                    {card.threshold?.minNormal != null && (
                      <ReferenceLine y={card.threshold.minNormal} stroke="#f59e0b" strokeDasharray="3 3" />
                    )}
                    {card.threshold?.maxNormal != null && (
                      <ReferenceLine y={card.threshold.maxNormal} stroke="#f59e0b" strokeDasharray="3 3" />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={card.strokeColor}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <footer className="vital-thresholds-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: card.strokeColor }} />
                  <span>{isEs ? 'Telemetría' : 'Telemetry'}</span>
                </div>
                {card.threshold?.minNormal != null && (
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />
                    <span>{`Min: ${card.threshold.minNormal}`}</span>
                  </div>
                )}
                {card.threshold?.maxNormal != null && (
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />
                    <span>{`Max: ${card.threshold.maxNormal}`}</span>
                  </div>
                )}
              </footer>
            </article>
          )
        })}
      </div>
    </section>
  )
}
