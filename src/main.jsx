// Importar polyfills primeiro para compatibilidade entre navegadores
import './polyfills.js'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// Render app primeiro - prioridade máxima para LCP
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HelmetProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Registra Service Worker APÓS window.load para não bloquear o carregamento inicial
// Isso melhora TBT (Total Blocking Time) e FCP (First Contentful Paint)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Aguarda 3 segundos após load para registrar o SW
    // Isso garante que o conteúdo principal já foi renderizado
    setTimeout(() => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Limpa caches antigos silenciosamente
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nova versão disponível - atualiza silenciosamente
                  console.log('Nova versão do app disponível')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.warn('SW registration failed:', error)
        })
    }, 3000)
  })
}
