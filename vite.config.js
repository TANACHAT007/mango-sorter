import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the site under /<repo>/ — keep in sync with the repository name
const BASE = '/mango-sorter/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'offline.html'],
      manifest: {
        name: 'Mango Sorter — เครื่องคัดแยกมะม่วง',
        short_name: 'Mango Sorter',
        description: 'แดชบอร์ดและรายงานน้ำหนักล็อตของเครื่องคัดแยกมะม่วงด้วยกล้อง',
        theme_color: '#e89a00',
        background_color: '#f6f7f4',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: BASE + 'index.html',
        globIgnores: ['**/img/**', '**/model/**'],
        runtimeCaching: [
          { urlPattern: /\/model\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'machine-model' } },
          { urlPattern: /\/img\//, handler: 'CacheFirst', options: { cacheName: 'machine-images', expiration: { maxEntries: 40 } } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'fonts' } },
        ],
      },
    }),
  ],
})
