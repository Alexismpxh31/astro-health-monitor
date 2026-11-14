import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Heart, 
  Brain, 
  Activity, 
  Radio, 
  Shield, 
  Thermometer, 
  Wind, 
  ChevronRight,
  ShieldAlert,
  Flame,
  CheckCircle2
} from 'lucide-react';
import AstronautModel3D from '../components/AstronautModel3D';
import { db } from '../db/db.js';

const ZONE_MAP = {
  cardiovascular: 'cardio',
  cns: 'neuro',
  musculoskeletal: 'musculo',
  radiation: 'radiation',
  immune: 'metabolic'
};

const REVERSE_ZONE_MAP = {
  cardio: 'cardiovascular',
  neuro: 'cns',
  musculo: 'musculoskeletal',
  radiation: 'radiation',
  metabolic: 'immune'
};

const SUBSYSTEMS = [
  {
    id: 'cardiovascular',
    name: 'Cardiovascular',
    fullName: 'Sistema Cardiovascular & Fluidos',
    statusLabel: 'Normal',
    statusColor: '#10B981',
    statusBg: 'rgba(16, 185, 129, 0.12)',
    icon: Heart,
    hazard: 'Gravity Fields / Microgravedad',
    risk: 'Risk of Cardiovascular Adaptations & Orthostatic Intolerance',
    description: 'Monitoreo de frecuencia cardíaca, redistribución de volumen cardíaco y oxigenación celular por cambio de posición.',
    tag: 'NOMINAL'
  },
  {
    id: 'cns',
    name: 'Neurocognitivo',
    fullName: 'Sistema Nervioso Central & Sueño (PVT)',
    statusLabel: 'Óptimo',
    statusColor: '#10B981',
    statusBg: 'rgba(16, 185, 129, 0.12)',
    icon: Brain,
    hazard: 'Isolation and Confinement',
    risk: 'Risk of Adverse Cognitive/Behavioral Changes & Sleep Deficit',
    description: 'Vigilancia psicomotora (PVT), calidad circadiana del sueño y fatiga acumulada en cabina presurizada.',
    tag: 'ÓPTIMO'
  },
  {
    id: 'musculoskeletal',
    name: 'Óseo-Muscular',
    fullName: 'Sistema Óseo-Muscular & Carga ARED',
    statusLabel: 'Estable',
    statusColor: '#2563EB',
    statusBg: 'rgba(37, 99, 235, 0.12)',
    icon: Activity,
    hazard: 'Gravity Fields (Descarga mecánica)',
    risk: 'Risk of Early Onset Osteopenia & Muscle Atrophy',
    description: 'Monitoreo de densidad mineral ósea y atrofia muscular en microgravedad. Régimen de contramedida ARED.',
    tag: 'ESTABLE'
  },
  {
    id: 'radiation',
    name: 'Radiación',
    fullName: 'Exposición a Radiación Cósmica (GCR/SPE)',
    statusLabel: 'Controlado',
    statusColor: '#059669',
    statusBg: 'rgba(16, 185, 129, 0.12)',
    icon: Radio,
    hazard: 'Space Radiation (Iones HZE / Protones)',
    risk: 'Risk of Radiation Carcinogenesis & CNS Damage',
    description: 'Dosimetría activa de rayos cósmicos galácticos y monitoreo preventivo de eventos de partículas solares.',
    tag: 'CONTROLADO'
  },
  {
    id: 'immune',
    name: 'Inmune & SANS',
    fullName: 'Inmunidad, Infección & SANS',
    statusLabel: 'Normal',
    statusColor: '#10B981',
    statusBg: 'rgba(16, 185, 129, 0.12)',
    icon: Shield,
    hazard: 'Hostile / Closed Environment & SANS',
    risk: 'Risk of Altered Immune System Responses & Vision Impairment',
    description: 'Evaluación de biomarcadores inflamatorios en saliva y ecografía del nervio óptico para síndrome neuro-ocular.',
    tag: 'NORMAL'
  }
];

