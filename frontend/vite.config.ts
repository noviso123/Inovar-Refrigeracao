
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [
      react({
        babel: {
          plugins: [
            ['@babel/plugin-proposal-decorators', { legacy: true }]
          ]
        }
      }),
      // VitePWA temporarily disabled for build fix - can be re-enabled later
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   includeAssets: ['favicon.ico', 'icons/apple-touch-icon.png'],
      //   manifest: {
      //     name: 'Inovar Refrigeração',
      //     short_name: 'Inovar Refrigeração',
      //     description: 'Sistema de gestão para Inovar Refrigeração',
      //     theme_color: '#3b82f6',
      //     background_color: '#f8fafc',
      //     display: 'standalone',
      //     orientation: 'portrait-primary',
      //     start_url: '/',
      //     id: '/',
      //     categories: ['business', 'productivity'],
      //     icons: [
      //       {
      //         src: '/icons/icon-192x192.png',
      //         sizes: '192x192',
      //         type: 'image/png'
      //       },
      //       {
      //         src: '/icons/icon-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png'
      //       },
      //       {
      //         src: '/icons/icon-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //         purpose: 'maskable'
      //       }
      //     ]
      //   },
      //   workbox: {
      //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      //     runtimeCaching: [
      //       {
      //         urlPattern: /\/api\/.*/i,
      //         handler: 'NetworkFirst',
      //         options: {
      //           cacheName: 'api-cache',
      //           expiration: {
      //             maxEntries: 50,
      //             maxAgeSeconds: 300
      //           }
      //         }
      //       }
      //     ]
      //   }
      // })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: true,
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
          warn(warning);
        }
      },
      emptyOutDir: true
    },
  };
});
