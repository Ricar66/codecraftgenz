// Importar polyfills primeiro para compatibilidade entre navegadores
import './polyfills.js'

// teste
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

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
