import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Shield, 
  Brain, 
  Heart, 
  Radio, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Minus
} from 'lucide-react';

export const ASTRONAUT_SYSTEMS = [
  {
    id: 'cardiovascular',
    name: 'Sistema Cardiovascular & Fluidos',
    shortName: 'Cardiovascular',
    value: '74 bpm · 98% SpO2',
    statusText: 'Nominal',
    status: 'normal',
    trend: 'stable',
    hazard: 'Gravity Fields / Microgravedad',
    risk: 'Risk of Cardiovascular Adaptations & Orthostatic Intolerance',
    desc: 'Monitoreo de frecuencia cardíaca, redistribución de volemia cefálica y oxigenación celular por chaleco Astroskin.',
    icon: Heart,
    color: '#22D3EE',
    coords: { x: 120, y: 155 } // Chest/Heart area
  },
  {
    id: 'cns',
    name: 'Sistema Nervioso Central & Sueño (PVT)',
    shortName: 'Neurocognitivo',
    value: '232 ms de latencia',
    statusText: 'Óptimo',
    status: 'normal',
    trend: 'improving',
    hazard: 'Isolation and Confinement',
    risk: 'Risk of Adverse Cognitive/Behavioral Changes & Sleep Deficit',
    desc: 'Test de vigilancia psicomotora (PVT), calidad de sueño circadiano y fatiga de vuelo en misiones de exploración.',
    icon: Brain,
    color: '#A855F7',
    coords: { x: 120, y: 55 } // Visor/Brain area
  },
  {
    id: 'musculoskeletal',
    name: 'Sistema Óseo-Muscular (ARED)',
    shortName: 'Óseo-Muscular',
    value: '-0.8% BMD · 96% masa magra',
    statusText: 'Estable',
    status: 'normal',
    trend: 'stable',
    hazard: 'Gravity Fields (Falta de carga mecánica)',
    risk: 'Risk of Early Onset Osteopenia & Muscle Atrophy',
    desc: 'Densidad mineral ósea (BMD) en fémur y columna lumbar. Régimen de 2.5h diarias en el dispositivo ARED.',
    icon: Activity,
    color: '#10B981',
    coords: { x: 120, y: 265 } // Spine/Legs area
  },
  {
    id: 'radiation',
    name: 'Exposición a Radiación Cósmica',
    shortName: 'Radiación',
    value: '0.35 mSv/d · 42.1 mSv acum.',
    statusText: 'Controlado',
    status: 'normal',
    trend: 'stable',
    hazard: 'Space Radiation (GCR / SPE)',
    risk: 'Risk of Radiation Carcinogenesis & CNS Damage',
    desc: 'Dosimetría activa de rayos cósmicos galácticos (iones HZE) y monitoreo de tormentas solares de protones.',
    icon: Radio,
    color: '#F59E0B',
    coords: { x: 155, y: 130 } // Right shoulder/dosimeter area
  },
  {
    id: 'immune',
    name: 'Inmunidad & Ambiente Cerrado (ECLSS)',
    shortName: 'Inmune & SANS',
    value: '6.4 k/µL WBC · IL-6: 1.8 pg/mL',
    statusText: 'Nominal',
    status: 'normal',
    trend: 'stable',
    hazard: 'Hostile / Closed Environment & SANS',
    risk: 'Risk of Altered Immune System Responses & Vision Impairment',
    desc: 'Poblaciones leucocitarias, reactivación viral por PCR en saliva y ecografía de la vaina del nervio óptico.',
    icon: Shield,
    color: '#3B82F6',
    coords: { x: 85, y: 130 } // Left shoulder/lymphatic area
  }
];

