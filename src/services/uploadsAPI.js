// src/services/uploadsAPI.js
import { apiRequestMultipart } from '../lib/apiConfig.js';

export async function uploadImage(file, oldUrl) {
  const fd = new FormData();
  fd.append('file', file);
  if (oldUrl) {
    fd.append('old_url', oldUrl);
  }
  return apiRequestMultipart('/api/uploads/image', fd, { method: 'POST' });
}
