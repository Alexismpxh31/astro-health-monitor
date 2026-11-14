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
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-700 hover:text-blue-600 hover:border-blue-400 flex items-center gap-2 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600" />
          Volver a Bio-HUD Anatómico
        </button>

        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-mono text-slate-500 font-bold">ESTADO CLÍNICO:</span>
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
                  ? 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)]'
                  : 'bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 shadow-xs'
              }`}
            >
              <span>{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* System Technical Sheet */}
      <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-blue-600 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Flame size={14} />
            PELIGRO NASA ASOCIADO: {system.hazard}
          </span>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold">
            MARCO RIDGE NASA
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0E1B3E] tracking-tight">
            {system.name}
          </h1>
          <span className="text-xs font-mono text-slate-600 block mt-1 font-semibold">
            {system.riskName}
          </span>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
          {system.description}
        </p>

        {/* Research Protocol Badge */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-700 font-mono">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-blue-700 font-bold">Protocolo de Investigación NASA:</strong> {system.researchProtocol}
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
            color="#185EE0"
          />

          {/* NASA Limits Matrix */}
          <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] text-xs font-mono">
            <h4 className="text-[#0E1B3E] uppercase tracking-wider mb-3 font-extrabold flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Límites Clínicos NASA HRP ({primaryIndicator.code})
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <span className="block text-[10px] text-red-600 font-bold uppercase tracking-wider">CRÍTICO BAJO</span>
                <span className="text-base font-extrabold text-red-700 tabular-nums">
                  &lt; {primaryIndicator.minCritical} {primaryIndicator.unit}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="block text-[10px] text-emerald-700 font-bold uppercase tracking-wider">RANGO NOMINAL</span>
                <span className="text-base font-extrabold text-emerald-800 tabular-nums">
                  {primaryIndicator.minNormal} - {primaryIndicator.maxNormal} {primaryIndicator.unit}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <span className="block text-[10px] text-red-600 font-bold uppercase tracking-wider">CRÍTICO ALTO</span>
                <span className="text-base font-extrabold text-red-700 tabular-nums">
                  &gt; {primaryIndicator.maxCritical} {primaryIndicator.unit}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Prescribed NASA Countermeasures */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white border border-slate-200/90 p-6 rounded-2xl space-y-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
            <div>
              <h3 className="text-sm font-mono tracking-wider uppercase text-[#0E1B3E] flex items-center gap-2 font-bold">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                Contramedidas Clínicas Prescritas (HRP)
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-1">
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
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/40'
                    }`}
                  >
                    <button
                      type="button"
                      aria-label="Registrar cumplimiento"
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold mt-0.5 transition-colors ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-100 text-blue-700 border border-blue-300'
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={13} /> : idx + 1}
                    </button>
                    <div className="flex-1">
                      <span className={isDone ? 'line-through text-slate-400' : ''}>
                        {cm}
                      </span>
                      {isDone && (
                        <span className="block text-[10px] text-emerald-700 font-bold mt-1 uppercase">
                          ✓ Completado por CDR Walter
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <Award size={14} className="text-amber-500" />
              <span>Haz clic en una contramedida para registrar su ejecución médica.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
