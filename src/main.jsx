// Importar polyfills primeiro para compatibilidade entre navegadores
import './polyfills.js'

import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.1,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
})

// Render app primeiro - prioridade máxima para LCP
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <AuthProvider>
          <Sentry.ErrorBoundary fallback={<p>Algo deu errado.</p>}>
            <App />
          </Sentry.ErrorBoundary>
        </AuthProvider>
      </HelmetProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Recuperação de chunk órfão pós-deploy.
// As rotas são lazy(); o deploy apaga os assets antigos do servidor. Um cliente com
// index.html/SW antigo pede um chunk que não existe mais → o import dinâmico falha e
// a tela fica preta até o usuário recarregar na mão. O Vite emite `vite:preloadError`
// nesse caso: recarregamos uma vez para buscar o index.html novo. A trava em
// sessionStorage evita loop de reload se a falha for por rede offline.
if (import.meta.env.PROD) {
  window.addEventListener('vite:preloadError', (event) => {
    const KEY = 'cc_chunk_reload'
    if (sessionStorage.getItem(KEY)) return // já tentamos: deixa o erro aparecer
    sessionStorage.setItem(KEY, '1')
    event.preventDefault()
    window.location.reload()
  })
  // App montou e navegou bem: libera a trava para o próximo deploy.
  window.addEventListener('load', () => {
    setTimeout(() => sessionStorage.removeItem('cc_chunk_reload'), 5000)
  })
}

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
    const text = document.createTextNode('Nova versão disponível! ')
    const btn = document.createElement('button')
    btn.textContent = 'Atualizar'
    Object.assign(btn.style, { marginLeft:'12px', background:'#D12BF2', color:'#fff', border:'none', borderRadius:'8px', padding:'6px 16px', cursor:'pointer', fontWeight:'600' })
    btn.onclick = () => window.location.reload()
    banner.appendChild(text)
    banner.appendChild(btn)
    Object.assign(banner.style, {
      position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',
      background:'rgba(10,10,18,0.95)',color:'#F5F5F7',padding:'14px 24px',
      borderRadius:'14px',zIndex:'99999',fontSize:'0.9rem',
      border:'1px solid rgba(99,102,241,0.3)',backdropFilter:'blur(12px)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.4)',display:'flex',alignItems:'center',
    })
    document.body.appendChild(banner)
  })

  // Registra o SW após window.load para não bloquear o carregamento inicial.
  // NOTA: removido o antigo caches.delete() a cada load (era hack de migração
  // Render->VPS). Ele sabotava o próprio service worker e causava tela branca
  // com chunks antigos logo após um deploy. O workbox já cuida disso via
  // cleanupOutdatedCaches + registerType:'autoUpdate' (skipWaiting/clientsClaim).
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
