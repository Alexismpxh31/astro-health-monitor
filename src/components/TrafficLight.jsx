import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

export const TrafficLight = ({ level = 'normal', showText = true, size = 'md' }) => {
  const configs = {
    critical: {
      bg: 'bg-red-950/70 border-red-500/80 text-red-400',
      dot: 'bg-status-critical',
      text: 'CRÍTICO',
      Icon: AlertOctagon,
      glow: 'shadow-glow-red'
    },
    caution: {
      bg: 'bg-amber-950/70 border-amber-500/80 text-amber-400',
      dot: 'bg-status-caution',
      text: 'PRECAUCIÓN',
      Icon: AlertTriangle,
      glow: ''
    },
    normal: {
      bg: 'bg-emerald-950/60 border-emerald-500/70 text-emerald-400',
      dot: 'bg-status-normal',
      text: 'NOMINAL',
      Icon: CheckCircle2,
      glow: ''
    }
  };

  const config = configs[level] || configs.normal;
  const IconComponent = config.Icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium'
  }[size];

  return (
    <div className={`inline-flex items-center rounded-full border backdrop-blur-sm ${config.bg} ${config.glow} ${sizeClasses}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} ${level === 'critical' ? 'animate-ping' : ''}`} />
      <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />
      {showText && <span className="font-mono tracking-wider font-semibold">{config.text}</span>}
    </div>
  );
};
