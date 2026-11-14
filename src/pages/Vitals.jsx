import React, { useState, useEffect } from 'react';
import { VitalCard } from '../components/VitalCard.jsx';
import { TelemetryChart } from '../components/TelemetryChart.jsx';
import { simulator } from '../data/simulator.js';
import { NASA_INDICATORS_MAP } from '../data/nasaHrpData.js';
import { 
  Play, 
  Pause, 
  AlertTriangle, 
  Heart, 
  Zap, 
  RefreshCw, 
  Radio, 
  Activity,
  Flame,
  ShieldCheck
} from 'lucide-react';

export default function Vitals() {
  const [vitals, setVitals] = useState(simulator.state);
  const [history, setHistory] = useState(simulator.history);
  const [selectedCode, setSelectedCode] = useState('HR');
  const [isRunning, setIsRunning] = useState(simulator.isRunning);

  useEffect(() => {
    simulator.start(1800);
    setIsRunning(true);
    const unsub = simulator.subscribe((state, hist) => {
      setVitals({ ...state });
      setHistory({ ...hist });
    });
    return () => unsub();
  }, []);

  const toggleStream = () => {
    if (isRunning) {
      simulator.stop();
      setIsRunning(false);
    } else {
      simulator.start(1800);
      setIsRunning(true);
    }
  };

  const currentThreshold = NASA_INDICATORS_MAP[selectedCode];
  const chartPoints = history[selectedCode] || [];

  const METRIC_TABS = [
    { code: 'HR', label: 'HR · Cardíaco' },
    { code: 'SPO2', label: 'SpO2 · Oxígeno' },
    { code: 'TSKIN', label: 'Tskin · Cutánea' },
    { code: 'RR', label: 'RR · Respiración' },
    { code: 'RAD_DAILY', label: 'Rad · Dosímetro' },
    { code: 'SBP', label: 'SBP · Presión' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Flight Deck Header with Stream Control & Hackathon Anomaly Injections */}
      <div className="p-5 rounded-2xl bg-[#0E1726]/90 border border-[#1E2E48] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <Radio className="w-4 h-4 animate-pulse" />
            TELEMETRÍA EN DIRECTO · CHALECO INTELIGENTE ASTROSKIN (ISS)
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight">
            Monitoreo Fisiológico en Tiempo Real
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Frecuencia de muestreo: 1.8s · Enlace de telemetría PWA & Dexie local
          </p>
        </div>

        {/* Live Demo & Anomaly Injections */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleStream}
            className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-sm ${
              isRunning
                ? 'bg-[#14223A] border-[#1E2E48] text-slate-200 hover:border-cyan-400'
                : 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4 text-cyan-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            {isRunning ? 'Pausar Telemetría' : 'Reanudar Stream'}
          </button>

          {/* Hackathon Anomaly Injector Panel */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#070C15] border border-[#1E2E48]">
            <button
              onClick={() => simulator.triggerAnomaly('hypoxia')}
              title="Disparar Hipoxia crítica en demo"
              className="px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/60 text-red-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              Hipoxia (89%)
            </button>
            <button
              onClick={() => simulator.triggerAnomaly('tachycardia')}
              title="Disparar Taquicardia crítica en demo"
              className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/60 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all"
            >
              <Heart className="w-3.5 h-3.5 text-amber-400" />
              Taquicardia (138)
            </button>
            <button
              onClick={() => simulator.triggerAnomaly('radiation')}
              title="Disparar Tormenta de Radiación SPE"
              className="px-2.5 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/60 text-purple-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all"
            >
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              Radiación (2.15)
            </button>
            <button
              onClick={() => simulator.triggerAnomaly('reset')}
              title="Restablecer todos los valores al estado nominal"
              className="px-2 py-1.5 rounded-lg bg-[#14223A] hover:bg-slate-800 border border-[#1E2E48] text-slate-300 text-[11px] font-mono font-bold flex items-center gap-1 transition-all"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Vital Cards Grid with Linear Range Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <VitalCard
          code="HR"
          name="Frecuencia Cardíaca"
          value={vitals.HR}
          unit="bpm"
          level={vitals.HR > 130 ? 'critical' : vitals.HR > 95 ? 'caution' : 'normal'}
          threshold={NASA_INDICATORS_MAP.HR}
          onClick={() => setSelectedCode('HR')}
        />

        <VitalCard
          code="SPO2"
          name="Saturación de Oxígeno"
          value={vitals.SPO2}
          unit="%"
          level={vitals.SPO2 < 90 ? 'critical' : vitals.SPO2 < 95 ? 'caution' : 'normal'}
          threshold={NASA_INDICATORS_MAP.SPO2}
          onClick={() => setSelectedCode('SPO2')}
        />

        <VitalCard
          code="TSKIN"
          name="Temperatura Cutánea"
          value={vitals.TSKIN}
          unit="°C"
          level={vitals.TSKIN > 38.0 ? 'critical' : vitals.TSKIN > 37.3 ? 'caution' : 'normal'}
          threshold={NASA_INDICATORS_MAP.TSKIN}
          onClick={() => setSelectedCode('TSKIN')}
        />

        <VitalCard
          code="RR"
          name="Frecuencia Respiratoria"
          value={vitals.RR}
          unit="rpm"
          level={vitals.RR > 24 ? 'critical' : vitals.RR > 18 ? 'caution' : 'normal'}
          threshold={NASA_INDICATORS_MAP.RR}
          onClick={() => setSelectedCode('RR')}
        />
      </div>

      {/* Telemetry Chart with Aerospace Tab Selector */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {METRIC_TABS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setSelectedCode(code)}
                className={`min-h-[42px] px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedCode === code
                    ? 'bg-cyan-400 text-[#070C15] shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                    : 'bg-[#0E1726] border border-[#1E2E48] text-slate-300 hover:text-white hover:border-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-slate-400">
            Ventana rodante en tiempo real (últimos 30 puntos)
          </span>
        </div>

        <TelemetryChart
          data={chartPoints}
          threshold={currentThreshold}
          unit={currentThreshold?.unit}
          title={`Telemetría Temporal · ${currentThreshold?.name} [${selectedCode}]`}
          color={selectedCode === 'SPO2' ? '#3B82F6' : selectedCode === 'RAD_DAILY' ? '#A855F7' : '#22D3EE'}
        />
      </div>
    </div>
  );
}
