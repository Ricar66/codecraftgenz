import { defineConfig } from 'vite'

// Configuração específica para preview com proxy
export default defineConfig({
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  }
})