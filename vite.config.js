import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['> 1%', 'last 2 versions', 'not dead', 'not IE 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      polyfills: [
        'es.symbol',
        'es.array.filter',
        'es.promise',
        'es.promise.finally',
        'es/map',
        'es/set',
        'es.array.for-each',
        'es.object.define-properties',
        'es.object.define-property',
        'es.object.get-own-property-descriptor',
        'es.object.get-own-property-descriptors',
        'es.object.keys',
        'es.object.to-string',
        'web.dom-collections.for-each',
        'esnext.global-this',
        'esnext.string.match-all'
      ]
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: false // Desabilita PWA em desenvolvimento
      },
      workbox: {
        runtimeCaching: [
          {
            // Todas as rotas de API devem ir para a rede e nunca serem cacheadas
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-network-only'
            }
          },
          {
            // Cache mais conservador para páginas HTML
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3, // Timeout rápido para detectar offline
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 horas apenas
              }
            }
          }
        ],
        // Fallback mais restritivo - só funciona se houver cache válido
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!.*\/api\/).*/],
        navigateFallbackDenylist: [/^\/api/],
        // Configurações menos agressivas
        cleanupOutdatedCaches: true,
        skipWaiting: false, // Não assume controle imediatamente
        clientsClaim: false // Não reivindica clientes existentes
      }
    })
  ],
  server: {
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true,
      interval: 1000
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },
  assetsInclude: ['**/*.svg'],
  build: {
    assetsInlineLimit: 0, // Força todos os assets a serem copiados como arquivos separados
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    },
    // Otimizações para produção
    minify: 'terser',
    sourcemap: false,
    // Melhor compatibilidade entre navegadores
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    // Polyfills automáticos
    modulePreload: {
      polyfill: true
    },
    chunkSizeWarningLimit: 600
  },
  // Configurações específicas para produção
  define: {
    'process.env.NODE_ENV': '"production"',
    __DEV__: false
  }
})
