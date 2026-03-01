// src/services/ideiasAPI.js
import { apiRequest } from '../lib/apiConfig.js';

export async function getIdeias() {
  const resp = await apiRequest('/api/ideias', { method: 'GET' });
  return resp?.data ?? resp;
}

export async function createIdeia({ titulo, descricao }) {
  const resp = await apiRequest('/api/ideias', {
    method: 'POST',
    body: JSON.stringify({ titulo, descricao }),
  });
  return resp?.data ?? resp;
}

export async function voteIdeia(ideiaId) {
  const resp = await apiRequest(`/api/ideias/${ideiaId}/vote`, { method: 'POST' });
  return resp?.data ?? resp;
}

export async function addComentario(ideiaId, texto) {
  const resp = await apiRequest(`/api/ideias/${ideiaId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ texto }),
  });
  return resp?.data ?? resp;
}
