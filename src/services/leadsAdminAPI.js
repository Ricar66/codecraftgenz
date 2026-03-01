// src/services/leadsAdminAPI.js
// API para dashboard de leads (admin)
import { apiRequest } from '../lib/apiConfig.js';

/**
 * Buscar dados agregados do dashboard de leads
 * @param {string} periodo - Período (7d, 30d, 90d, 365d)
 */
export async function getLeadsDashboard(periodo = '30d') {
  const resp = await apiRequest(`/api/leads/dashboard?periodo=${periodo}`, { method: 'GET' });
  return resp?.data ?? resp;
}

/**
 * Buscar lista paginada de leads com filtros
 */
export async function getLeadsList({ origin, status, search, page = 1, limit = 25 } = {}) {
  const qp = new URLSearchParams();
  qp.set('page', String(page));
  qp.set('limit', String(limit));
  if (origin) qp.set('origin', origin);
  if (status) qp.set('status', status);
  if (search) qp.set('search', search);
  const resp = await apiRequest(`/api/leads?${qp.toString()}`, { method: 'GET' });
  return resp;
}

/**
 * Atualizar status de um lead
 */
export async function updateLeadStatus(id, status) {
  const resp = await apiRequest(`/api/leads/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  return resp?.data ?? resp;
}
