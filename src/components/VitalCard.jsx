import React from 'react';
import { TrafficLight } from './TrafficLight';

export const VitalCard = ({
  code,
  name,
  value,
  unit,
  level = 'normal',
  threshold,
  source = 'SIMULADOR',
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative p-4 rounded-xl border bg-space-surface/90 hover:bg-space-card transition-all duration-200 cursor-pointer min-h-[48px] ${
        level === 'critical'
          ? 'border-status-critical/80 shadow-glow-red animate-pulse-subtle'
          : level === 'caution'
          ? 'border-status-caution/70'
          : 'border-space-border hover:border-space-cyan/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-space-muted block uppercase">
            {code} · {source}
          </span>
          <h3 className="text-sm font-medium text-space-text group-hover:text-space-cyan transition-colors">
            {name}
          </h3>
        </div>
        <TrafficLight level={level} size="sm" />
      </div>

      <div className="flex items-baseline gap-1.5 my-2">
        <span className="text-3xl font-bold font-mono tracking-tight text-white tabular-nums">
          {value}
        </span>
        <span className="text-xs font-mono text-space-muted">{unit}</span>
      </div>

      {threshold && (
        <div className="pt-2 border-t border-space-border/50 flex items-center justify-between text-[11px] font-mono text-space-muted">
          <span>NASA Normal: {threshold.minNormal} - {threshold.maxNormal} {unit}</span>
          <span className="text-space-cyan/90 group-hover:translate-x-0.5 transition-transform">Inspeccionar →</span>
        </div>
      )}
    </div>
  );
};
