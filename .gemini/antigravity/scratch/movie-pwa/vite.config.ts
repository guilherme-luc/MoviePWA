import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Movie Collection Manager',
        short_name: 'Movies',
        description: 'Manage your movie collection with Google Sheets integration',
        theme_color: '#242424',
        background_color: '#242424',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Basic caching for offline app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // We do NOT cache API calls here aggressively because we want "Offline Read-Only"
        // which implies we might want to serve stale data if we cached it, or handle it in app.
        // For Google Sheets, we'll rely on React Query persistence.
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: false, // Disable service worker in dev to avoid ES6 module errors
      }
    })
  ],
})
