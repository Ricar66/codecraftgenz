// src/utils/urlSanitize.js
// Funções utilitárias para sanitizar URLs de imagens e evitar Mixed Content

export function sanitizeImageUrl(input) {
  try {
    if (!input || typeof input !== 'string') return '';
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const currentProtocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const u = new URL(input, currentOrigin);

    // Bloqueia imagens apontando para localhost em produção HTTPS
    const isHttpsPage = currentProtocol === 'https:';
    const isLocalhost = u.hostname === 'localhost' || u.hostname.endsWith('.local');
    if (isHttpsPage && isLocalhost) {
      // Evita mixed content e retorna fallback
      return '/logo-codecraft.png';
    }

    // Se a página é HTTPS e a imagem é HTTP em host externo, tenta upgrade para HTTPS
  if (isHttpsPage && u.protocol === 'http:') {
    u.protocol = 'https:';
  }

  const allowed = ['https:', 'http:', 'data:'];
  if (!allowed.includes(u.protocol)) {
    return '/logo-codecraft.png';
  }

  return u.href;
  } catch {
    // Em falha de parse, usa fallback seguro
    return '/logo-codecraft.png';
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