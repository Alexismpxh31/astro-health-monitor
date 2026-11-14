import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/dexie'

const demoUserId = 'b7ac6938-c68b-4654-9665-55241588064f'

function App() {
  const readings = useLiveQuery(
    () => db.readings.orderBy('measuredAt').reverse().toArray(),
    [],
    [],
  )
  const [error, setError] = useState('')

  async function saveReading() {
    setError('')

    try {
      await db.readings.add({
        id: crypto.randomUUID(),
        userId: demoUserId,
        indicatorCode: 'HR',
        value: 72,
        unit: 'bpm',
        measuredAt: new Date().toISOString(),
        source: 'simulated',
        syncStatus: 'pending',
      })
    } catch {
      setError('No se pudo guardar la lectura.')
    }
  }

  return (
    <main>
      <h1>AstroSalud</h1>
      <h2>Lecturas simuladas</h2>
      <button type="button" onClick={saveReading}>
        Guardar lectura de pulso
      </button>
      {error && <p role="alert">{error}</p>}
      <ul>
        {readings.map((reading) => (
          <li key={reading.id}>
            Pulso: {reading.value} {reading.unit} · {reading.measuredAt}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App