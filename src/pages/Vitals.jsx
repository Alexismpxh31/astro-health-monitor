import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { VitalCard } from '../components/VitalCard.jsx';
import { TelemetryChart } from '../components/TelemetryChart.jsx';
import { simulator } from '../data/simulator.js';
import { NASA_INDICATORS_MAP } from '../data/nasaHrpData.js';
import { db } from '../db/db.js';
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
  const { t } = useTranslation();
  const [vitals, setVitals] = useState(simulator.state);
  const [history, setHistory] = useState(simulator.history);
  const [selectedCode, setSelectedCode] = useState('HR');
  const [isRunning, setIsRunning] = useState(simulator.isRunning);

  // Subscribe to simulator ticks
  useEffect(() => {
    if (!simulator.isRunning) {
      simulator.start();
      setIsRunning(true);
    }
    const unsub = simulator.subscribe((state, hist) => {
      setVitals({ ...state });
      setHistory({ ...hist });
    });
    return () => unsub();
  }, []);

  // Also query Dexie db.readings to ensure database integration
  const dbReadings = useLiveQuery(async () => {
    try {
      const all = await db.readings.orderBy('measuredAt').reverse().limit(50).toArray();
      const map = {};
      all.forEach((r) => {
        if (!map[r.indicatorCode]) {
          map[r.indicatorCode] = r.value;
        }
      });
      return map;
    } catch {
      return {};
    }
  }, []);

  const toggleStream = () => {
    if (isRunning) {
      simulator.stop();
      setIsRunning(false);
    } else {
      simulator.start();
      setIsRunning(true);
    }
  };

  const currentThreshold = NASA_INDICATORS_MAP[selectedCode] || NASA_INDICATORS_MAP.HR;
  
  // Use history from simulator or fallback to points
  const chartPoints = history[selectedCode] && history[selectedCode].length > 0 
    ? history[selectedCode] 
    : [
        { time: '10:00', value: currentThreshold.typical - 1 },
        { time: '10:05', value: currentThreshold.typical },
        { time: '10:10', value: currentThreshold.typical + 2 },
        { time: '10:15', value: currentThreshold.typical }
      ];

  const METRIC_TABS = [
    { code: 'HR', label: 'HR · Cardíaco' },
    { code: 'SPO2', label: 'SpO2 · Oxígeno' },
    { code: 'TSKIN', label: 'Tskin · Cutánea' },
    { code: 'RR', label: 'RR · Respiración' },
    { code: 'RAD_D', label: 'Rad · Dosímetro' },
    { code: 'SBP', label: 'SBP · Sistólica' }
  ];

  // Resolve current values preferring Dexie / live simulator
  const hrVal = dbReadings?.HR ?? vitals.HR ?? 72;
  const spo2Val = dbReadings?.SPO2 ?? vitals.SPO2 ?? 98;
  const tskinVal = dbReadings?.TSKIN ?? vitals.TSKIN ?? 36.6;
  const rrVal = dbReadings?.RR ?? vitals.RR ?? 14;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Flight Deck Header with Stream Control & Hackathon Anomaly Injections */}
      <div 
        style={{
          padding: '22px 26px',
          borderRadius: '20px',
          background: '#FFFFFF',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div>
          <span 
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#0284C7',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Radio size={15} color="#0284C7" />
            TELEMETRÍA EN DIRECTO · CHALECO INTELIGENTE ASTROSKIN (ISS)
          </span>
          <h1 
            style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#0E1B3E',
              margin: '4px 0 2px 0',
              letterSpacing: '-0.02em'
            }}
          >
            Monitoreo Fisiológico en Tiempo Real
          </h1>
          <p style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', margin: 0 }}>
            Frecuencia de muestreo: 2.0s · Enlace de telemetría PWA & Dexie local (AstroHealthDB)
          </p>
        </div>

        {/* Live Demo & Anomaly Injections */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={toggleStream}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '12px',
              fontFamily: 'monospace',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: '#FFFFFF',
              background: isRunning ? '#0B57D0' : '#059669',
              boxShadow: isRunning ? '0 4px 14px rgba(11, 87, 208, 0.3)' : '0 4px 14px rgba(5, 150, 105, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            {isRunning ? <Pause size={15} /> : <Play size={15} />}
            {isRunning ? 'Pausar Telemetría' : 'Reanudar Stream'}
          </button>

          {/* Hackathon Anomaly Injector Panel */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 6px',
              borderRadius: '12px',
              background: '#F1F5F9',
              border: '1px solid #E2E8F0'
            }}
          >
            <button
              onClick={() => simulator.triggerAnomaly('hypoxia')}
              title="Disparar Hipoxia crítica en demo"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <AlertTriangle size={14} color="#DC2626" />
              Hipoxia (88%)
            </button>
            <button
              onClick={() => simulator.triggerAnomaly('tachycardia')}
              title="Disparar Taquicardia crítica en demo"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                color: '#B45309',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Heart size={14} color="#D97706" />
              Taquicardia (138)
            </button>
            <button
              onClick={() => simulator.triggerAnomaly('radiation')}
              title="Disparar Tormenta Solar SPE"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#F3E8FF',
                border: '1px solid #E9D5FF',
                color: '#7E22CE',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Flame size={14} color="#9333EA" />
              Tormenta Solar (2.5)
            </button>
            <button
              onClick={() => simulator.triggerAnomaly('reset')}
              title="Restablecer todos los valores al estado nominal"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} color="#0284C7" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Vital Cards Grid with Linear Range Indicators */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px'
        }}
      >
        <VitalCard
          code="HR"
          name="Frecuencia Cardíaca"
          value={Math.round(hrVal)}
          unit="bpm"
          level={hrVal > 130 ? 'critical' : hrVal > 95 ? 'caution' : 'normal'}
          threshold={NASA_INDICATORS_MAP.HR}
          onClick={() => setSelectedCode('HR')}
        />

        <VitalCard
          code="SPO2"
          name="Saturación de Oxígeno"
          value={Math.round(spo2Val)}
          unit="%"
          level={spo2Val < 90 ? 'critical' : spo2Val < 95 ? 'caution' : 'normal'}
          threshold={NASA_INDICATORS_MAP.SPO2}
          onClick={() => setSelectedCode('SPO2')}
        />

        <VitalCard
          code="TSKIN"
          name="Temperatura Cutánea"
          value={typeof tskinVal === 'number' ? tskinVal.toFixed(1) : tskinVal}
          unit="°C"
          level={tskinVal > 38.0 ? 'critical' : tskinVal > 37.3 ? 'caution' : 'normal'}
          threshold={NASA_INDICATORS_MAP.TSKIN}
          onClick={() => setSelectedCode('TSKIN')}
        />

        <VitalCard
          code="RR"
          name="Frecuencia Respiratoria"
          value={Math.round(rrVal)}
          unit="rpm"
          level={rrVal > 24 ? 'critical' : rrVal > 18 ? 'caution' : 'normal'}
          threshold={NASA_INDICATORS_MAP.RR}
          onClick={() => setSelectedCode('RR')}
        />
      </div>

      {/* Telemetry Chart with Aerospace Tab Selector */}
      <div 
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            {METRIC_TABS.map(({ code, label }) => {
              const isSelected = selectedCode === code;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedCode(code)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: '700',
                    border: isSelected ? '1px solid #0284C7' : '1px solid #E2E8F0',
                    background: isSelected ? '#0284C7' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#334155',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B', fontWeight: '500' }}>
            Ventana rodante en tiempo real (Dexie / Simulator stream)
          </span>
        </div>

        <TelemetryChart
          data={chartPoints}
          threshold={currentThreshold}
          unit={currentThreshold?.unit}
          title={`Telemetría Temporal · ${currentThreshold?.name} [${selectedCode}]`}
          color={selectedCode === 'SPO2' ? '#0284C7' : selectedCode === 'RAD_D' ? '#9333EA' : '#10B981'}
        />
      </div>
    </div>
  );
}
