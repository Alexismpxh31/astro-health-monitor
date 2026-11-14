import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AstroSalud',
        short_name: 'AstroSalud',
        display: 'standalone',
        theme_color: '#0B1220',
        background_color: '#0B1220',
      },
    }),
  ],
})