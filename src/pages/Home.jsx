import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AstronautBody3D from '../components/AstronautBody3D';

export default function Home() {
  const [activeSystem, setActiveSystem] = useState(null);
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px' }}>
      <AstronautBody3D
        onSelectZone={(systemData) => {
          setActiveSystem(systemData);
        }}
      />

      {activeSystem && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: '14px',
          background: 'rgba(17, 28, 49, 0.9)',
          border: '1px solid #23334D',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <p style={{ margin: 0, fontFamily: 'sans-serif', color: '#94A3B8', fontSize: '13px' }}>
            Sistema seleccionado para gráficas históricas: <strong style={{ color: '#FFFFFF' }}>{activeSystem.name}</strong> ({activeSystem.value})
          </p>

          <button
            onClick={() => navigate(`/system/${activeSystem.id}`)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#22D3EE',
              color: '#0B1220',
              fontWeight: '700',
              fontSize: '11px',
              fontFamily: 'monospace',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Ver Ficha Completa NASA →
          </button>
        </div>
      )}
    </div>
  );
}
