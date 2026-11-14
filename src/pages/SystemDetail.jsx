import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft } from 'lucide-react'
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
import { db } from '../db/db.js'
import { useTheme } from '../theme/theme.js'
import { classifyValue, effectiveThreshold, LEVEL, severityOf } from './crew/crewStatus.js'
import { CHART_THEMES, localName } from './crew/display.js'
import './SystemDetail.css'

// Detail of one body system for the astronaut: NASA HRP hazard and risk (i18n
// `home.systems.<code>`) plus the trend of each indicator of the system.
// `:id` is the body system code (e.g. "cardiovascular") or its UUID.
export default function SystemDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const chart = CHART_THEMES[useTheme()]
  const session = useSession()

  const detailData = useLiveQuery(async () => {
    const userId = defaultUserId()
    if (!userId) return null

    const [bodySystems, indicators, thresholds, readings] = await Promise.all([
      db.bodySystems.toArray(),
      db.indicators.toArray(),
      db.thresholds.toArray(),
      db.readings.where('userId').equals(userId).toArray(),
    ])

    const currentSystem = bodySystems.find((s) => s.code.toLowerCase() === id?.toLowerCase() || s.id === id)
    if (!currentSystem) return null

    const systemIndicators = indicators.filter((ind) => ind.bodySystemId === currentSystem.id)

    readings.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))

    const readingsByCode = new Map()
    for (const r of readings) {
      if (!readingsByCode.has(r.indicatorCode)) readingsByCode.set(r.indicatorCode, [])
      readingsByCode.get(r.indicatorCode).push(r)
    }

    const cards = systemIndicators.map((ind) => {
      const series = readingsByCode.get(ind.code) || []
      const latest = series.at(-1) || null
      const points = series.slice(-30).map((r) => ({
        time: new Date(r.measuredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        value: Number(r.value.toFixed(1)),
      }))

      let level = LEVEL.NORMAL
      let thresholdObj = null

      if (latest) {
        const { threshold } = effectiveThreshold(thresholds, userId, ind, series, latest)
        thresholdObj = threshold
        level = classifyValue(latest.value, threshold) ?? LEVEL.NORMAL
      }

      return {
        indicator: ind,
        latest,
        points,
        level,
        threshold: thresholdObj,
        unit: latest?.unit || (ind.code === 'HR' ? 'bpm' : ind.code === 'SPO2' ? '%' : ind.code === 'TSKIN' ? '°C' : 'mmHg'),
      }
    })

    cards.sort((a, b) => severityOf(b.level) - severityOf(a.level))
    const overallLevel = cards[0]?.level || LEVEL.NORMAL

    return { currentSystem, cards, overallLevel }
  }, [id, session?.userId])

  if (detailData === undefined) return <p className="muted">{t('crew.loading')}</p>
  if (detailData === null) return <p className="muted">{t('astronaut.systemNotFound')}</p>

  const { currentSystem, cards, overallLevel } = detailData
  const textKey = `home.systems.${currentSystem.code}`
  const tooltipStyle = {
    backgroundColor: chart.tooltipBg,
    border: `1px solid ${chart.grid}`,
    borderRadius: '8px',
    fontSize: '12px',
    color: chart.text,
  }

  return (
    <section className="system-detail-page">
      <header className="system-detail-header">
        <div className="system-detail-nav">
          <Link to="/" className="system-back-btn">
            <ArrowLeft size={16} />
            <span>{t('astronaut.backHome')}</span>
          </Link>
          <TrafficLight level={overallLevel} />
        </div>

        <div className="system-title-row">
          <h1>{localName(currentSystem, lang)}</h1>
        </div>

        {i18n.exists(`${textKey}.hazard`) && (
          <div className="system-clinical-grid">
            <div className="system-hrp-card">
              <strong>{t('astronaut.hrpHazard')}</strong>
              <p>{t(`${textKey}.hazard`)}</p>
            </div>
            <div className="system-hrp-card">
              <strong>{t('astronaut.flightRisk')}</strong>
              <p>{t(`${textKey}.risk`)}</p>
            </div>
          </div>
        )}
      </header>

      <div className="system-indicators-grid">
        {cards.map((card) => {
          const currentVal = card.latest ? card.latest.value.toFixed(1) : '--'

          return (
            <article key={card.indicator.code} className="vital-chart-card">
              <div className="vital-chart-card-header">
                <div>
                  <h3 className="vital-chart-heading">{localName(card.indicator, lang)}</h3>
                  <p className="vital-chart-sub">{card.indicator.code}</p>
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
                    <XAxis dataKey="time" stroke={chart.axis} fontSize={10} tickLine={false} />
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
                  <span>{t('astronaut.trend')}</span>
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
