import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import TrafficLight from '../../components/TrafficLight.jsx'
import { CHART_COLORS, DISPLAY_CODE, localName } from './display.js'

const BOUND_STYLES = {
  criticalMin: { color: CHART_COLORS.danger, dash: '4 4' },
  warnMin: { color: CHART_COLORS.warn, dash: '2 4' },
  warnMax: { color: CHART_COLORS.warn, dash: '2 4' },
  criticalMax: { color: CHART_COLORS.danger, dash: '4 4' },
}

function yDomain(points, threshold) {
  const values = points.map((point) => point.value)
  for (const key of Object.keys(BOUND_STYLES)) {
    if (threshold?.[key] != null) values.push(threshold[key])
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = Math.max((max - min) * 0.08, 1)
  return [Math.floor(min - padding), Math.ceil(max + padding)]
}

/**
 * One indicator card: latest value, traffic light, trend chart with threshold lines.
 *
 * @param {Object} props
 * @param {Object} props.item - { indicator, system, unit, threshold, isPersonal, latest, level, series }
 * @param {string} props.lang
 * @param {boolean} props.isEditing
 * @param {() => void} props.onEdit
 * @param {import('react').ReactNode} [props.children] - Threshold editor, shown under the chart.
 */
export default function IndicatorTrend({ item, lang, isEditing, onEdit, children }) {
  const { t } = useTranslation()
  const { indicator, system, unit, threshold, isPersonal, latest, level, series } = item
  const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const points = series.map((reading) => ({ time: Date.parse(reading.measuredAt), value: reading.value }))
  const name = localName(indicator, lang)

  let thresholdLabel = t('crewDetail.noThreshold')
  if (threshold) thresholdLabel = isPersonal ? t('crewDetail.personalThreshold') : t('crewDetail.generalThreshold')

  return (
    <article className={`indicator-card is-${level.toLowerCase().replace('_', '-')}`}>
      <header className="indicator-card-header">
        <div>
          <h3>{name}</h3>
          <p className="muted">
            {DISPLAY_CODE[indicator.code] ?? indicator.code}, {system ? localName(system, lang) : ''}
          </p>
        </div>
        <TrafficLight level={level} />
      </header>

      <p className="indicator-latest">
        <span className="indicator-latest-value">{numberFormat.format(latest.value)}</span>
        <span className="indicator-latest-unit">{unit}</span>
      </p>

      <div className="indicator-chart" role="img" aria-label={t('crewDetail.chartLabel', { name, count: points.length })}>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => timeFormat.format(value).slice(0, 5)}
              stroke={CHART_COLORS.axis}
              tick={{ fontSize: 11 }}
              minTickGap={40}
            />
            <YAxis
              domain={yDomain(points, threshold)}
              stroke={CHART_COLORS.axis}
              tick={{ fontSize: 11 }}
              width={44}
              allowDecimals={false}
            />
            {Object.entries(BOUND_STYLES).map(([key, style]) =>
              threshold?.[key] != null ? (
                <ReferenceLine
                  key={key}
                  y={threshold[key]}
                  stroke={style.color}
                  strokeDasharray={style.dash}
                  ifOverflow="extendDomain"
                />
              ) : null,
            )}
            <Tooltip
              contentStyle={{
                background: CHART_COLORS.tooltipBg,
                border: `1px solid ${CHART_COLORS.grid}`,
                borderRadius: 8,
                color: CHART_COLORS.text,
              }}
              labelFormatter={(value) => timeFormat.format(value)}
              formatter={(value) => [`${numberFormat.format(value)} ${unit}`, name]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.line}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <footer className="indicator-card-footer">
        <span className={`indicator-threshold-tag ${isPersonal ? 'is-personal' : ''}`}>{thresholdLabel}</span>
        <button type="button" aria-expanded={isEditing} onClick={onEdit}>
          {t('crewDetail.adjustThreshold')}
        </button>
      </footer>

      {children}
    </article>
  )
}
