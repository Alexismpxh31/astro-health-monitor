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

  const cardBg = level === 'critical' ? '#FEF2F2' : level === 'caution' ? '#FFFBEB' : '#FFFFFF';
  const cardBorder = level === 'critical' ? '#FECACA' : level === 'caution' ? '#FDE68A' : '#E2E8F0';

  return (
    <div
      onClick={onClick}
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '18px',
        padding: '20px',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.15s ease'
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.1em', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>
              {code} · {source}
            </span>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0E1B3E', margin: '2px 0 0 0' }}>
              {name}
            </h3>
          </div>
          <TrafficLight level={level} size="sm" />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '8px 0' }}>
          <span style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '-0.03em', color: '#0E1B3E' }}>
            {value}
          </span>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748B', fontWeight: '700' }}>{unit}</span>
        </div>
      </div>

      {threshold && (
        <div style={{ paddingTop: '12px', borderTop: '1px solid #F1F5F9', marginTop: '10px' }}>
          {/* Linear Cockpit Range Visual Bar */}
          <div style={{ position: 'relative', width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
            {/* Safe Nominal Band Range */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                background: 'rgba(16, 185, 129, 0.35)',
                borderRadius: '9999px',
                left: `${normalMinPct}%`,
                width: `${Math.max(4, normalMaxPct - normalMinPct)}%`
              }}
            />
            {/* Live Telemetry Indicator Pip */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '10px',
                marginLeft: '-5px',
                borderRadius: '9999px',
                background: level === 'critical' ? '#EF4444' : level === 'caution' ? '#F59E0B' : '#0284C7',
                left: `${gaugePercent}%`,
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: '#64748B', marginTop: '8px' }}>
            <span>Rango: {threshold.minNormal}-{threshold.maxNormal} {unit}</span>
            <span style={{ color: '#0284C7', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              Ver <ChevronRight size={13} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
