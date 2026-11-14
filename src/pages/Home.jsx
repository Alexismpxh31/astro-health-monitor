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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* 1. Top 3 Metric Cards Strip */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '18px'
        }}
      >
        {/* Card 1: Presión Arterial */}
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB'
              }}
            >
              <Heart size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>
                Presión Arterial
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0E1B3E', letterSpacing: '-0.02em' }}>
                MET 142/88 <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>mmHg</span>
              </div>
            </div>
          </div>

          {/* SVG ECG Line */}
          <div style={{ width: '80px', height: '36px' }}>
            <svg viewBox="0 0 80 36" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <path
                d="M 0 18 L 22 18 L 27 6 L 33 30 L 39 12 L 44 22 L 48 18 L 80 18"
                fill="none"
                stroke="#2563EB"
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
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB'
              }}
            >
              <Wind size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>
                Oxígeno en Sangre
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#10B981', letterSpacing: '-0.01em' }}>
                NOMINAL <span style={{ fontSize: '12px', fontWeight: '500', color: '#0E1B3E' }}>(índice 94/100)</span>
              </div>
            </div>
          </div>

          {/* Circular Gauge ~94% */}
          <div style={{ width: '44px', height: '44px', position: 'relative' }}>
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
                stroke="#0284C7"
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
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB'
              }}
            >
              <Thermometer size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>
                Temperatura Corporal
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0E1B3E', letterSpacing: '-0.02em' }}>
                0.35 <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>mSv/d (Seguro)</span>
              </div>
            </div>
          </div>

          {/* Circular Gauge ~35% */}
          <div style={{ width: '44px', height: '44px', position: 'relative' }}>
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
          gridTemplateColumns: '1.05fr 1fr 1.05fr',
          gap: '22px',
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

        {/* Center Column: Astronaut Model on Holographic Pedestal */}
        <div 
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '380px'
          }}
        >
          {/* Concentric Glow Rings in background */}
          <div 
            style={{
              position: 'absolute',
              bottom: '10px',
              width: '260px',
              height: '90px',
              background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.3) 0%, rgba(59, 130, 246, 0.15) 45%, transparent 70%)',
              pointerEvents: 'none'
            }} 
          />

          {/* Full-body Astronaut with Pedestal */}
          <img 
            src="/astronaut_blended.png"
            alt="Astronauta Artemis xEMU"
            style={{
              maxHeight: '410px',
              width: 'auto',
              objectFit: 'contain',
              zIndex: 5,
              filter: 'drop-shadow(0 15px 25px rgba(11, 27, 61, 0.12))'
            }}
          />

          {/* Interactive Biological Target Hotspots */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
            {/* Head (Neurocognitivo) */}
            <div 
              onClick={() => setSelectedId('cns')}
              title="Sistema Neurocognitivo"
              style={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '36px',
                height: '36px',
                pointerEvents: 'auto',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {selectedId === 'cns' && (
                <div style={{
                  position: 'absolute',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '2px solid #3B82F6',
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.6)'
                }} className="sonar-ring" />
              )}
            </div>

            {/* Chest (Cardiovascular) */}
            <div 
              onClick={() => setSelectedId('cardiovascular')}
              title="Sistema Cardiovascular"
              style={{
                position: 'absolute',
                top: '36%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '40px',
                height: '40px',
                pointerEvents: 'auto',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {selectedId === 'cardiovascular' && (
                <div style={{
                  position: 'absolute',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #2563EB',
                  boxShadow: '0 0 12px rgba(37, 99, 235, 0.6)'
                }} className="sonar-ring" />
              )}
            </div>

            {/* Pelvis/Legs (Óseo-Muscular) */}
            <div 
              onClick={() => setSelectedId('musculoskeletal')}
              title="Sistema Óseo-Muscular"
              style={{
                position: 'absolute',
                top: '65%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '50px',
                height: '50px',
                pointerEvents: 'auto',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {selectedId === 'musculoskeletal' && (
                <div style={{
                  position: 'absolute',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '2px solid #10B981',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)'
                }} className="sonar-ring" />
              )}
            </div>

            {/* Right Shoulder (Dosímetro Radiación) */}
            <div 
              onClick={() => setSelectedId('radiation')}
              title="Dosímetro de Radiación"
              style={{
                position: 'absolute',
                top: '30%',
                left: '59%',
                transform: 'translate(-50%, -50%)',
                width: '30px',
                height: '30px',
                pointerEvents: 'auto',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {selectedId === 'radiation' && (
                <div style={{
                  position: 'absolute',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '2px solid #059669',
                  boxShadow: '0 0 12px rgba(5, 150, 105, 0.6)'
                }} className="sonar-ring" />
              )}
            </div>
          </div>
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
