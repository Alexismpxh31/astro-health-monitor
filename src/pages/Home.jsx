import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ShieldAlert, 
  Clock, 
  BatteryCharging, 
  Radio, 
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import AstronautBody3D from '../components/AstronautBody3D';

export default function Home() {
  const [activeSystem, setActiveSystem] = useState(null);
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Artemis Mission Status Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        padding: '14px 18px',
        background: 'rgba(14, 23, 38, 0.75)',
        backdropFilter: 'blur(8px)',
        borderRadius: '16px',
        border: '1px solid #1E2E48'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '8px', 
            background: 'rgba(34, 211, 238, 0.1)', 
            border: '1px solid rgba(34, 211, 238, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#22D3EE'
          }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748B', textTransform: 'uppercase' }}>
              Mission Elapsed Time
            </div>
            <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: '700', color: '#F8FAFC' }}>
              MET 142d 08h 24m
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '8px', 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981'
          }}>
            <Activity size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748B', textTransform: 'uppercase' }}>
              Estado Fisiológico Global
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#34D399' }}>
              NOMINAL (Índice 94/100)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '8px', 
            background: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F59E0B'
          }}>
            <Radio size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748B', textTransform: 'uppercase' }}>
              Dosimetría SPE/GCR
            </div>
            <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: '700', color: '#FCD34D' }}>
              0.35 mSv/d (Seguro)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '8px', 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60A5FA'
          }}>
            <BatteryCharging size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748B', textTransform: 'uppercase' }}>
              Batería Traje xEMU
            </div>
            <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: '700', color: '#93C5FD' }}>
              94% · 6.8h restantes
            </div>
          </div>
        </div>
      </div>

      {/* Main 3D Astronaut Suit Body Component */}
      <AstronautBody3D
        onSelectZone={(systemData) => {
          setActiveSystem(systemData);
        }}
      />

      {/* Selected System Action Strip */}
      {activeSystem && (
        <div style={{
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'rgba(14, 23, 38, 0.9)',
          border: '1px solid #1E2E48',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: activeSystem.color,
              boxShadow: `0 0 10px ${activeSystem.color}`
            }} />
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
              Sistema seleccionado para gráficas históricas: <strong style={{ color: '#FFFFFF' }}>{activeSystem.name}</strong> ({activeSystem.value})
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => navigate('/vitals')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(34, 211, 238, 0.1)',
                border: '1px solid rgba(34, 211, 238, 0.4)',
                color: '#22D3EE',
                fontWeight: '700',
                fontSize: '11px',
                fontFamily: 'monospace',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <TrendingUp size={14} />
              <span>Ver Gráfica en Directo</span>
            </button>

            <button
              onClick={() => navigate(`/system/${activeSystem.id}`)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#22D3EE',
                color: '#070C15',
                fontWeight: '800',
                fontSize: '11px',
                fontFamily: 'monospace',
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileText size={14} />
              <span>Ficha Completa NASA</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
