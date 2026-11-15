import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/index.js'
import './index.css'
import './theme/theme.js'
import App from './App.jsx'
import { seedIfEmpty } from './db/db.js'
import { startAutoSync } from './sync/queue.js'

// Load the demo/catalog data and initial crew readings on first run. Never block rendering on it.
seedIfEmpty().catch((error) => {
  console.error('[db] Seeding failed', error)
})

// Upload pending rows when online (on the 'online' event and every 30 s).
// Does nothing without Supabase env vars: the app keeps working offline.
const stopAutoSync = startAutoSync()
import.meta.hot?.dispose(stopAutoSync)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
