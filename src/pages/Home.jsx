import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Flame
} from 'lucide-react';
import AstronautModel3D from '../components/AstronautModel3D';

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

  const activeSystem = SUBSYSTEMS.find(s => s.id === selectedId) || SUBSYSTEMS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      
      {/* 1. Top 3 Metric Cards Strip (Aligned 1:1 with the 3 columns below) */}
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
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0E1B3E', letterSpacing: '-0.02em' }}>
                MET 142/88 <span style={{ fontSize: '12.5px', fontWeight: '500', color: '#64748B' }}>mmHg</span>
              </div>
            </div>
          </div>

          {/* SVG ECG Line */}
          <div style={{ width: '84px', height: '36px', flexShrink: 0 }}>
            <svg viewBox="0 0 84 36" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <path
                d="M 0 18 L 22 18 L 27 6 L 33 30 L 39 12 L 44 22 L 48 18 L 84 18"
                fill="none"
                stroke="#185EE0"
                strokeWidth="2.5"
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
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669', letterSpacing: '-0.01em' }}>
                NOMINAL <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0E1B3E' }}>(índice 94/100)</span>
              </div>
            </div>
          </div>

          {/* Circular Gauge ~94% */}
          <div style={{ width: '44px', height: '44px', position: 'relative', flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#185EE0"
                strokeWidth="3.5"
                strokeDasharray="94.2"
                strokeDashoffset="12"
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
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0E1B3E', letterSpacing: '-0.02em' }}>
                0.35 <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>mSv/d (Seguro)</span>
              </div>
            </div>
          </div>

          {/* Circular Gauge ~35% */}
          <div style={{ width: '44px', height: '44px', position: 'relative', flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="3.5"
                strokeDasharray="94.2"
                strokeDashoffset="62"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 2. Main 3-Column Section */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
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
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '3px', height: '18px', background: '#0284C7', borderRadius: '2px' }} />
            <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0E1B3E', margin: 0 }}>
              Subsistemas Anatómicos de Monitoreo
            </h2>
          </div>

          {/* List of 5 Subsystems */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {SUBSYSTEMS.map((sys) => {
              const isSelected = sys.id === selectedId;
              const Icon = sys.icon;
              return (
                <div
                  key={sys.id}
                  data-testid={`system-row-${sys.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(sys.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(sys.id); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    borderRadius: '14px',
                    background: isSelected ? '#EFF6FF' : '#F8FAFC',
                    border: isSelected ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 10px rgba(59, 130, 246, 0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: isSelected ? '#DBEAFE' : 'rgba(37, 99, 235, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isSelected ? '#1D4ED8' : '#2563EB'
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0E1B3E' }}>
                      {sys.name}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: sys.statusBg,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: sys.statusColor
                    }}
                  >
                    <span 
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: sys.statusColor
                      }} 
                    />
                    <span>{sys.statusLabel}</span>
                  </div>
                </div>
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
              console.log('Zona seleccionada:', zona.id, zona.value);
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
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '3px', height: '18px', background: '#0284C7', borderRadius: '2px' }} />
                <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0E1B3E', margin: 0 }}>
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
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#059669'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                <span>{activeSystem.tag}</span>
              </div>
            </div>

            {/* System Full Title */}
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0E1B3E', margin: '4px 0 16px 0', letterSpacing: '-0.02em' }}>
              {activeSystem.fullName}
            </h3>

            {/* Divider */}
            <div style={{ height: '1px', background: '#E2E8F0', marginBottom: '16px' }} />

            {/* Hazard Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <div style={{ color: '#2563EB', marginTop: '2px' }}>
                <Heart size={18} />
              </div>
              <div style={{ fontSize: '13px', color: '#0E1B3E', lineHeight: '1.4' }}>
                <strong style={{ fontWeight: '700' }}>Peligro HRP:</strong> {activeSystem.hazard}
              </div>
            </div>

            {/* Risk Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px' }}>
              <div style={{ color: '#2563EB', marginTop: '2px' }}>
                <Shield size={18} />
              </div>
              <div style={{ fontSize: '13px', color: '#0E1B3E', lineHeight: '1.4' }}>
                <strong style={{ fontWeight: '700' }}>Riesgo Oficial:</strong> {activeSystem.risk}
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>
              {activeSystem.description}
            </p>
          </div>

          {/* Royal Blue Action Button */}
          <button
            onClick={() => navigate(`/system/${activeSystem.id}`)}
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: '14px',
              background: '#0B4CD6',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '13.5px',
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
