import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { NASA_HRP_SYSTEMS, NASA_INDICATORS_MAP } from '../data/nasaHrpData.js';
import { TelemetryChart } from '../components/TelemetryChart.jsx';
import { TrafficLight } from '../components/TrafficLight.jsx';
import { db } from '../db/db.js';
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
  const primaryIndicatorCode = system.indicators?.[0] || 'HR';
  const primaryIndicator = NASA_INDICATORS_MAP[primaryIndicatorCode] || NASA_INDICATORS_MAP.HR;

  // Query live readings from Dexie
  const liveReadings = useLiveQuery(async () => {
    try {
      const rows = await db.readings
        .where('indicatorCode')
        .equals(primaryIndicatorCode)
        .reverse()
        .limit(15)
        .toArray();
      return rows.reverse().map(r => ({
        time: new Date(r.measuredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        value: r.value
      }));
    } catch {
      return [];
    }
  }, [primaryIndicatorCode]);

  // Fallback points if no live readings yet
  const historyData = liveReadings && liveReadings.length > 0 ? liveReadings : [
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

    if (!completedActions[`${activeSystemId}-${index}`]) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#0284C7', '#10B981', '#F59E0B']
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Top Navigation Back & Health Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: '700',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)'
          }}
        >
          <ArrowLeft size={16} color="#0284C7" />
          Volver a Bio-HUD Anatómico
        </button>

        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#FFFFFF',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
          }}
        >
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B', fontWeight: '700' }}>
            ESTADO CLÍNICO:
          </span>
          <TrafficLight level="normal" size="md" />
        </div>
      </div>

      {/* Subsystem Switcher Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        {NASA_HRP_SYSTEMS.map(s => {
          const isActive = s.id === activeSystemId;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSystemId(s.id)}
              style={{
                padding: '9px 18px',
                borderRadius: '12px',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: '700',
                border: isActive ? '1px solid #0284C7' : '1px solid #E2E8F0',
                background: isActive ? '#0284C7' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#334155',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 12px rgba(2, 132, 199, 0.25)' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* System Technical Sheet */}
      <div 
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span 
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#0284C7',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Flame size={15} color="#0284C7" />
            PELIGRO NASA ASOCIADO: {system.hazard}
          </span>
          <span 
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1D4ED8',
              fontWeight: '700'
            }}
          >
            MARCO RIDGE NASA
          </span>
        </div>

        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0E1B3E', margin: '2px 0', letterSpacing: '-0.02em' }}>
            {system.name}
          </h1>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#475569', fontWeight: '600', display: 'block', marginTop: '2px' }}>
            {system.riskName}
          </span>
        </div>

        <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0, maxWidth: '1000px' }}>
          {system.description}
        </p>

        {/* Research Protocol Badge */}
        <div 
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Info size={16} color="#0284C7" />
          <span>
            <strong>Protocolo de Investigación Activo:</strong> {system.researchProtocol}
          </span>
        </div>
      </div>

      {/* Two-Column Grid: Telemetry Trends & Clinical Countermeasures */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px'
        }}
      >
        {/* Left: Trend Chart & Limits Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div 
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
              padding: '20px'
            }}
          >
            <TelemetryChart
              data={historyData}
              threshold={primaryIndicator}
              unit={primaryIndicator.unit}
              title={`Tendencia Histórica · ${primaryIndicator.name} (${primaryIndicator.code})`}
              color="#0B57D0"
            />
          </div>

          {/* NASA Limits Matrix */}
          <div 
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
              padding: '20px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}
          >
            <h4 style={{ color: '#0E1B3E', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px 0', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color="#0284C7" />
              Límites Clínicos NASA HRP ({primaryIndicator.code})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div style={{ padding: '12px 8px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <span style={{ display: 'block', fontSize: '10px', color: '#DC2626', fontWeight: '700', textTransform: 'uppercase' }}>
                  CRÍTICO BAJO
                </span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#B91C1C' }}>
                  &lt; {primaryIndicator.minCritical} {primaryIndicator.unit}
                </span>
              </div>
              <div style={{ padding: '12px 8px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <span style={{ display: 'block', fontSize: '10px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>
                  RANGO NOMINAL
                </span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#065F46' }}>
                  {primaryIndicator.minNormal} - {primaryIndicator.maxNormal} {primaryIndicator.unit}
                </span>
              </div>
              <div style={{ padding: '12px 8px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <span style={{ display: 'block', fontSize: '10px', color: '#DC2626', fontWeight: '700', textTransform: 'uppercase' }}>
                  CRÍTICO ALTO
                </span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#B91C1C' }}>
                  &gt; {primaryIndicator.maxCritical} {primaryIndicator.unit}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Prescribed NASA Countermeasures */}
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
          <div>
            <h3 style={{ fontSize: '14px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0E1B3E', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', margin: 0 }}>
              <ClipboardList size={16} color="#0284C7" />
              Contramedidas Clínicas Prescritas (HRP)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', margin: '6px 0 0 0' }}>
              Acciones obligatorias validadas por los estudios CIPHER y Standard Measures para mitigar este riesgo:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {system.countermeasures?.map((cm, idx) => {
              const isDone = !!completedActions[`${activeSystemId}-${idx}`];
              return (
                <div
                  key={idx}
                  onClick={() => handleCompleteCountermeasure(idx)}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: isDone ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                    background: isDone ? '#F0FDF4' : '#F8FAFC',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    lineHeight: '1.5',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <button
                    type="button"
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '11px',
                      fontWeight: '800',
                      marginTop: '2px',
                      border: isDone ? 'none' : '1px solid #93C5FD',
                      background: isDone ? '#10B981' : '#DBEAFE',
                      color: isDone ? '#FFFFFF' : '#1E40AF',
                      cursor: 'pointer'
                    }}
                  >
                    {isDone ? <CheckCircle2 size={14} color="#FFFFFF" /> : idx + 1}
                  </button>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: isDone ? '#94A3B8' : '#334155', textDecoration: isDone ? 'line-through' : 'none' }}>
                      {cm}
                    </span>
                    {isDone && (
                      <span style={{ display: 'block', fontSize: '10px', color: '#059669', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' }}>
                        ✓ Completado por CDR Walter
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div 
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#64748B'
            }}
          >
            <Award size={15} color="#D97706" />
            <span>Haz clic en una contramedida para registrar su ejecución médica.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
