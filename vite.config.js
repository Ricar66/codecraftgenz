import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        runtimeCaching: [
          {
            // Todas as rotas de API devem ir para a rede e nunca serem cacheadas
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-network-only'
            }
          }
        ],
        // Fallback de navegação apenas para rotas não-API
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!.*\/api\/).*/],
        // CRÍTICO: Impede que o Service Worker intercepte rotas da API
        navigateFallbackDenylist: [/^\/api/]
      }
    })
  ],
  server: {
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
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    // Otimizações para produção
    minify: 'terser',
    sourcemap: false,
    target: 'es2015'
  },
  // Configurações específicas para produção
  define: {
    'process.env.NODE_ENV': '"production"',
    __DEV__: false
  }
})
