// src/services/uploadsAPI.js
import { apiRequestMultipart } from '../lib/apiConfig.js';

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  return apiRequestMultipart('/api/uploads/image', fd, { method: 'POST' });
}
