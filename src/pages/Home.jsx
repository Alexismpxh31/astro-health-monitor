import React, { useState, useEffect } from 'react';
import { BodyModel } from '../components/BodyModel';
import { TrafficLight } from '../components/TrafficLight';
import { VitalCard } from '../components/VitalCard';
import { simulator } from '../data/simulator';
import { NASA_HRP_SYSTEMS, NASA_INDICATORS_MAP, CLINICAL_RECOMMENDATIONS } from '../data/nasaHrpData';
import { Layers, Activity, ShieldAlert, CheckCircle2, BellRing, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const Home = ({ onNavigate = () => {} }) => {
  const [vitals, setVitals] = useState(simulator.state);
  const [activeAlert, setActiveAlert] = useState(null);

  useEffect(() => {
    simulator.start(1800);
    const unsub = simulator.subscribe((state) => {
      setVitals({ ...state });

      // Determine active critical alert if any
      if (state.SPO2 < 90) {
        setActiveAlert(CLINICAL_RECOMMENDATIONS.SPO2_CRITICAL_LOW);
      } else if (state.HR > 130) {
        setActiveAlert(CLINICAL_RECOMMENDATIONS.HR_CRITICAL_HIGH);
      } else if (state.RAD_DAILY > 1.8) {
        setActiveAlert(CLINICAL_RECOMMENDATIONS.RAD_CRITICAL_HIGH);
      } else if (state.SBP > 130) {
        setActiveAlert(CLINICAL_RECOMMENDATIONS.SBP_CAUTION_HIGH);
      } else if (state.PVT > 300) {
        setActiveAlert(CLINICAL_RECOMMENDATIONS.PVT_CAUTION_HIGH);
      } else {
        setActiveAlert(null);
      }
    });
    return () => unsub();
  }, []);

  // Compute status per subsystem
  const systemStatuses = {
    cardiovascular: vitals.SPO2 < 90 || vitals.HR > 130 ? 'critical' : vitals.HR > 95 || vitals.SPO2 < 95 ? 'caution' : 'normal',
    musculoskeletal: vitals.BMD < -3.0 ? 'caution' : 'normal',
    radiation: vitals.RAD_DAILY > 1.8 ? 'critical' : vitals.RAD_DAILY > 0.8 ? 'caution' : 'normal',
    behavioral: vitals.PVT > 320 ? 'caution' : 'normal',
    immune: vitals.WBC < 4.0 || vitals.IL6 > 5.0 ? 'caution' : 'normal'
  };

  const overallStatus = Object.values(systemStatuses).includes('critical')
    ? 'critical'
    : Object.values(systemStatuses).includes('caution')
    ? 'caution'
    : 'normal';

  const handleResolveAlert = () => {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#22D3EE', '#22C55E', '#3B82F6']
    });
    simulator.triggerAnomaly('reset');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-space-surface/90 border border-space-border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-space-cyan uppercase tracking-widest">
              TELEMETRÍA EN VUELO · ARTEMIS BASE ALPHA
            </span>
            <span className="text-space-muted">·</span>
            <span className="text-xs font-mono text-space-muted">
              Tripulante Walter C. (Ingeniero de Vuelo)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-white mt-1 flex items-center gap-3">
            Estado Sistémico General: <TrafficLight level={overallStatus} size="lg" />
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/vitals')}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-space-cyan text-space-bg font-mono font-bold text-xs tracking-wider uppercase hover:bg-cyan-300 transition-all shadow-glow-cyan flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            TELEMETRÍA EN VIVO (VITALS)
          </button>
        </div>
      </div>

      {/* Critical Active Alert Bar (if present) */}
      {activeAlert && (
        <div className="p-5 rounded-2xl bg-red-950/40 border-2 border-red-500 shadow-glow-red animate-pulse-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded">
                  ALERTA MÉDICA NASA
                </span>
                <span className="text-sm font-bold text-white">
                  {activeAlert.title}
                </span>
              </div>
              <p className="text-xs text-red-200 mt-1 font-mono leading-relaxed max-w-2xl">
                <strong>Protocolo de Contramedida Requerido:</strong> {activeAlert.action}
              </p>
            </div>
          </div>

          <button
            onClick={handleResolveAlert}
            className="min-h-[48px] px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-space-bg font-mono font-bold text-xs tracking-wider uppercase shadow-lg transition-transform active:scale-95 flex items-center gap-2 self-start sm:self-center"
          >
            <CheckCircle2 className="w-4 h-4" />
            Marcar Acción Realizada (Hecho)
          </button>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 5 NASA HRP Systems */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-mono tracking-wider uppercase text-space-muted flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-space-cyan" />
              Peligros NASA (HRP Systems)
            </h2>
            <span className="text-[11px] font-mono text-space-muted">5 Subsistemas</span>
          </div>

          <div className="space-y-2.5">
            {NASA_HRP_SYSTEMS.map(sys => {
              const status = systemStatuses[sys.id] || 'normal';
              return (
                <div
                  key={sys.id}
                  onClick={() => onNavigate(`/system/${sys.id}`)}
                  className="p-3.5 rounded-xl border border-space-border bg-space-surface/80 hover:bg-space-card hover:border-space-cyan/50 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-space-cyan transition-colors">
                      {sys.name}
                    </h3>
                    <p className="text-[11px] font-mono text-space-muted truncate max-w-[210px]">
                      {sys.riskName}
                    </p>
                  </div>
                  <TrafficLight level={status} size="sm" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Interactive Holographic Body Model */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <BodyModel
            systemStatuses={systemStatuses}
            onSelectSystem={id => onNavigate(`/system/${id}`)}
          />
        </div>

        {/* Right: Key Vital Cards Snapshot */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-mono tracking-wider uppercase text-space-muted flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-space-cyan" />
              Telemetría Astroskin
            </h2>
            <span className="text-[11px] font-mono text-status-normal">En directo</span>
          </div>

          <div className="space-y-3">
            <VitalCard
              code="HR"
              name="Frecuencia Cardíaca"
              value={vitals.HR}
              unit="bpm"
              level={vitals.HR > 130 ? 'critical' : vitals.HR > 95 ? 'caution' : 'normal'}
              threshold={NASA_INDICATORS_MAP.HR}
              onClick={() => onNavigate('/system/cardiovascular')}
            />

            <VitalCard
              code="SPO2"
              name="Saturación de Oxígeno"
              value={vitals.SPO2}
              unit="%"
              level={vitals.SPO2 < 90 ? 'critical' : vitals.SPO2 < 95 ? 'caution' : 'normal'}
              threshold={NASA_INDICATORS_MAP.SPO2}
              onClick={() => onNavigate('/system/cardiovascular')}
            />

            <VitalCard
              code="RAD_DAILY"
              name="Dosis Radiación"
              value={vitals.RAD_DAILY}
              unit="mSv/d"
              level={vitals.RAD_DAILY > 1.8 ? 'critical' : vitals.RAD_DAILY > 0.8 ? 'caution' : 'normal'}
              threshold={NASA_INDICATORS_MAP.RAD_DAILY}
              onClick={() => onNavigate('/system/radiation')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
