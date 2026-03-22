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
  // Detecta quando o SW assume controle — mostra aviso antes de recarregar
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    // Mostra banner discreto em vez de reload abrupto
    const banner = document.createElement('div')
    banner.innerHTML = 'Nova versão disponível! <button style="margin-left:12px;background:#6366f1;color:#fff;border:none;border-radius:8px;padding:6px 16px;cursor:pointer;font-weight:600">Atualizar</button>'
    Object.assign(banner.style, {
      position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',
      background:'rgba(10,10,18,0.95)',color:'#F5F5F7',padding:'14px 24px',
      borderRadius:'14px',zIndex:'99999',fontSize:'0.9rem',
      border:'1px solid rgba(99,102,241,0.3)',backdropFilter:'blur(12px)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.4)',display:'flex',alignItems:'center',
    })
    banner.querySelector('button').onclick = () => window.location.reload()
    document.body.appendChild(banner)
  })

  // Limpa todos os caches antigos ao carregar para evitar FetchEvent errors
  window.addEventListener('load', () => {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name.includes('workbox') || name.includes('api-') || name.includes('backend-')) {
          caches.delete(name)
        }
      })
    }).catch(() => {})

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
