import AstronautModel3D from './components/AstronautModel3D';

export default function App() {
  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '20px' }}>
      <AstronautModel3D
        onSelectZone={(zona) => {
          console.log('Zona seleccionada:', zona.id, zona.value);
        }}
      />
    </div>
  );
}
