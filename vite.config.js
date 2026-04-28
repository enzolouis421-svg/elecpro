import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        name: 'ElecPro — Gestion Électricien',
        short_name: 'ElecPro',
        description: 'Application de gestion pour électriciens artisans',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'fr',
        icons: [
          {
            src: '/pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Augmente la limite pour les gros bundles
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Met en cache toutes les ressources statiques du build
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Stratégies de cache par type de ressource
        runtimeCaching: [
          {
            // Google Fonts — cache long terme
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase API — Network First (données fraîches si réseau dispo, cache sinon)
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 5,
            },
          },
        ],
        // Ne pas mettre en cache les routes d'auth Supabase
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/signer\//],
      },
    }),
  ],
})
