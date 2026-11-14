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
      className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer min-h-[52px] flex flex-col justify-between ${
        level === 'critical'
          ? 'bg-red-950/20 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
          : level === 'caution'
          ? 'bg-amber-950/20 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
          : 'bg-[#0E1726]/90 border-[#1E2E48] hover:border-cyan-400/50 hover:bg-[#14223A]'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-400 block uppercase font-semibold">
              {code} · {source}
            </span>
            <h3 className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
              {name}
            </h3>
          </div>
          <TrafficLight level={level} size="sm" />
        </div>

        <div className="flex items-baseline gap-1.5 my-2">
          <span className="text-3xl font-extrabold font-mono tracking-tight text-white tabular-nums">
            {value}
          </span>
          <span className="text-xs font-mono text-slate-400 font-semibold">{unit}</span>
        </div>
      </div>

      {threshold && (
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          {/* Linear Cockpit Range Visual Bar */}
          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            {/* Safe Nominal Band Range */}
            <div 
              className="absolute top-0 bottom-0 bg-emerald-500/40 rounded-full"
              style={{
                left: `${normalMinPct}%`,
                width: `${Math.max(4, normalMaxPct - normalMinPct)}%`
              }}
            />
            {/* Live Telemetry Indicator Pip */}
            <div 
              className={`absolute top-0 bottom-0 w-2.5 -ml-1 rounded-full shadow-sm transition-all duration-300 ${
                level === 'critical' ? 'bg-red-500 shadow-red-500' : level === 'caution' ? 'bg-amber-400 shadow-amber-400' : 'bg-cyan-400 shadow-cyan-400'
              }`}
              style={{ left: `${gaugePercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Rango: {threshold.minNormal}-{threshold.maxNormal} {unit}</span>
            <span className="text-cyan-400 font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Ver <ChevronRight size={12} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
