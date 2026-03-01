// src/services/uploadsAPI.js
import { apiRequestMultipart } from '../lib/apiConfig.js';

/**
 * @param {File} file - arquivo de imagem
 * @param {string} [oldUrl] - URL da imagem anterior (para substituir)
 * @param {'apps'|'projetos'} [category='apps'] - pasta de destino
 */
export async function uploadImage(file, oldUrl, category = 'apps') {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('category', category);
  if (oldUrl) {
    fd.append('old_url', oldUrl);
  }
  return apiRequestMultipart('/api/uploads/image', fd, { method: 'POST' });
}
