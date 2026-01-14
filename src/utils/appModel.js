// src/utils/appModel.js
import { sanitizeImageUrl } from './urlSanitize.js';

// Retorna a melhor URL de imagem para um app e já sanitiza
// Retorna string vazia se nenhuma imagem disponível (evita fallback para /vite.svg)
export function getAppImageUrl(app) {
  const src = app?.image || app?.thumbnail || app?.thumb_url || app?.picture_url || '';
  if (!src) return '';
  return sanitizeImageUrl(src);
}

// Retorna preço numérico seguro
export function getAppPrice(app) {
  const n = Number(app?.price);
  return Number.isFinite(n) ? n : 0;
}