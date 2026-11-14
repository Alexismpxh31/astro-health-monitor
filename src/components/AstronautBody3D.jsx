import React, { useState } from 'react';
import { Activity, Shield, Brain, Heart, Radio, CheckCircle, AlertTriangle } from 'lucide-react';

const ASTRONAUT_SYSTEMS = [
  {
    id: 'cardiovascular',
    name: 'Sistema Cardiovascular & Fluidos',
    shortName: 'Cardiovascular',
    value: '74 bpm · 98% SpO2 (Nominal)',
    status: 'normal',
    hazard: 'Gravity Fields / Microgravedad',
    risk: 'Risk of Cardiovascular Adaptations & Orthostatic Intolerance',
    desc: 'Monitoreo de frecuencia cardíaca, redistribución de volemia cefálica y oxigenación celular por chaleco Astroskin.',
    icon: Heart,
    color: '#22D3EE'
  },
  {
    id: 'cns',
    name: 'Sistema Nervioso Central & Sueño (PVT)',
    shortName: 'Neurocognitivo',
    value: '232 ms de latencia (Óptimo)',
    status: 'normal',
    hazard: 'Isolation and Confinement',
    risk: 'Risk of Adverse Cognitive/Behavioral Changes & Sleep Deficit',
    desc: 'Test de vigilancia psicomotora (PVT), calidad de sueño circadiano y fatiga de vuelo en misiones de exploración.',
    icon: Brain,
    color: '#A855F7'
  },
  {
    id: 'musculoskeletal',
    name: 'Sistema Óseo-Muscular (ARED)',
    shortName: 'Óseo-Muscular',
    value: '-0.8% BMD · 96% masa magra',
    status: 'normal',
    hazard: 'Gravity Fields (Falta de carga mecánica)',
    risk: 'Risk of Early Onset Osteopenia & Muscle Atrophy',
    desc: 'Densidad mineral ósea (BMD) en fémur y columna lumbar. Régimen de 2.5h diarias en el dispositivo ARED.',
    icon: Activity,
    color: '#10B981'
  },
  {
    id: 'radiation',
    name: 'Exposición a Radiación Cósmica',
    shortName: 'Radiación',
    value: '0.35 mSv/d · 42.1 mSv acumulados',
    status: 'normal',
    hazard: 'Space Radiation (GCR / SPE)',
    risk: 'Risk of Radiation Carcinogenesis & CNS Damage',
    desc: 'Dosimetría activa de rayos cósmicos galácticos (iones HZE) y monitoreo de tormentas solares de protones.',
    icon: Radio,
    color: '#F59E0B'
  },
  {
    id: 'immune',
    name: 'Inmunidad & Ambiente Cerrado (ECLSS)',
    shortName: 'Inmune & SANS',
    value: '6.4 k/µL WBC · IL-6: 1.8 pg/mL',
    status: 'normal',
    hazard: 'Hostile / Closed Environment & SANS',
    risk: 'Risk of Altered Immune System Responses & Vision Impairment',
    desc: 'Poblaciones leucocitarias, reactivación viral por PCR en saliva y ecografía de la vaina del nervio óptico.',
    icon: Shield,
    color: '#3B82F6'
  }
];

