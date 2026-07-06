import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'ChromaFlow — Farbpuzzle',
        short_name: 'ChromaFlow',
        description:
          'Bring die Farben ins Gleichgewicht: Kacheln tauschen, Verläufe wiederherstellen. 720 Level, tägliche Puzzles und Zen-Modus.',
        lang: 'de',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        theme_color: '#14151c',
        background_color: '#14151c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        skipWaiting: true,
        clientsClaim: true
      }
    })
  ],
  build: {
    target: 'es2019',
    sourcemap: false
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
