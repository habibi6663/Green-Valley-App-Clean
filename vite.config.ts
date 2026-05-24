import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script',
        filename: 'sw.js',
        manifestFilename: 'manifest.webmanifest',
        includeAssets: ['logo.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'Green Valley School Portal',
          short_name: 'Green Valley',
          description: 'A modern school management portal for students, parents, teachers, and administrators.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          display_override: ['standalone', 'fullscreen'],
          background_color: '#121318',
          theme_color: '#121318',
          orientation: 'portrait-primary',
          categories: ['education', 'productivity'],
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'dicebear-avatars',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('react-dom') || id.includes('react/')) return 'react-vendor';
            if (id.includes('firebase')) return 'firebase-vendor';
            if (id.includes('motion')) return 'motion-vendor';
            if (id.includes('lucide-react')) return 'icons-vendor';
            return 'vendor';
          },
        },
      },
      chunkSizeWarningLimit: 1200,
    },
  };
});