export default function AstronautBody3D({ onSelectZone = () => {} }) {
  const [selectedId, setSelectedId] = useState('cardiovascular');
  const [rotation, setRotation] = useState({ x: 5, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const activeSystem = ASTRONAUT_SYSTEMS.find(s => s.id === selectedId) || ASTRONAUT_SYSTEMS[0];

  const handleSelect = (sys) => {
    setSelectedId(sys.id);
    onSelectZone(sys);
  };

  // Subtle 3D tilt tracking
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotation({
      x: -y * 14,
      y: x * 18
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 5, y: 0 });
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0B1220 0%, #111C31 100%)',
      borderRadius: '24px',
      border: '1px solid #23334D',
      padding: '24px',
      color: '#E2E8F0',
      boxShadow: '0 20px 40px -15px rgba(0,0,0,0.6)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background technical hologram grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(to right, rgba(35, 51, 77, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(35, 51, 77, 0.25) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'relative' }}>
        <div>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#22D3EE', letterSpacing: '2px', textTransform: 'uppercase' }}>
            NASA HRP · BIO-HUD 3D TELEMETRY
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '4px 0 0 0', color: '#FFFFFF', fontFamily: 'sans-serif' }}>
            Modelo 3D del Traje Espacial (Artemis xEMU)
          </h2>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          borderRadius: '9999px',
          padding: '4px 12px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#4ADE80'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
          TELEMETRÍA EN DIRECTO
        </div>
      </div>

      {/* Central Interactive Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center', position: 'relative' }}>
        
        {/* Left Column: Selector Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Selecciona un Subsistema Anatómico:
          </span>

          {ASTRONAUT_SYSTEMS.map((sys) => {
            const isSelected = sys.id === selectedId;
            const Icon = sys.icon;
            return (
              <button
                key={sys.id}
                onClick={() => handleSelect(sys)}
                style={{
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: isSelected ? `2px solid ${sys.color}` : '1px solid #23334D',
                  background: isSelected ? 'rgba(34, 211, 238, 0.12)' : 'rgba(21, 34, 56, 0.7)',
                  color: isSelected ? '#FFFFFF' : '#94A3B8',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 0 20px -3px ${sys.color}40` : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${sys.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: sys.color
                  }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? '#FFFFFF' : '#CBD5E1' }}>
                      {sys.shortName}
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: isSelected ? '#22D3EE' : '#64748B' }}>
                      {sys.value}
                    </div>
                  </div>
                </div>

                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isSelected ? sys.color : '#334155',
                  boxShadow: isSelected ? `0 0 10px ${sys.color}` : 'none'
                }} />
              </button>
            );
          })}
        </div>

        {/* Center: 3D Spacesuit Model Representation */}
        <div
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          style={{
            perspective: '900px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px'
          }}
        >
          <div style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s ease',
            position: 'relative',
            width: '260px',
            height: '420px',
            background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.08) 0%, transparent 70%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* SVG 3D Astronaut Spacesuit Rendering */}
            <svg viewBox="0 0 240 440" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.7))' }}>
              <defs>
                <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E2E8F0" />
                  <stop offset="60%" stopColor="#94A3B8" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
                <linearGradient id="visorGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDE047" />
                  <stop offset="40%" stopColor="#EAB308" />
                  <stop offset="100%" stopColor="#854D0E" />
                </linearGradient>
                <linearGradient id="packGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
              </defs>

              {/* Primary Life Support System (PLSS Backpack) */}
              <rect x="75" y="70" width="90" height="150" rx="14" fill="url(#packGrad)" stroke="#475569" strokeWidth="2" />
              <rect x="85" y="80" width="70" height="15" rx="4" fill="#1E293B" stroke="#334155" />

              {/* Radiation Shield Halo */}
              <g
                onClick={() => handleSelect(ASTRONAUT_SYSTEMS[3])}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx="120"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke={selectedId === 'radiation' ? '#F59E0B' : '#475569'}
                  strokeWidth={selectedId === 'radiation' ? '3' : '1.5'}
                  strokeDasharray="6 4"
                  opacity="0.8"
                />
              </g>

              {/* Helmet (CNS / Sleep System) */}
              <g
                onClick={() => handleSelect(ASTRONAUT_SYSTEMS[1])}
                style={{ cursor: 'pointer' }}
              >
                <ellipse cx="120" cy="62" rx="34" ry="32" fill="url(#suitGrad)" stroke="#CBD5E1" strokeWidth="2" />
                {/* Gold Reflective Visor */}
                <ellipse
                  cx="120"
                  cy="62"
                  rx="24"
                  ry="20"
                  fill="url(#visorGold)"
                  stroke={selectedId === 'cns' ? '#A855F7' : '#B45309'}
                  strokeWidth={selectedId === 'cns' ? '3' : '1.5'}
                  style={{ filter: selectedId === 'cns' ? 'drop-shadow(0 0 8px #A855F7)' : 'none' }}
                />
                {/* Visor Glare */}
                <path d="M 108 52 Q 120 48 130 54" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
              </g>

              {/* Upper Torso Suit (Cardiovascular System) */}
              <g
                onClick={() => handleSelect(ASTRONAUT_SYSTEMS[0])}
                style={{ cursor: 'pointer' }}
              >
                <path
                  d="M 80 98 L 160 98 L 152 170 L 88 170 Z"
                  fill="url(#suitGrad)"
                  stroke={selectedId === 'cardiovascular' ? '#22D3EE' : '#64748B'}
                  strokeWidth={selectedId === 'cardiovascular' ? '3' : '2'}
                  style={{ filter: selectedId === 'cardiovascular' ? 'drop-shadow(0 0 10px #22D3EE)' : 'none' }}
                />
                {/* Mission Patch */}
                <circle cx="102" cy="118" r="6" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1" />
                {/* NASA Meatball vector hint */}
                <path d="M 98 118 Q 102 114 106 118" stroke="#EF4444" strokeWidth="1.2" fill="none" />

                {/* Heart Rate Sensor Node */}
                <circle cx="132" cy="120" r="7" fill={selectedId === 'cardiovascular' ? '#22D3EE' : '#EF4444'} opacity="0.9" />
                <path d="M 128 122 Q 132 118 136 122" stroke="#FFFFFF" strokeWidth="1.2" fill="none" />
              </g>

              {/* Abdomen / ECLSS (Immune System) */}
              <g
                onClick={() => handleSelect(ASTRONAUT_SYSTEMS[4])}
                style={{ cursor: 'pointer' }}
              >
                <path
                  d="M 88 174 L 152 174 L 144 225 L 96 225 Z"
                  fill="#334155"
                  stroke={selectedId === 'immune' ? '#3B82F6' : '#64748B'}
                  strokeWidth={selectedId === 'immune' ? '3' : '1.5'}
                  style={{ filter: selectedId === 'immune' ? 'drop-shadow(0 0 8px #3B82F6)' : 'none' }}
                />
                {/* Bio-Umbilical port */}
                <circle cx="120" cy="195" r="8" fill="#1E293B" stroke="#22D3EE" strokeWidth="1.5" />
                <circle cx="120" cy="195" r="3" fill="#22D3EE" />
              </g>

              {/* Arms (Musculoskeletal System) */}
              <g
                onClick={() => handleSelect(ASTRONAUT_SYSTEMS[2])}
                style={{ cursor: 'pointer' }}
              >
                {/* Left Arm */}
                <path d="M 78 102 L 56 150 L 48 200 L 40 196 L 48 146 L 72 98 Z" fill="url(#suitGrad)" stroke="#64748B" strokeWidth="1.5" />
                {/* Left Glove */}
                <rect x="36" y="196" width="14" height="18" rx="4" fill="#334155" stroke="#475569" />

                {/* Right Arm */}
                <path d="M 162 102 L 184 150 L 192 200 L 200 196 L 192 146 L 168 98 Z" fill="url(#suitGrad)" stroke="#64748B" strokeWidth="1.5" />
                {/* Right Glove */}
                <rect x="190" y="196" width="14" height="18" rx="4" fill="#334155" stroke="#475569" />

                {/* Legs */}
                {/* Left Leg */}
                <path d="M 98 228 L 92 310 L 86 390 L 76 405 L 98 405 L 106 310 L 112 228 Z" fill="url(#suitGrad)" stroke="#64748B" strokeWidth="1.5" />
                <rect x="74" y="396" width="26" height="14" rx="3" fill="#1E293B" stroke="#475569" />

                {/* Right Leg */}
                <path d="M 142 228 L 148 310 L 154 390 L 164 405 L 142 405 L 134 310 L 128 228 Z" fill="url(#suitGrad)" stroke="#64748B" strokeWidth="1.5" />
                <rect x="140" y="396" width="26" height="14" rx="3" fill="#1E293B" stroke="#475569" />

                {/* Joint Rings */}
                <circle cx="56" cy="150" r="5" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
                <circle cx="184" cy="150" r="5" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
                <circle cx="98" cy="310" r="5" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
                <circle cx="142" cy="310" r="5" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
              </g>
            </svg>
          </div>
        </div>

        {/* Right Column: Live Physiological Detail Card */}
        <div style={{
          background: 'rgba(17, 28, 49, 0.85)',
          border: '1px solid #23334D',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: activeSystem.color, letterSpacing: '1px', textTransform: 'uppercase' }}>
              FICHA CLÍNICA NASA
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#34D399',
              background: 'rgba(52, 211, 153, 0.1)',
              padding: '2px 8px',
              borderRadius: '9999px',
              border: '1px solid rgba(52, 211, 153, 0.3)'
            }}>
              <CheckCircle size={12} /> NOMINAL
            </div>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
            {activeSystem.name}
          </h3>

          <div style={{
            background: '#0B1220',
            border: '1px solid #23334D',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '13px',
            fontFamily: 'monospace',
            color: activeSystem.color,
            fontWeight: '600'
          }}>
            Lectura actual: {activeSystem.value}
          </div>

          <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5' }}>
            <strong style={{ color: '#E2E8F0' }}>Peligro HRP:</strong> {activeSystem.hazard}
          </div>

          <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5' }}>
            <strong style={{ color: '#E2E8F0' }}>Riesgo Oficial:</strong> {activeSystem.risk}
          </div>

          <p style={{ fontSize: '12px', color: '#CBD5E1', lineHeight: '1.6', margin: '4px 0 0 0' }}>
            {activeSystem.desc}
          </p>

          <button
            onClick={() => handleSelect(activeSystem)}
            style={{
              marginTop: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: activeSystem.color,
              color: '#0B1220',
              fontWeight: '700',
              fontSize: '12px',
              fontFamily: 'monospace',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 0 15px -2px ${activeSystem.color}60`
            }}
          >
            Confirmar Selección de Zona
          </button>
        </div>
      </div>
    </div>
  );
}
