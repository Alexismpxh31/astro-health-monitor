import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

export const TrafficLight = ({ level = 'normal', showText = true, size = 'md' }) => {
  const configs = {
    critical: {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: '#FECACA',
      color: '#DC2626',
      dot: '#EF4444',
      text: 'CRÍTICO',
      Icon: AlertOctagon
    },
    caution: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: '#FDE68A',
      color: '#D97706',
      dot: '#F59E0B',
      text: 'PRECAUCIÓN',
      Icon: AlertTriangle
    },
    normal: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: '#A7F3D0',
      color: '#059669',
      dot: '#10B981',
      text: 'NOMINAL',
      Icon: CheckCircle2
    }
  };

  const config = configs[level] || configs.normal;
  const IconComponent = config.Icon;

  const pad = size === 'sm' ? '3px 8px' : size === 'lg' ? '6px 14px' : '4px 10px';
  const fontSize = size === 'sm' ? '10px' : size === 'lg' ? '12px' : '11px';

  return (
    <div 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: pad,
        borderRadius: '9999px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize,
        fontFamily: 'monospace',
        fontWeight: '700'
      }}
    >
      <span 
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: config.dot
        }} 
      />
      <IconComponent size={13} style={{ flexShrink: 0 }} />
      {showText && <span style={{ letterSpacing: '0.05em' }}>{config.text}</span>}
    </div>
  );
};
