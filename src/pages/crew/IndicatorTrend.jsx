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
import { BASELINE_MIN_READINGS } from '../../rules/baseline.js'
import { useTheme } from '../../theme/theme.js'
import { CHART_THEMES, DISPLAY_CODE, localName } from './display.js'

const BOUND_STYLES = {
  minCritical: { tone: 'danger', dash: '4 4' },
  minNormal: { tone: 'warn', dash: '2 4' },
  maxNormal: { tone: 'warn', dash: '2 4' },
  maxCritical: { tone: 'danger', dash: '4 4' },
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
  const colors = CHART_THEMES[useTheme()] ?? CHART_THEMES.dark
  const { indicator, system, unit, rule, threshold, baseline, isPersonal, latest, level, series } = item
  const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const points = series.map((reading) => ({ time: Date.parse(reading.measuredAt), value: reading.value }))
  const name = localName(indicator, lang)

  let thresholdLabel = t('crewDetail.noThreshold')
  if (rule) thresholdLabel = isPersonal ? t('crewDetail.personalThreshold') : t('crewDetail.generalThreshold')

  let baselineLabel = null
  if (baseline?.value != null) {
    baselineLabel = t('crewDetail.baseline.usual', { value: numberFormat.format(baseline.value), unit })
  } else if (baseline) {
    baselineLabel = t('crewDetail.baseline.calibrating', { count: baseline.count, total: BASELINE_MIN_READINGS })
  }

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
      {baselineLabel && <p className="indicator-baseline">{baselineLabel}</p>}

      <div className="indicator-chart" role="img" aria-label={t('crewDetail.chartLabel', { name, count: points.length })}>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => timeFormat.format(value).slice(0, 5)}
              stroke={colors.axis}
              tick={{ fontSize: 11 }}
              minTickGap={40}
            />
            <YAxis
              domain={yDomain(points, threshold)}
              stroke={colors.axis}
              tick={{ fontSize: 11 }}
              width={44}
              allowDecimals={false}
            />
            {threshold?.baseline != null && (
              <ReferenceLine y={threshold.baseline} stroke={colors.axis} strokeDasharray="1 3" />
            )}
            {Object.entries(BOUND_STYLES).map(([key, style]) =>
              threshold?.[key] != null ? (
                <ReferenceLine
                  key={key}
                  y={threshold[key]}
                  stroke={colors[style.tone]}
                  strokeDasharray={style.dash}
                  ifOverflow="extendDomain"
                />
              ) : null,
            )}
            <Tooltip
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.grid}`,
                borderRadius: 8,
                color: colors.text,
              }}
              labelFormatter={(value) => timeFormat.format(value)}
              formatter={(value) => [`${numberFormat.format(value)} ${unit}`, name]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors.line}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <footer className="indicator-card-footer">
        <span className={`indicator-threshold-tag ${isPersonal ? 'is-personal' : ''}`}>{thresholdLabel}</span>
        {onEdit && (
          <button type="button" aria-expanded={isEditing} onClick={onEdit}>
            {t('crewDetail.adjustThreshold')}
          </button>
        )}
      </footer>

      {children}
    </article>
  )
}
