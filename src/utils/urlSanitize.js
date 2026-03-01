// src/utils/urlSanitize.js
// Funções utilitárias para sanitizar URLs de imagens e evitar Mixed Content

// URL do backend (Render) para resolver URLs relativas de API
const BACKEND_URL = 'https://codecraftgenz-monorepo.onrender.com';

export function sanitizeImageUrl(input) {
  try {
    if (!input || typeof input !== 'string') return '';
    // Permite pré-visualização de uploads via Data URLs sem reprocessar
    if (input.startsWith('data:')) return input;
    if (input.startsWith('blob:')) return input;
    // URLs de API do backend (/api/downloads/...) -> resolver para o backend Render
    if (input.startsWith('/api/')) return `${BACKEND_URL}${input}`;
    // URLs antigas da Hostinger (codecraftgenz.com.br/downloads/...) -> redirecionar para backend API
    const hostingerDownloadMatch = input.match(/^https?:\/\/codecraftgenz\.com\.br\/downloads\/(.+)$/);
    if (hostingerDownloadMatch) return `${BACKEND_URL}/api/downloads/${hostingerDownloadMatch[1]}`;
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const currentProtocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const u = new URL(input, currentOrigin);

    // Bloqueia imagens apontando para localhost em produção HTTPS
    const isHttpsPage = currentProtocol === 'https:';
    const isLocalhost = u.hostname === 'localhost' || u.hostname.endsWith('.local');
    if (isHttpsPage && isLocalhost) {
      // Evita mixed content e retorna fallback
      return '/logo-principal.png';
    }

    // Se a página é HTTPS e a imagem é HTTP em host externo, tenta upgrade para HTTPS
  if (isHttpsPage && u.protocol === 'http:') {
    u.protocol = 'https:';
  }

  const allowed = ['https:', 'http:', 'data:', 'blob:'];
  if (!allowed.includes(u.protocol)) {
    return '/logo-principal.png';
  }

  return u.href;
  } catch {
    // Em falha de parse, usa fallback seguro
    return '/logo-principal.png';
  }
}

export function sanitizeSrcSet(srcs) {
  if (!srcs) return undefined;
  try {
    const parts = String(srcs).split(',').map(s => s.trim());
    const sanitized = parts.map(p => {
      const [url, size] = p.split(/\s+/);
      const safe = sanitizeImageUrl(url);
      return size ? `${safe} ${size}` : safe;
    });
    return sanitized.join(', ');
  } catch {
    return undefined;
  }
}