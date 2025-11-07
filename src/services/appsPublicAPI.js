import { apiRequest } from '../lib/apiConfig.js';

// Lista aplicativos públicos para download
export async function getPublicApps({ page = 1, pageSize = 24, sortBy = 'updatedAt' } = {}) {
  return apiRequest(`/api/apps/public?page=${page}&pageSize=${pageSize}&sortBy=${encodeURIComponent(sortBy)}`);
}

// Cria preferência de pagamento para um app específico (se necessário em outro fluxo)
export async function createPaymentPreference(appId) {
  return apiRequest(`/api/apps/${encodeURIComponent(appId)}/purchase`, { method: 'POST' });
}

// Consulta status de pagamento do app para o usuário atual
export async function getPurchaseStatus(appId) {
  return apiRequest(`/api/apps/${encodeURIComponent(appId)}/purchase/status`, { method: 'GET' });
}