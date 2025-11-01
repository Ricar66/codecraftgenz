// preview-server.js
// Servidor personalizado para preview que inclui proxy da API
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PREVIEW_PORT || 4173;
const API_PORT = process.env.API_PORT || 8080;

// Proxy para API - DEVE vir antes dos middlewares de arquivos estáticos
const apiProxy = createProxyMiddleware({
  target: `http://localhost:${API_PORT}`,
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'API server not available. Make sure the backend is running on port ' + API_PORT 
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request:', req.method, req.url);
  }
});

app.use('/api', apiProxy);

// Servir arquivos estáticos do build
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback para SPA - apenas para rotas que não são da API
app.use((req, res, next) => {
  // Se a rota começa com /api, não deve chegar aqui
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  
  // Para todas as outras rotas, servir o index.html (SPA)
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Preview server running on http://localhost:${PORT}`);
  console.log(`Proxying API requests to http://localhost:${API_PORT}`);
  console.log('Make sure your backend server is running!');
});