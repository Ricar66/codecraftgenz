import { apiRequest } from '../lib/apiConfig.js';

export async function listPartnerships(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  return apiRequest(`/api/parcerias?${query.toString()}`);
}

export async function getPartnershipById(id) {
  return apiRequest(`/api/parcerias/${id}`);
}

export async function createPartnership(data) {
  return apiRequest('/api/parcerias', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePartnershipStatus(id, status, notas) {
  return apiRequest(`/api/parcerias/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notas }) });
}

export async function deletePartnership(id) {
  return apiRequest(`/api/parcerias/${id}`, { method: 'DELETE' });
}

export async function getPartnershipStats() {
  return apiRequest('/api/parcerias/stats');
}
