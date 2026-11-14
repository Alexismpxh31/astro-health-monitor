import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/index.js'
import './index.css'
import App from './App.jsx'
import { seedIfEmpty } from './db/db.js'
import { startAutoSync } from './sync/queue.js'

// Load the demo/catalog data on first run. Never block rendering on it.
seedIfEmpty().catch((error) => {
  console.error('[db] Seeding failed', error)
})

// Start background sync with Supabase when online
startAutoSync({ intervalMs: 25000 })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
