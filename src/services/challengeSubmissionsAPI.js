// src/services/challengeSubmissionsAPI.js
// Serviço para submissões de desafios (fluxo GitHub/GitLab)

import { apiRequest } from '../lib/apiConfig.js';

/**
 * Submete uma solução (URL de repositório) para um desafio.
 * @param {number} desafioId - ID do desafio
 * @param {{ repoUrl: string, description?: string }} data
 * @returns {Promise<Object>} Submissão criada
 */
export async function submitChallenge(desafioId, data) {
  if (!desafioId) throw new Error('desafioId é obrigatório');
  const resp = await apiRequest(`/api/challenges/${desafioId}/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return resp?.data ?? resp;
}

/**
 * Retorna a submissão do usuário autenticado para um desafio (ou null).
 * @param {number} desafioId
 * @returns {Promise<Object|null>}
 */
export async function getMySubmission(desafioId) {
  if (!desafioId) throw new Error('desafioId é obrigatório');
  const resp = await apiRequest(`/api/challenges/${desafioId}/my-submission`, {
    method: 'GET',
    suppressLog: true,
  });
  return resp?.data ?? null;
}

/**
 * Lista submissões (admin). Suporta filtro por status e paginação.
 * @param {{ status?: 'pending'|'approved'|'rejected', page?: number, limit?: number }} params
 * @returns {Promise<{ items: any[], page: number, limit: number, total: number, totalPages: number }>}
 */
export async function listSubmissions({ status, page = 1, limit = 20 } = {}) {
  const qp = new URLSearchParams();
  qp.set('page', String(page));
  qp.set('limit', String(limit));
  if (status) qp.set('status', status);

  const resp = await apiRequest(`/api/challenges/submissions?${qp.toString()}`, { method: 'GET' });
  return resp?.data ?? resp;
}

/**
 * Revisa uma submissão (admin). Aprovação concede os pontos informados.
 * @param {number} submissionId
 * @param {{ status: 'approved'|'rejected', feedback?: string, points?: number }} data
 * @returns {Promise<Object>} Submissão atualizada
 */
export async function reviewSubmission(submissionId, data) {
  if (!submissionId) throw new Error('submissionId é obrigatório');
  const resp = await apiRequest(`/api/challenges/submissions/${submissionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return resp?.data ?? resp;
}
