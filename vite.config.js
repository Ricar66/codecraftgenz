import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Expõe também variáveis que começam com 'MERCADO_' para o frontend
  // Isso permite usar MERCADO_PAGO_PUBLIC_KEY vindo do ambiente de build
  envPrefix: ['VITE_', 'MERCADO_'],
  plugins: [
    react(),
    // Legacy plugin desabilitado - 95%+ dos usuarios tem browsers modernos
    // Isso remove ~14KB de polyfills desnecessarios e melhora TBT significativamente
    // Se precisar suportar browsers antigos, reabilite com renderLegacyChunks: true
    legacy({
      targets: ['defaults', 'not IE 11'],
      renderLegacyChunks: false, // NAO gerar chunks legacy - melhora performance
      modernPolyfills: false // NAO adicionar polyfills modernos automaticamente
    }),
    VitePWA({
      // Registro manual do SW para não bloquear o carregamento inicial
      registerType: 'autoUpdate',
      injectRegister: null, // Registramos manualmente após window.load
      devOptions: {
        enabled: false // Desabilita PWA em desenvolvimento
      },
      workbox: {
        // Não pré-cachear arquivos grandes - removido PNG para evitar erro 422
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        // Ignora favicons e ícones no precache (evita erro 422)
        globIgnores: ['**/favicon*', '**/apple-touch-icon*', '**/android-chrome*', '**/node_modules/**'],
        // Ignora arquivos grandes no precache
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB max
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
            // Downloads devem ir direto para a rede (evita cache de .exe grandes)
            urlPattern: ({ url }) => url.pathname.startsWith('/downloads/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'downloads-network-only'
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
          },
          {
            // Cache de imagens com StaleWhileRevalidate
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 dias
              }
            }
          }
        ],
        // Fallback mais restritivo - só funciona se houver cache válido
        navigateFallback: '/index.html',
        // Garante que /downloads não caia no fallback do SPA
        navigateFallbackAllowlist: [/^(?!.*\/api\/|.*\/downloads\/).*/],
        navigateFallbackDenylist: [/^\/api/, /^\/downloads/],
        // Configurações para atualização automática
        cleanupOutdatedCaches: true,
        skipWaiting: true, // Assume controle imediatamente
        clientsClaim: true // Reivindica clientes existentes
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: true,
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
      },
      '/downloads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },
  assetsInclude: ['**/*.svg'],
  build: {
    // Build moderno para melhor performance
    target: 'es2020',
    assetsInlineLimit: 4096, // Inline assets < 4KB para reduzir requests
    cssCodeSplit: true, // CSS code splitting para melhor cache
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks: {
          // Core React - carrega primeiro
          vendor: ['react', 'react-dom'],
          // Router - carrega junto com o app
          router: ['react-router-dom'],
          // MercadoPago - chunk separado, só carrega quando necessário
          mercadopago: ['@mercadopago/sdk-react']
        }
      }
    },
    // Otimizações para produção
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log em produção
        drop_debugger: true
      }
    },
    sourcemap: false,
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
