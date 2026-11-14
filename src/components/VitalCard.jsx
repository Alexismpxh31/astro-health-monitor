import React from 'react';
import { TrafficLight } from './TrafficLight';
import { ChevronRight } from 'lucide-react';

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
  // Compute percentage on gauge if threshold is available
  let gaugePercent = 50;
  if (threshold && typeof value === 'number') {
    const min = threshold.minCritical;
    const max = threshold.maxCritical;
    const span = max - min || 1;
    gaugePercent = Math.max(0, Math.min(100, ((value - min) / span) * 100));
  }

  const normalMinPct = threshold 
    ? Math.max(0, Math.min(100, ((threshold.minNormal - threshold.minCritical) / (threshold.maxCritical - threshold.minCritical)) * 100))
    : 25;
  const normalMaxPct = threshold 
    ? Math.max(0, Math.min(100, ((threshold.maxNormal - threshold.minCritical) / (threshold.maxCritical - threshold.minCritical)) * 100))
    : 75;

  return (
    <div
      onClick={onClick}
      className={`group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer min-h-[52px] flex flex-col justify-between ${
        level === 'critical'
          ? 'bg-red-50/70 border-red-300 shadow-[0_4px_20px_rgba(239,68,68,0.12)]'
          : level === 'caution'
          ? 'bg-amber-50/70 border-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.12)]'
          : 'bg-white border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:border-blue-400 hover:shadow-md hover:bg-slate-50/50'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 block uppercase font-bold">
              {code} · {source}
            </span>
            <h3 className="text-sm font-bold text-[#0E1B3E] group-hover:text-blue-600 transition-colors">
              {name}
            </h3>
          </div>
          <TrafficLight level={level} size="sm" />
        </div>

        <div className="flex items-baseline gap-1.5 my-2">
          <span className="text-3xl font-extrabold font-mono tracking-tight text-[#0E1B3E] tabular-nums">
            {value}
          </span>
          <span className="text-xs font-mono text-slate-500 font-bold">{unit}</span>
        </div>
      </div>

      {threshold && (
        <div className="space-y-2 pt-3 border-t border-slate-100">
          {/* Linear Cockpit Range Visual Bar */}
          <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            {/* Safe Nominal Band Range */}
            <div 
              className="absolute top-0 bottom-0 bg-emerald-500/30 rounded-full"
              style={{
                left: `${normalMinPct}%`,
                width: `${Math.max(4, normalMaxPct - normalMinPct)}%`
              }}
            />
            {/* Live Telemetry Indicator Pip */}
            <div 
              className={`absolute top-0 bottom-0 w-2.5 -ml-1 rounded-full shadow-sm transition-all duration-300 ${
                level === 'critical' ? 'bg-red-500 shadow-red-500' : level === 'caution' ? 'bg-amber-500 shadow-amber-500' : 'bg-blue-600 shadow-blue-500'
              }`}
              style={{ left: `${gaugePercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Rango: {threshold.minNormal}-{threshold.maxNormal} {unit}</span>
            <span className="text-blue-600 font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Ver <ChevronRight size={12} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
