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
// CORRIGIDO: Reload forçado quando nova versão está disponível
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Detecta quando o SW assume controle e recarrega a página
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    // Registra SW após 1 segundo (reduzido de 3s para atualização mais rápida)
    setTimeout(() => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Verifica se há atualização pendente
          if (registration.waiting) {
            // Nova versão já está esperando - ativa imediatamente
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          }

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // Nova versão instalada - ativa e recarrega
                    console.log('Nova versão disponível. Atualizando...')
                    newWorker.postMessage({ type: 'SKIP_WAITING' })
                  } else {
                    // Primeira instalação
                    console.log('App disponível offline')
                  }
                }
              })
            }
          })

          // Verifica atualizações a cada 60 segundos
          setInterval(() => {
            registration.update().catch(() => {})
          }, 60000)
        })
        .catch((error) => {
          console.warn('SW registration failed:', error)
        })
    }, 1000)
  })
}
