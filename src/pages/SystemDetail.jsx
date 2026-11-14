import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { NASA_HRP_SYSTEMS, NASA_INDICATORS_MAP } from '../data/nasaHrpData.js';
import { TelemetryChart } from '../components/TelemetryChart.jsx';
import { TrafficLight } from '../components/TrafficLight.jsx';
import { 
  ArrowLeft, 
  Shield, 
  CheckCircle2, 
  Info, 
  Sparkles,
  ClipboardList,
  Flame,
  Award
} from 'lucide-react';

export default function SystemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeSystemId, setActiveSystemId] = useState(id || 'cardiovascular');
  const [completedActions, setCompletedActions] = useState({});

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

  const handleCompleteCountermeasure = (index) => {
    setCompletedActions(prev => ({
      ...prev,
      [`${activeSystemId}-${index}`]: !prev[`${activeSystemId}-${index}`]
    }));

    // Trigger celebratory micro-confetti on completion
    if (!completedActions[`${activeSystemId}-${index}`]) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#22D3EE', '#10B981', '#F59E0B']
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Navigation Back & Health Status */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/')}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0E1726] border border-[#1E2E48] text-xs font-mono font-bold text-slate-300 hover:text-white hover:border-cyan-400 flex items-center gap-2 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          Volver a Bio-HUD Anatómico
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">ESTADO CLÍNICO:</span>
          <TrafficLight level="normal" size="md" />
        </div>
      </div>

      {/* Subsystem Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {NASA_HRP_SYSTEMS.map(s => {
          const isActive = s.id === activeSystemId;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSystemId(s.id)}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-cyan-400 text-[#070C15] shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                  : 'bg-[#0E1726] border border-[#1E2E48] text-slate-300 hover:text-white hover:border-slate-600'
              }`}
            >
              <span>{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* System Technical Sheet */}
      <div className="bg-[#0E1726]/95 border border-[#1E2E48] p-6 rounded-2xl shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Flame size={14} />
            PELIGRO NASA ASOCIADO: {system.hazard}
          </span>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#14223A] border border-[#1E2E48] text-slate-300 font-semibold">
            MARCO RIDGE NASA
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {system.name}
          </h1>
          <span className="text-xs font-mono text-cyan-300/90 block mt-1 font-semibold">
            {system.riskName}
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          {system.description}
        </p>

        {/* Research Protocol Badge */}
        <div className="p-4 rounded-xl bg-[#14223A]/80 border border-[#1E2E48] flex items-start gap-3 text-xs text-slate-200 font-mono">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-cyan-400">Protocolo de Investigación NASA:</strong> {system.researchProtocol}
          </div>
        </div>
      </div>

      {/* Indicators and Countermeasures Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Trend Graph */}
        <div className="lg:col-span-7 space-y-4">
          <TelemetryChart
            data={historyData}
            threshold={primaryIndicator}
            unit={primaryIndicator.unit}
            title={`Tendencia Histórica · ${primaryIndicator.name}`}
            color="#22D3EE"
          />

          {/* NASA Limits Matrix */}
          <div className="bg-[#0E1726]/95 border border-[#1E2E48] p-4 rounded-xl text-xs font-mono shadow-md">
            <h4 className="text-cyan-400 uppercase tracking-wider mb-3 font-bold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Límites Clínicos NASA HRP ({primaryIndicator.code})
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-[#14223A] border border-red-500/30">
                <span className="block text-[10px] text-red-400 font-bold uppercase tracking-wider">CRÍTICO BAJO</span>
                <span className="text-base font-extrabold text-white tabular-nums">
                  &lt; {primaryIndicator.minCritical} {primaryIndicator.unit}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#14223A] border border-emerald-500/30">
                <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider">RANGO NOMINAL</span>
                <span className="text-base font-extrabold text-white tabular-nums">
                  {primaryIndicator.minNormal} - {primaryIndicator.maxNormal} {primaryIndicator.unit}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#14223A] border border-red-500/30">
                <span className="block text-[10px] text-red-400 font-bold uppercase tracking-wider">CRÍTICO ALTO</span>
                <span className="text-base font-extrabold text-white tabular-nums">
                  &gt; {primaryIndicator.maxCritical} {primaryIndicator.unit}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Prescribed NASA Countermeasures */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-[#0E1726]/95 border border-[#1E2E48] p-5 rounded-2xl space-y-4 shadow-md">
            <div>
              <h3 className="text-sm font-mono tracking-wider uppercase text-cyan-400 flex items-center gap-2 font-bold">
                <ClipboardList className="w-4 h-4" />
                Contramedidas Clínicas Prescritas (HRP)
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Acciones obligatorias validadas por los estudios CIPHER y Standard Measures para mitigar este riesgo:
              </p>
            </div>

            <ul className="space-y-3 pt-1">
              {system.countermeasures.map((cm, idx) => {
                const isDone = !!completedActions[`${activeSystemId}-${idx}`];
                return (
                  <li
                    key={idx}
                    onClick={() => handleCompleteCountermeasure(idx)}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-3 font-mono cursor-pointer transition-all select-none ${
                      isDone
                        ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                        : 'bg-[#14223A] border-[#1E2E48] text-slate-200 hover:border-slate-500 hover:bg-[#1A2C4B]'
                    }`}
                  >
                    <button
                      type="button"
                      aria-label="Registrar cumplimiento"
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold mt-0.5 transition-colors ${
                        isDone
                          ? 'bg-emerald-500 text-[#070C15]'
                          : 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40'
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={13} /> : idx + 1}
                    </button>
                    <div className="flex-1">
                      <span className={isDone ? 'line-through text-slate-400' : ''}>
                        {cm}
                      </span>
                      {isDone && (
                        <span className="block text-[10px] text-emerald-400 font-bold mt-1 uppercase">
                          ✓ Completado por CDR Walter
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="p-3 rounded-xl bg-[#070C15] border border-[#1E2E48] flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <Award size={14} className="text-amber-400" />
              <span>Haz clic en una contramedida para registrar su ejecución médica.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