export default function AstronautBody3D({ onSelectZone = () => {} }) {
  const [selectedId, setSelectedId] = useState('cardiovascular');
  const [rotation, setRotation] = useState({ x: 4, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const activeSystem = ASTRONAUT_SYSTEMS.find(s => s.id === selectedId) || ASTRONAUT_SYSTEMS[0];

  const handleSelect = (sys) => {
    setSelectedId(sys.id);
    onSelectZone(sys);
  };

  // Subtle 3D tilt tracking with smooth bounds
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotation({
      x: -y * 12,
      y: x * 15
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 4, y: 0 });
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, #0B1220 0%, #0E1A2E 50%, #080E1A 100%)',
      borderRadius: '20px',
      border: '1px solid #1E2E48',
      padding: '24px',
      color: '#E2E8F0',
      boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background radial telemetry glow */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '30%',
        width: '400px',
        height: '400px',
        background: `radial-gradient(circle, ${activeSystem.color}15 0%, transparent 70%)`,
        pointerEvents: 'none',
        transition: 'background 0.5s ease'
      }} />

      {/* Header bar */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '12px',
        marginBottom: '24px', 
        position: 'relative',
        borderBottom: '1px solid rgba(30, 46, 72, 0.6)',
        paddingBottom: '16px'
      }}>
        <div>
          <div style={{ 
            fontSize: '11px', 
            fontFamily: 'monospace', 
            color: '#22D3EE', 
            letterSpacing: '0.15em', 
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22D3EE' }} />
            NASA HRP · BIO-HUD 3D TELEMETRY CONSOLE
          </div>
          <h2 style={{ 
            fontSize: '22px', 
            fontWeight: '800', 
            margin: '4px 0 0 0', 
            color: '#FFFFFF', 
            letterSpacing: '-0.02em' 
          }}>
            Traje Espacial Artemis xEMU · Nodos Biométricos
          </h2>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '9999px',
          padding: '6px 14px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#34D399',
          fontWeight: '700',
          letterSpacing: '0.05em'
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: '#10B981', 
            boxShadow: '0 0 8px #10B981' 
          }} />
          CHALECO ASTROSKIN ACTIVO
        </div>
      </div>

      {/* Central 3-Column Interactive Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', 
        gap: '24px', 
        alignItems: 'center', 
        position: 'relative' 
      }}>
        
        {/* Left Column: Anatomical Zone Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ 
            fontSize: '11px', 
            fontFamily: 'monospace', 
            color: '#64748B', 
            textTransform: 'uppercase', 
            letterSpacing: '0.12em',
            marginBottom: '4px'
          }}>
            Subsistemas Anatómicos de Monitoreo:
          </div>

          {ASTRONAUT_SYSTEMS.map((sys) => {
            const isSelected = sys.id === selectedId;
            const Icon = sys.icon;
            return (
              <button
                key={sys.id}
                onClick={() => handleSelect(sys)}
                style={{
                  minHeight: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(20, 34, 58, 0.95)' : 'rgba(14, 23, 38, 0.6)',
                  border: isSelected ? `1.5px solid ${sys.color}` : '1px solid #1E2E48',
                  color: isSelected ? '#FFFFFF' : '#94A3B8',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isSelected ? `0 4px 16px -2px ${sys.color}35` : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: isSelected ? `${sys.color}25` : 'rgba(30, 46, 72, 0.4)',
                    border: `1px solid ${isSelected ? sys.color : '#23334D'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? sys.color : '#64748B'
                  }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: isSelected ? '700' : '600', 
                      color: isSelected ? '#FFFFFF' : '#CBD5E1' 
                    }}>
                      {sys.shortName}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      fontFamily: 'monospace', 
                      color: isSelected ? sys.color : '#64748B' 
                    }}>
                      {sys.value}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isSelected ? `${sys.color}20` : 'transparent',
                    color: isSelected ? sys.color : '#64748B',
                    fontWeight: '700'
                  }}>
                    {sys.statusText}
                  </span>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isSelected ? sys.color : '#334155',
                    boxShadow: isSelected ? `0 0 8px ${sys.color}` : 'none'
                  }} />
                </div>
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
            padding: '12px'
          }}
        >
          <div style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s ease',
            position: 'relative',
            width: '280px',
            height: '430px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* SVG 3D Artemis xEMU Spacesuit Rendering */}
            <svg 
              viewBox="0 0 240 440" 
              style={{ 
                width: '100%', 
                height: '100%', 
                filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.8))' 
              }}
            >
              <defs>
                {/* Suit White/Titanium Shading */}
                <linearGradient id="suitBase" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F8FAFC" />
                  <stop offset="45%" stopColor="#CBD5E1" />
                  <stop offset="85%" stopColor="#64748B" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>

                {/* Dark Blue Suit Segments */}
                <linearGradient id="suitDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E293B" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>

                {/* Artemis Solar Gold Reflective Visor */}
                <linearGradient id="visorGold" x1="15%" y1="10%" x2="85%" y2="90%">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="35%" stopColor="#EAB308" />
                  <stop offset="70%" stopColor="#CA8A04" />
                  <stop offset="100%" stopColor="#713F12" />
                </linearGradient>

                {/* Visor Orbital Horizon Glare */}
                <linearGradient id="visorGlare" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>

                {/* PLSS Backpack Metal */}
                <linearGradient id="packGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="50%" stopColor="#1E293B" />
                  <stop offset="100%" stopColor="#0B1220" />
                </linearGradient>
              </defs>

              {/* Primary Life Support System (PLSS Backpack) */}
              <rect x="70" y="65" width="100" height="170" rx="16" fill="url(#packGrad)" stroke="#334155" strokeWidth="2.5" />
              {/* Oxygen Tank Caps */}
              <circle cx="95" cy="62" r="9" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.5" />
              <circle cx="145" cy="62" r="9" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.5" />
              {/* Umbilical Bio-Data Connector Port */}
              <rect x="78" y="160" width="12" height="28" rx="4" fill="#0EA5E9" />
              <path d="M 84 188 Q 80 230 110 240" fill="none" stroke="#0284C7" strokeWidth="3" strokeDasharray="3 3" />

              {/* Legs / Lower Extremities */}
              {/* Left Leg */}
              <path d="M 85 240 L 75 350 L 68 400 L 98 400 L 108 350 L 112 240 Z" fill="url(#suitBase)" stroke="#334155" strokeWidth="2" />
              {/* Left Knee Joint Ring */}
              <rect x="74" y="325" width="34" height="12" rx="4" fill="url(#suitDark)" stroke="#475569" />
              {/* Left Boot */}
              <path d="M 64 400 L 60 422 L 105 422 L 100 400 Z" fill="url(#suitDark)" stroke="#64748B" strokeWidth="2" />

              {/* Right Leg */}
              <path d="M 155 240 L 165 350 L 172 400 L 142 400 L 132 350 L 128 240 Z" fill="url(#suitBase)" stroke="#334155" strokeWidth="2" />
              {/* Right Knee Joint Ring */}
              <rect x="132" y="325" width="34" height="12" rx="4" fill="url(#suitDark)" stroke="#475569" />
              {/* Right Boot */}
              <path d="M 140 400 L 135 422 L 180 422 L 176 400 Z" fill="url(#suitDark)" stroke="#64748B" strokeWidth="2" />

              {/* Torso & Upper Suit Shell */}
              <path d="M 72 105 Q 120 95 168 105 L 164 240 Q 120 252 76 240 Z" fill="url(#suitBase)" stroke="#334155" strokeWidth="2" />
              
              {/* Chest Avionics Mini-Display */}
              <rect x="96" y="125" width="48" height="32" rx="6" fill="#0B1220" stroke="#22D3EE" strokeWidth="1.5" />
              <line x1="102" y1="135" x2="138" y2="135" stroke="#22D3EE" strokeWidth="2" />
              <line x1="102" y1="142" x2="128" y2="142" stroke="#10B981" strokeWidth="1.5" />
              <circle cx="136" cy="148" r="3" fill="#EF4444" />

              {/* Artemis NASA Mission Patch */}
              <circle cx="148" cy="115" r="7" fill="#0B1220" stroke="#3B82F6" strokeWidth="1.5" />
              <path d="M 144 118 L 148 111 L 152 118 Z" fill="#EF4444" />

              {/* Left Arm & Glove */}
              <path d="M 72 110 L 42 165 L 36 215 L 56 220 L 62 175 L 80 125 Z" fill="url(#suitBase)" stroke="#334155" strokeWidth="2" />
              <circle cx="46" cy="225" r="11" fill="url(#suitDark)" stroke="#64748B" />

              {/* Right Arm & Glove */}
              <path d="M 168 110 L 198 165 L 204 215 L 184 220 L 178 175 L 160 125 Z" fill="url(#suitBase)" stroke="#334155" strokeWidth="2" />
              <circle cx="194" cy="225" r="11" fill="url(#suitDark)" stroke="#64748B" />

              {/* Helmet & Collar Ring */}
              <ellipse cx="120" cy="78" rx="46" ry="12" fill="url(#suitDark)" stroke="#64748B" strokeWidth="2" />
              <ellipse cx="120" cy="55" rx="38" ry="40" fill="url(#suitBase)" stroke="#334155" strokeWidth="2" />

              {/* Golden Reflective Visor */}
              <ellipse cx="120" cy="54" rx="28" ry="24" fill="url(#visorGold)" stroke="#A16207" strokeWidth="2" />
              {/* Visor Glare Curve */}
              <path d="M 98 44 Q 120 35 142 44 Q 120 48 98 44 Z" fill="url(#visorGlare)" />

              {/* Interactive Bio-Hotspots on the Suit */}
              {ASTRONAUT_SYSTEMS.map((sys) => {
                const isSelected = sys.id === selectedId;
                const { x, y } = sys.coords;
                return (
                  <g 
                    key={sys.id} 
                    onClick={() => handleSelect(sys)} 
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Outer pulse sonar wave for active hotspot */}
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r="18"
                        fill="none"
                        stroke={sys.color}
                        strokeWidth="2"
                        className="sonar-ring"
                      />
                    )}

                    {/* Sensor Target Ring */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 11 : 8}
                      fill={isSelected ? `${sys.color}40` : 'rgba(15, 23, 42, 0.85)'}
                      stroke={sys.color}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      style={{ transition: 'all 0.2s ease' }}
                    />

                    {/* Core Sensor Glow Dot */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 5 : 3.5}
                      fill={sys.color}
                      style={{ filter: isSelected ? `drop-shadow(0 0 6px ${sys.color})` : 'none' }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Column: Diagnostic Flight Surgeon Card */}
        <div style={{
          background: 'rgba(14, 23, 38, 0.95)',
          borderRadius: '16px',
          border: `1.5px solid ${activeSystem.color}40`,
          padding: '20px',
          boxShadow: `0 10px 25px -5px rgba(0,0,0,0.5), inset 0 0 20px ${activeSystem.color}08`,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: activeSystem.color,
              letterSpacing: '0.1em',
              fontWeight: '700'
            }}>
              FICHA CLÍNICA NASA
            </span>

            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34D399',
              fontSize: '10px',
              fontWeight: '700',
              fontFamily: 'monospace'
            }}>
              <CheckCircle2 size={12} />
              {activeSystem.statusText.toUpperCase()}
            </span>
          </div>

          <div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '800', 
              color: '#FFFFFF', 
              margin: '0 0 4px 0',
              letterSpacing: '-0.01em'
            }}>
              {activeSystem.name}
            </h3>
            <div style={{ 
              fontSize: '13px', 
              fontFamily: 'monospace', 
              color: activeSystem.color, 
              fontWeight: '700' 
            }}>
              Lectura actual: {activeSystem.value}
            </div>
          </div>

          <div style={{ 
            fontSize: '12px', 
            color: '#94A3B8', 
            background: 'rgba(7, 12, 21, 0.7)', 
            padding: '10px', 
            borderRadius: '8px', 
            border: '1px solid #1E2E48' 
          }}>
            <div style={{ marginBottom: '6px' }}>
              <strong style={{ color: '#E2E8F0' }}>Peligro HRP:</strong> {activeSystem.hazard}
            </div>
            <div>
              <strong style={{ color: '#E2E8F0' }}>Riesgo Oficial:</strong> {activeSystem.risk}
            </div>
          </div>

          <p style={{ fontSize: '12px', color: '#CBD5E1', lineHeight: '1.6', margin: 0 }}>
            {activeSystem.desc}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => handleSelect(activeSystem)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                background: activeSystem.color,
                color: '#070C15',
                fontWeight: '800',
                fontSize: '12px',
                fontFamily: 'monospace',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 14px ${activeSystem.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>Confirmar Selección de Zona</span>
            </button>

            <button
              onClick={() => navigate(`/system/${activeSystem.id}`)}
              style={{
                width: '100%',
                padding: '9px 16px',
                borderRadius: '10px',
                background: 'transparent',
                color: '#E2E8F0',
                fontWeight: '600',
                fontSize: '12px',
                fontFamily: 'monospace',
                border: '1px solid #1E2E48',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>Ver Ficha Completa NASA</span>
              <ArrowUpRight size={14} className="text-cyan-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