export default function Home() {
  const [selectedId, setSelectedId] = useState('cardiovascular');
  const navigate = useNavigate();

  // Live queries to Dexie for readings (if simulator is active or readings exist)
  const latestReadings = useLiveQuery(async () => {
    try {
      const all = await db.readings.toArray();
      const map = {};
      all.forEach((r) => {
        if (!map[r.indicatorCode] || new Date(r.measuredAt) > new Date(map[r.indicatorCode].measuredAt)) {
          map[r.indicatorCode] = r;
        }
      });
      return map;
    } catch {
      return {};
    }
  }, []);

  const bpText = latestReadings?.SBP && latestReadings?.DBP 
    ? `MET ${Math.round(latestReadings.SBP.value)}/${Math.round(latestReadings.DBP.value)} mmHg`
    : 'MET 142/88 mmHg';

  const spo2Val = latestReadings?.SPO2 ? Math.round(latestReadings.SPO2.value) : 94;
  const radVal = latestReadings?.RAD_D ? `${latestReadings.RAD_D.value.toFixed(2)} mSv/d` : '0.35 mSv/d';

  const activeSystem = SUBSYSTEMS.find(s => s.id === selectedId) || SUBSYSTEMS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      
      {/* 1. Top 3 Metric Cards Strip */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '20px'
        }}
      >
        {/* Card 1: Presión Arterial */}
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '22px',
            border: '1px solid rgba(220, 230, 245, 0.85)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#EBF3FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#185EE0',
                flexShrink: 0
              }}
            >
              <Heart size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500', marginBottom: '2px' }}>
                Presión Arterial
              </div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#0E1B3E', letterSpacing: '-0.02em' }}>
                {bpText}
              </div>
            </div>
          </div>

          {/* ECG Pulse Waveform Graphic */}
          <div style={{ width: '64px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="60" height="28" viewBox="0 0 60 28" fill="none">
              <path 
                d="M 2 14 L 14 14 L 18 6 L 24 22 L 28 10 L 32 18 L 36 14 L 58 14" 
                stroke="#185EE0" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Oxígeno en Sangre */}
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '22px',
            border: '1px solid rgba(220, 230, 245, 0.85)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#EBF3FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#185EE0',
                flexShrink: 0
              }}
            >
              <Wind size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500', marginBottom: '2px' }}>
                Oxígeno en Sangre
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0E1B3E' }}>
                <span style={{ color: '#059669', marginRight: '5px' }}>NOMINAL</span>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>
                  (índice {spo2Val}/100)
                </span>
              </div>
            </div>
          </div>

          {/* Circular Progress Ring (94%) */}
          <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
            <svg width="38" height="38" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="3.2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#0284C7"
                strokeWidth="3.4"
                strokeDasharray={`${spo2Val}, 100`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Temperatura Corporal / Dosimetría */}
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '22px',
            border: '1px solid rgba(220, 230, 245, 0.85)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#EBF3FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#185EE0',
                flexShrink: 0
              }}
            >
              <Thermometer size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500', marginBottom: '2px' }}>
                Temperatura Corporal
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0E1B3E' }}>
                {radVal}{' '}
                <span style={{ fontSize: '13px', color: '#059669', fontWeight: '600' }}>
                  (Seguro)
                </span>
              </div>
            </div>
          </div>

          {/* Circular Progress Ring (Dosimetry Safe Range) */}
          <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
            <svg width="38" height="38" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="3.2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3.4"
                strokeDasharray="42, 100"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 2. Main 3-Column Interactive Bio-HUD Grid */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr 340px',
          gap: '20px',
          alignItems: 'stretch'
        }}
      >
        {/* Left Column: Subsistemas Anatómicos de Monitoreo */}
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Card Title with vertical blue accent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '3px', height: '18px', background: '#0284C7', borderRadius: '2px' }} />
            <h2 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0E1B3E', margin: 0 }}>
              Subsistemas Anatómicos de Monitoreo
            </h2>
          </div>

          {/* Subsystems List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {SUBSYSTEMS.map((sub) => {
              const isSelected = sub.id === selectedId;
              const Icon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedId(sub.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '13px',
                    border: isSelected ? '1.5px solid #2563EB' : '1px solid #EEF2F6',
                    background: isSelected ? '#F0F6FF' : '#FAFCFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isSelected ? '#DBEAFE' : '#EDF4FC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isSelected ? '#1D4ED8' : '#2563EB'
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: isSelected ? '700' : '600', color: '#0E1B3E' }}>
                      {sub.name}
                    </span>
                  </div>

                  {/* Status Indicator Pill */}
                  <div 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: sub.statusBg,
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      color: sub.statusColor
                    }}
                  >
                    <span 
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: sub.statusColor
                      }} 
                    />
                    <span>{sub.statusLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Column: Live 3D Astronaut Model on Holographic Pedestal */}
        <div 
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '520px',
            width: '100%',
            overflow: 'visible'
          }}
        >
          <AstronautModel3D
            embedded={true}
            height="520px"
            selectedZone={ZONE_MAP[selectedId] || 'cardio'}
            onSelectZone={(zona) => {
              const mapped = REVERSE_ZONE_MAP[zona.id] || 'cardiovascular';
              setSelectedId(mapped);
            }}
          />
        </div>

        {/* Right Column: Ficha Clínica NASA */}
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '3px', height: '18px', background: '#0284C7', borderRadius: '2px' }} />
                <h2 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0E1B3E', margin: 0 }}>
                  Ficha Clínica NASA
                </h2>
              </div>

              {/* Status Badge */}
              <div 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  fontSize: '10.5px',
                  fontWeight: '700',
                  color: '#059669'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                <span>{activeSystem.tag}</span>
              </div>
            </div>

            {/* System Full Title */}
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0E1B3E', margin: '4px 0 12px 0', letterSpacing: '-0.02em' }}>
              {activeSystem.fullName}
            </h3>

            {/* Divider */}
            <div style={{ height: '1px', background: '#E2E8F0', marginBottom: '12px' }} />

            {/* Hazard Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
              <div style={{ color: '#2563EB', marginTop: '2px' }}>
                <Heart size={17} />
              </div>
              <div style={{ fontSize: '12.5px', color: '#0E1B3E', lineHeight: '1.4' }}>
                <strong style={{ fontWeight: '700' }}>Peligro HRP:</strong> {activeSystem.hazard}
              </div>
            </div>

            {/* Risk Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <div style={{ color: '#2563EB', marginTop: '2px' }}>
                <Shield size={17} />
              </div>
              <div style={{ fontSize: '12.5px', color: '#0E1B3E', lineHeight: '1.4' }}>
                <strong style={{ fontWeight: '700' }}>Riesgo Oficial:</strong> {activeSystem.risk}
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.55', margin: 0 }}>
              {activeSystem.description}
            </p>
          </div>

          {/* Royal Blue Action Button */}
          <button
            onClick={() => navigate(`/system/${activeSystem.id}`)}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '14px',
              background: '#0B4CD6',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '13px',
              fontFamily: 'sans-serif',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(11, 76, 214, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Confirmar Selección de Zona</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
