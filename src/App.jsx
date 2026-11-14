import { useState } from 'react';
import AstronautBody3D from './components/AstronautBody3D';

export default function App() {
  const [activeSystem, setActiveSystem] = useState(null);

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      <AstronautBody3D
        onSelectZone={(systemData) => {
          setActiveSystem(systemData);
          // Aquí puedes filtrar tus datos de Supabase o Dexie según systemData.id
        }}
      />

      {activeSystem && (
        <p style={{ marginTop: '12px', fontFamily: 'sans-serif', color: '#334155' }}>
          Sistema seleccionado para gráficas históricas: <strong>{activeSystem.name}</strong> ({activeSystem.value})
        </p>
      )}
    </main>
  );
}
