import React from 'react';

export const BodyModel = ({
  systemStatuses = {},
  selectedSystem = null,
  onSelectSystem = () => {}
}) => {
  const getColor = (level) => {
    switch (level) {
      case 'critical':
        return '#EF4444'; // Red
      case 'caution':
        return '#F59E0B'; // Yellow/Amber
      case 'normal':
      default:
        return '#22C55E'; // Green
    }
  };

  const getGlow = (level) => {
    switch (level) {
      case 'critical':
        return 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.85))';
      case 'caution':
        return 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.7))';
      case 'normal':
      default:
        return 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.5))';
    }
  };

  const cardioLevel = systemStatuses.cardiovascular || 'normal';
  const musculoLevel = systemStatuses.musculoskeletal || 'normal';
  const immuneLevel = systemStatuses.immune || 'normal';
  const behavLevel = systemStatuses.behavioral || 'normal';
  const radLevel = systemStatuses.radiation || 'normal';

  return (
    <div className="relative w-full max-w-[360px] aspect-[1/2] mx-auto flex flex-col items-center justify-center p-4 bg-space-surface/60 border border-space-border/90 rounded-2xl backdrop-blur-md overflow-hidden">
      {/* Hologram scanline animation */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-space-cyan/10 to-transparent h-16 w-full animate-pulse-subtle pointer-events-none" />

      {/* Target Crosshairs / HUD Overlay */}
      <div className="absolute inset-2 border border-space-border/40 rounded-xl pointer-events-none" />
      <div className="absolute top-4 left-4 text-[10px] font-mono text-space-muted flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-space-cyan animate-ping" />
        BIO-HUD · NASA HRP
      </div>
      <div className="absolute top-4 right-4 text-[10px] font-mono text-space-muted">
        CIPHER MONITOR
      </div>

      <svg
        viewBox="0 0 240 460"
        className="w-full h-full max-h-[420px] transition-all duration-300"
      >
        <defs>
          <filter id="hologramGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Grid Lines */}
        <g stroke="#23334D" strokeWidth="0.5" strokeDasharray="3 3">
          <line x1="20" y1="70" x2="220" y2="70" />
          <line x1="20" y1="150" x2="220" y2="150" />
          <line x1="20" y1="230" x2="220" y2="230" />
          <line x1="20" y1="340" x2="220" y2="340" />
          <line x1="120" y1="20" x2="120" y2="440" />
        </g>

        {/* 1. RADIATION SHIELD RING / HELMET VISOR */}
        <g
          className="cursor-pointer transition-transform hover:scale-105"
          onClick={() => onSelectSystem('radiation')}
          style={{ filter: getGlow(radLevel) }}
        >
          <circle
            cx="120"
            cy="52"
            r="40"
            fill="none"
            stroke={getColor(radLevel)}
            strokeWidth="1.8"
            strokeDasharray="8 4"
            opacity="0.8"
          />
          <path
            d="M 94,26 A 36 36 0 0 1 146,26"
            fill="none"
            stroke={getColor(radLevel)}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* 2. HEAD & NEUROCOGNITIVE (Behavioral & Sleep - PVT) */}
        <g
          className="cursor-pointer transition-all hover:opacity-100"
          onClick={() => onSelectSystem('behavioral')}
          style={{ filter: getGlow(behavLevel) }}
        >
          <ellipse
            cx="120"
            cy="52"
            rx="22"
            ry="28"
            fill="#111C31"
            stroke={getColor(behavLevel)}
            strokeWidth={selectedSystem === 'behavioral' ? '3.5' : '2'}
          />
          {/* Neural circuits */}
          <path
            d="M 112 45 Q 120 40 128 45 M 110 54 Q 120 50 130 54 M 114 62 Q 120 65 126 62"
            fill="none"
            stroke={getColor(behavLevel)}
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.85"
          />
        </g>

        {/* Neck */}
        <rect x="114" y="80" width="12" height="12" fill="#152238" stroke="#23334D" strokeWidth="1.5" />

        {/* 3. CHEST & HEART (Cardiovascular & SpO2) */}
        <g
          className="cursor-pointer transition-all hover:opacity-100"
          onClick={() => onSelectSystem('cardiovascular')}
          style={{ filter: getGlow(cardioLevel) }}
        >
          {/* Upper Torso */}
          <path
            d="M 85 92 L 155 92 L 148 155 L 92 155 Z"
            fill="#111C31"
            stroke={getColor(cardioLevel)}
            strokeWidth={selectedSystem === 'cardiovascular' ? '3.5' : '2'}
          />
          {/* Pulsing Heart Node */}
          <circle
            cx="128"
            cy="118"
            r="9"
            fill={getColor(cardioLevel)}
            className={cardioLevel === 'critical' ? 'animate-ping' : 'animate-pulse'}
            opacity="0.9"
          />
          <path
            d="M 120 126 Q 128 116 136 126"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>

        {/* 4. ABDOMEN (Immune Dysregulation & SANS) */}
        <g
          className="cursor-pointer transition-all hover:opacity-100"
          onClick={() => onSelectSystem('immune')}
          style={{ filter: getGlow(immuneLevel) }}
        >
          <path
            d="M 92 158 L 148 158 L 142 215 L 98 215 Z"
            fill="#111C31"
            stroke={getColor(immuneLevel)}
            strokeWidth={selectedSystem === 'immune' ? '3.5' : '2'}
          />
          {/* Lymphatic nodes & grid */}
          <circle cx="110" cy="180" r="3" fill={getColor(immuneLevel)} />
          <circle cx="130" cy="180" r="3" fill={getColor(immuneLevel)} />
          <circle cx="120" cy="195" r="3" fill={getColor(immuneLevel)} />
          <line x1="110" y1="180" x2="120" y2="195" stroke={getColor(immuneLevel)} strokeWidth="1" strokeDasharray="2 2" />
          <line x1="130" y1="180" x2="120" y2="195" stroke={getColor(immuneLevel)} strokeWidth="1" strokeDasharray="2 2" />
        </g>

        {/* Pelvis */}
        <path d="M 98 217 L 142 217 L 135 240 L 105 240 Z" fill="#152238" stroke="#23334D" strokeWidth="1.5" />

        {/* 5. LIMBS & BONES (Musculoskeletal - BMD & ARED) */}
        <g
          className="cursor-pointer transition-all hover:opacity-100"
          onClick={() => onSelectSystem('musculoskeletal')}
          style={{ filter: getGlow(musculoLevel) }}
        >
          {/* Left Arm */}
          <path d="M 83 95 L 65 145 L 56 195 L 48 190 L 58 142 L 75 92 Z" fill="#111C31" stroke={getColor(musculoLevel)} strokeWidth="1.6" />
          {/* Right Arm */}
          <path d="M 157 95 L 175 145 L 184 195 L 192 190 L 182 142 L 165 92 Z" fill="#111C31" stroke={getColor(musculoLevel)} strokeWidth="1.6" />

          {/* Left Leg */}
          <path d="M 103 242 L 95 325 L 90 410 L 82 425 L 100 425 L 108 325 L 115 242 Z" fill="#111C31" stroke={getColor(musculoLevel)} strokeWidth="1.6" />
          {/* Right Leg */}
          <path d="M 137 242 L 145 325 L 150 410 L 158 425 L 140 425 L 132 325 L 125 242 Z" fill="#111C31" stroke={getColor(musculoLevel)} strokeWidth="1.6" />

          {/* Bone density joint probes */}
          <circle cx="65" cy="145" r="4" fill="none" stroke={getColor(musculoLevel)} strokeWidth="1.5" />
          <circle cx="175" cy="145" r="4" fill="none" stroke={getColor(musculoLevel)} strokeWidth="1.5" />
          <circle cx="102" cy="325" r="4" fill="none" stroke={getColor(musculoLevel)} strokeWidth="1.5" />
          <circle cx="138" cy="325" r="4" fill="none" stroke={getColor(musculoLevel)} strokeWidth="1.5" />
        </g>

        {/* Telemetry Annotation Lines */}
        <g className="text-[9px] font-mono fill-space-text" pointerEvents="none">
          <line x1="145" y1="52" x2="190" y2="40" stroke="#64748B" strokeWidth="0.8" />
          <text x="192" y="42">NEURO / PVT</text>

          <line x1="75" y1="120" x2="25" y2="110" stroke="#64748B" strokeWidth="0.8" />
          <text x="5" y="112">CARDIO / SpO2</text>

          <line x1="145" y1="185" x2="185" y2="185" stroke="#64748B" strokeWidth="0.8" />
          <text x="188" y="188">INMUNE</text>

          <line x1="90" y1="330" x2="30" y2="330" stroke="#64748B" strokeWidth="0.8" />
          <text x="5" y="333">ÓSEO (BMD)</text>
        </g>
      </svg>

      {/* Helper guide */}
      <div className="mt-2 text-center text-xs font-mono text-space-muted flex items-center justify-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-space-cyan"></span>
        Haz clic en una región para ver el riesgo NASA HRP
      </div>
    </div>
  );
};
