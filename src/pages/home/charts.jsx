// Small inline SVG charts for the vital cards (no chart library needed).

/** Trend line of the last readings, with the newest point marked. */
export function Sparkline({ values, width = 112, height = 36 }) {
  if (!values || values.length < 2) return <svg className="sparkline" width={width} height={height} aria-hidden="true" />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = (width - 6) / (values.length - 1)
  const points = values.map((value, index) => [3 + index * step, height - 4 - ((value - min) / span) * (height - 8)])
  const [lastX, lastY] = points.at(-1)

  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} />
      <circle cx={lastX} cy={lastY} r="3" />
    </svg>
  )
}

/** Ring that fills to `value` out of `max` (e.g. SpO2 out of 100 %). */
export function RingGauge({ value, max = 100, size = 64 }) {
  const radius = size / 2 - 6
  const circumference = 2 * Math.PI * radius
  const ratio = Number.isFinite(value) ? Math.min(Math.max(value / max, 0), 1) : 0

  return (
    <svg className="ring-gauge" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} />
      <circle
        className="ring-value"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeDasharray={`${circumference * ratio} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}
