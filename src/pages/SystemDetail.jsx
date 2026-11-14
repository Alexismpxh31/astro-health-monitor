import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NASA_HRP_SYSTEMS, NASA_INDICATORS_MAP } from '../data/nasaHrpData.js';
import { TelemetryChart } from '../components/TelemetryChart.jsx';
import { TrafficLight } from '../components/TrafficLight.jsx';
import { ArrowLeft, Shield, CheckCircle2, Info } from 'lucide-react';

export default function SystemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeSystemId, setActiveSystemId] = useState(id || 'cardiovascular');

  const system = NASA_HRP_SYSTEMS.find(s => s.id === activeSystemId) || NASA_HRP_SYSTEMS[0];
  const primaryIndicatorCode = system.indicators[0];
  const primaryIndicator = NASA_INDICATORS_MAP[primaryIndicatorCode] || NASA_INDICATORS_MAP.HR;

  // Historical curve points
  const historyData = [
    { time: '10:00:00', value: primaryIndicator.typical - 2 },
    { time: '10:05:00', value: primaryIndicator.typical },
    { time: '10:10:00', value: primaryIndicator.typical + 3 },
    { time: '10:15:00', value: primaryIndicator.typical + 1 },
    { time: '10:20:00', value: primaryIndicator.typical + 4 },
    { time: '10:25:00', value: primaryIndicator.typical + 2 },
    { time: '10:30:00', value: primaryIndicator.typical }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/')}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-space-surface border border-space-border text-xs font-mono text-space-muted hover:text-white flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Bio-HUD Anatómico
        </button>

        <TrafficLight level="normal" size="md" />
      </div>

      {/* Subsystem Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {NASA_HRP_SYSTEMS.map(s => {
          const isActive = s.id === activeSystemId;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSystemId(s.id)}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-space-cyan text-space-bg font-bold shadow-glow-cyan'
                  : 'bg-space-surface border border-space-border text-space-muted hover:text-white'
              }`}
            >
              <span>{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* System Technical Sheet */}
      <div className="bg-space-surface/90 border border-space-border p-6 rounded-2xl space-y-4">
        <div>
          <span className="text-[10px] font-mono text-space-cyan uppercase tracking-widest block">
            PELIGRO NASA ASOCIADO: {system.hazard}
          </span>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-white mt-1">
            {system.name}
          </h1>
          <span className="text-xs font-mono text-space-muted block mt-0.5 font-semibold">
            {system.riskName}
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          {system.description}
        </p>

        {/* Research Protocol Badge */}
        <div className="p-3.5 rounded-xl bg-space-card/70 border border-space-border/80 flex items-start gap-3 text-xs text-slate-200 font-mono">
          <Info className="w-4 h-4 text-space-cyan flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-space-cyan">Protocolo de Investigación NASA:</strong> {system.researchProtocol}
          </div>
        </div>
      </div>

      {/* Indicators and Countermeasures Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Trend Graph */}
        <div className="lg:col-span-7 space-y-3">
          <TelemetryChart
            data={historyData}
            threshold={primaryIndicator}
            unit={primaryIndicator.unit}
            title={`Tendencia Histórica · ${primaryIndicator.name}`}
            color="#22D3EE"
          />

          {/* NASA Limits Matrix */}
          <div className="bg-space-surface/90 border border-space-border p-4 rounded-xl text-xs font-mono">
            <h4 className="text-space-cyan uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Límites Clínicos NASA HRP ({primaryIndicator.code})
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-space-card border border-space-border">
                <span className="block text-[10px] text-red-400">CRÍTICO BAJO</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  &lt; {primaryIndicator.minCritical} {primaryIndicator.unit}
                </span>
              </div>
              <div className="p-2 rounded bg-space-card border border-space-border">
                <span className="block text-[10px] text-emerald-400">RANGO NOMINAL</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {primaryIndicator.minNormal} - {primaryIndicator.maxNormal} {primaryIndicator.unit}
                </span>
              </div>
              <div className="p-2 rounded bg-space-card border border-space-border">
                <span className="block text-[10px] text-red-400">CRÍTICO ALTO</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  &gt; {primaryIndicator.maxCritical} {primaryIndicator.unit}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Prescribed NASA Countermeasures */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-space-surface/90 border border-space-border p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-mono tracking-wider uppercase text-space-cyan flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Contramedidas Clínicas Prescritas (HRP)
            </h3>
            <p className="text-xs text-space-muted font-mono">
              Acciones obligatorias validadas por los estudios CIPHER y Standard Measures para mitigar este riesgo:
            </p>

            <ul className="space-y-2.5 pt-2">
              {system.countermeasures.map((cm, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded-xl bg-space-card/80 border border-space-border/80 text-xs text-slate-200 leading-relaxed flex items-start gap-2.5 font-mono"
                >
                  <span className="w-5 h-5 rounded-full bg-space-cyan/20 text-space-cyan flex items-center justify-center flex-shrink-0 text-[11px] font-bold">
                    {idx + 1}
                  </span>
                  <span>{cm}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
