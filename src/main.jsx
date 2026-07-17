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

// NOTA: a recuperação de chunk órfão / tela-preta vive agora no WATCHDOG INLINE
// do index.html (roda antes de qualquer bundle, cobre até o caso do próprio
// main.jsx dar 404). Não duplicar aqui para evitar reloads concorrentes.

// SERVICE WORKER DESATIVADO (2026-07) — era a causa da "tela preta ao entrar".
// O SW guardava HTML/JS antigos no precache e, apos um deploy, servia esses
// arquivos obsoletos (que ja tinham sido apagados do servidor) -> 404 -> tela
// preta que so o reload manual resolvia. O site nao e offline-first, entao o
// SW trazia mais problema que beneficio.
//
// Em vez de registrar, DESREGISTRAMOS qualquer SW existente e limpamos TODOS os
// caches. Isso resgata quem estava preso com o SW antigo: assim que o codigo novo
// roda, o SW problemático e removido e o site passa a carregar sempre da rede.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => {})
  if (window.caches && caches.keys) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => {})
  }
}
