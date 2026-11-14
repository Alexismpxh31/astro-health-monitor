import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { Heart, Wind, Thermometer, Radio, Gauge, Play, Square } from 'lucide-react'
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
import { defaultUserId } from '../data/demoUser.js'
import { isRunning, start as startSimulator, stop as stopSimulator } from '../data/simulator.js'
import { db } from '../db/db.js'
import { useTheme } from '../theme/theme.js'
import { classifyValue, effectiveThreshold, LEVEL } from './crew/crewStatus.js'
import { CHART_THEMES, localName } from './crew/display.js'
import './Vitals.css'

// Live indicators shown on this screen, in display order.
const LIVE_INDICATORS_CONFIG = [
  { code: 'HR', icon: Heart },
  { code: 'SPO2', icon: Wind },
  { code: 'SBP', icon: Gauge },
  { code: 'DBP', icon: Gauge },
  { code: 'RR', icon: Wind },
  { code: 'TSKIN', icon: Thermometer },
  { code: 'RAD_D', icon: Radio },
]

export default function Vitals() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const chart = CHART_THEMES[useTheme()]
  const session = useSession()
  const [isSimRunning, setIsSimRunning] = useState(isRunning())

  const vitalsData = useLiveQuery(async () => {
    const userId = defaultUserId()
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
      const targetUserId = defaultUserId()
      startSimulator(targetUserId)
      setIsSimRunning(true)
    }
  }

  const tooltipStyle = {
    backgroundColor: chart.tooltipBg,
    border: `1px solid ${chart.grid}`,
    borderRadius: '8px',
    fontSize: '12px',
    color: chart.text,
  }

  return (
    <section className="vitals-page">
      <header className="vitals-header">
        <div className="vitals-header-titles">
          <span className="vitals-header-sub">{t('astronaut.vitalsEyebrow')}</span>
          <h1>{t('astronaut.vitalsTitle')}</h1>
        </div>
        <div className="vitals-header-actions">
          <button
            type="button"
            className={`vitals-sim-toggle${isSimRunning ? ' is-running' : ''}`}
            onClick={handleToggleSimulation}
          >
            {isSimRunning ? <Square size={13} /> : <Play size={13} />}
            <span>{isSimRunning ? t('astronaut.pauseStream') : t('astronaut.resumeStream')}</span>
          </button>
          {isSimRunning && (
            <div className="vitals-pulse-indicator">
              <div className="pulse-dot" />
              <span>{t('astronaut.livePulse')}</span>
            </div>
          )}
        </div>
      </header>

      {/* Simulator notice when there is no data yet */}
      {!vitalsData?.hasAnyReadings && (
        <aside className="vitals-sim-notice">
          <div className="sim-notice-text">
            <strong>{t('astronaut.noDataTitle')}</strong> <span>{t('astronaut.noDataText')}</span>
          </div>
          <button type="button" onClick={handleToggleSimulation} className="sim-start-btn">
            <Play size={16} />
            <span>{t('astronaut.startSimulator')}</span>
          </button>
        </aside>
      )}

      <div className="vitals-grid">
        {vitalsData?.cards?.map((card) => {
          const IconComp = card.icon
          const currentVal = card.latest ? card.latest.value.toFixed(1) : '--'

          return (
            <article key={card.code} className="vital-chart-card">
              <div className="vital-chart-card-header">
                <div className="vital-chart-title-area">
                  <div className="vital-chart-icon">
                    <IconComp size={20} />
                  </div>
                  <div>
                    <h3 className="vital-chart-heading">{localName(card.indicator, lang)}</h3>
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
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis dataKey="time" stroke={chart.axis} fontSize={10} tickLine={false} interval="preserveEnd" />
                    <YAxis stroke={chart.axis} fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {card.threshold?.minNormal != null && (
                      <ReferenceLine y={card.threshold.minNormal} stroke={chart.warn} strokeDasharray="3 3" />
                    )}
                    {card.threshold?.maxNormal != null && (
                      <ReferenceLine y={card.threshold.maxNormal} stroke={chart.warn} strokeDasharray="3 3" />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chart.line}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <footer className="vital-thresholds-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: chart.line }} />
                  <span>{t('astronaut.telemetry')}</span>
                </div>
                {card.threshold?.minNormal != null && (
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: chart.warn }} />
                    <span>{`${t('astronaut.min')}: ${card.threshold.minNormal}`}</span>
                  </div>
                )}
                {card.threshold?.maxNormal != null && (
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: chart.warn }} />
                    <span>{`${t('astronaut.max')}: ${card.threshold.maxNormal}`}</span>
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
