import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Offline-first: every built asset (JS, CSS, HTML, JSON data, voice clips) is precached so the
// app opens, computes and logs in flight mode after one online load.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'voice/**/*'],
      manifest: {
        name: 'Pump coach',
        short_name: 'Pump coach',
        description: 'How long to run the pump today, if at all. Works offline.',
        theme_color: '#1f3a2c',
        background_color: '#f4efe6',
        display: 'standalone',
        start_url: '.',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,mp3,ogg,wav,webp,png}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { fs: { allow: ['..'] } },
});
