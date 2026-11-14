import React from 'react';

export const TelemetryChart = ({
  data = [],
  threshold,
  unit = '',
  title = '',
  color = '#22D3EE'
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-space-border rounded-xl text-space-muted font-mono text-xs">
        Esperando telemetría de vuelo...
      </div>
    );
  }

  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 50 };

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const domainMin = threshold ? Math.min(minVal, threshold.minCritical) * 0.95 : minVal * 0.95;
  const domainMax = threshold ? Math.max(maxVal, threshold.maxCritical) * 1.05 : maxVal * 1.05;
  const range = domainMax - domainMin || 1;

  const getX = (index) => {
    return padding.left + (index / (data.length - 1 || 1)) * (width - padding.left - padding.right);
  };

  const getY = (val) => {
    const ratio = (val - domainMin) / range;
    return height - padding.bottom - ratio * (height - padding.top - padding.bottom);
  };

  // Build SVG path
  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');

  // Threshold areas
  const yNormalMin = threshold ? getY(threshold.minNormal) : null;
  const yNormalMax = threshold ? getY(threshold.maxNormal) : null;
  const yCritMax = threshold ? getY(threshold.maxCritical) : null;
  const yCritMin = threshold ? getY(threshold.minCritical) : null;

  return (
    <div className="w-full bg-space-surface/90 border border-space-border p-4 rounded-xl space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono tracking-wider uppercase text-space-muted">
            {title}
          </h4>
          <span className="text-xs font-mono text-space-cyan font-bold tabular-nums">
            Último: {data[data.length - 1]?.value} {unit}
          </span>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 select-none font-mono text-[10px]">
          {/* Background grid */}
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#1E293B" strokeDasharray="3 3" />
          <line x1={padding.left} y1={height / 2} x2={width - padding.right} y2={height / 2} stroke="#1E293B" strokeDasharray="3 3" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#1E293B" />

          {/* NASA Normal Reference Band */}
          {yNormalMin !== null && yNormalMax !== null && (
            <rect
              x={padding.left}
              y={Math.min(yNormalMin, yNormalMax)}
              width={width - padding.left - padding.right}
              height={Math.abs(yNormalMin - yNormalMax)}
              fill="#22C55E"
              fillOpacity="0.08"
            />
          )}

          {/* Critical Threshold Reference Lines */}
          {yCritMax !== null && (
            <g>
              <line
                x1={padding.left}
                y1={yCritMax}
                x2={width - padding.right}
                y2={yCritMax}
                stroke="#EF4444"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <text x={width - padding.right - 5} y={yCritMax - 4} textAnchor="end" fill="#EF4444">
                LÍMITE CRÍTICO ALTO ({threshold.maxCritical})
              </text>
            </g>
          )}

          {yCritMin !== null && (
            <g>
              <line
                x1={padding.left}
                y1={yCritMin}
                x2={width - padding.right}
                y2={yCritMin}
                stroke="#EF4444"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <text x={width - padding.right - 5} y={yCritMin + 12} textAnchor="end" fill="#EF4444">
                LÍMITE CRÍTICO BAJO ({threshold.minCritical})
              </text>
            </g>
          )}

          {/* Telemetry Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Data Points */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(d.value)}
              r={i === data.length - 1 ? 4.5 : 2}
              fill={i === data.length - 1 ? '#ffffff' : color}
              stroke={color}
              strokeWidth="1.5"
            />
          ))}

          {/* Y-Axis Labels */}
          <text x={padding.left - 8} y={height - padding.bottom} textAnchor="end" fill="#64748B">
            {domainMin.toFixed(0)}
          </text>
          <text x={padding.left - 8} y={height / 2} textAnchor="end" fill="#64748B">
            {((domainMin + domainMax) / 2).toFixed(0)}
          </text>
          <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" fill="#64748B">
            {domainMax.toFixed(0)}
          </text>

          {/* X-Axis First & Last Time */}
          <text x={padding.left} y={height - 8} fill="#64748B">
            {data[0]?.time}
          </text>
          <text x={width - padding.right} y={height - 8} textAnchor="end" fill="#64748B">
            {data[data.length - 1]?.time}
          </text>
        </svg>
      </div>
    </div>
  );
};
