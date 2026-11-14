import React, { useState, useEffect } from 'react';
import { VitalCard } from '../components/VitalCard.jsx';
import { TelemetryChart } from '../components/TelemetryChart.jsx';
import { simulator } from '../data/simulator.js';
import { NASA_INDICATORS_MAP } from '../data/nasaHrpData.js';
import { Play, Pause, AlertTriangle, Heart, Zap, RefreshCw, Radio } from 'lucide-react';

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header with Simulator Control and Hackathon Demo Anomaly Injectors */}
      <div className="bg-space-surface/90 border border-space-border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-space-cyan uppercase tracking-widest flex items-center gap-1.5">
            <Radio className="w-4 h-4" />
            TELEMETRÍA EN VIVO · CHALECO ASTROSKIN ISS
          </span>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-white mt-1">
            Signos Vitales y Flujo Fisiológico
          </h1>
        </div>

        {/* Live Demo Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={toggleStream}
            className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              isRunning
                ? 'bg-space-card border-space-border text-space-text hover:border-space-cyan'
                : 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4 text-space-cyan" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Pausar Telemetría' : 'Reanudar'}
          </button>

          {/* Hackathon Demo Anomaly Injection Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-space-bg border border-space-border">
            <button
              onClick={() => simulator.triggerAnomaly('hypoxia')}
              title="Disparar Hipoxia crítica en demo"
              className="px-2.5 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900 border border-red-500/70 text-red-300 text-[11px] font-mono flex items-center gap-1 transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Hypoxia (89% SpO2)
            </button>
            <button
              onClick={() => simulator.triggerAnomaly('tachycardia')}
              title="Disparar Taquicardia crítica en demo"
              className="px-2.5 py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900 border border-amber-500/70 text-amber-300 text-[11px] font-mono flex items-center gap-1 transition-all"
            >
              <Heart className="w-3.5 h-3.5" />
              Taquicardia (138 bpm)
            </button>
            <button
              onClick={() => simulator.triggerAnomaly('radiation')}
              title="Disparar Evento de Protones Solares"
              className="px-2.5 py-1.5 rounded-lg bg-purple-950/50 hover:bg-purple-900 border border-purple-500/70 text-purple-300 text-[11px] font-mono flex items-center gap-1 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              Radiación (2.15 mSv)
            </button>
            <button
              onClick={() => simulator.triggerAnomaly('reset')}
              title="Restablecer a valores normales"
              className="px-2 py-1.5 rounded-lg bg-space-card hover:bg-space-hover border border-space-border text-space-muted hover:text-white text-[11px] font-mono flex items-center gap-1 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Vital Cards Grid */}
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
          level={vitals.TSKIN > 38.0 ? 'critical' : 'normal'}
          threshold={NASA_INDICATORS_MAP.TSKIN}
          onClick={() => setSelectedCode('TSKIN')}
        />

        <VitalCard
          code="RR"
          name="Frecuencia Respiratoria"
          value={vitals.RR}
          unit="rpm"
          level={vitals.RR > 24 ? 'critical' : 'normal'}
          threshold={NASA_INDICATORS_MAP.RR}
          onClick={() => setSelectedCode('RR')}
        />
      </div>

      {/* Dynamic Chart Section with Selector Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {['HR', 'SPO2', 'TSKIN', 'RR', 'RAD_DAILY', 'SBP'].map(code => (
              <button
                key={code}
                onClick={() => setSelectedCode(code)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  selectedCode === code
                    ? 'bg-space-cyan text-space-bg font-bold shadow-glow-cyan'
                    : 'bg-space-surface border border-space-border text-space-muted hover:text-white'
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-space-muted">
            Ventana rodante en tiempo real
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
