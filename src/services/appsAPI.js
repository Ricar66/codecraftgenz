// src/services/appsAPI.js
import { apiRequest } from '../lib/apiConfig.js';

// Lista apps do usuário autenticado
export async function getMyApps({ page = 1, pageSize = 12, limit, sortBy, sortOrder = 'desc' } = {}) {
  const qp = new URLSearchParams();
  qp.set('page', page);
  qp.set('pageSize', pageSize ?? limit ?? 12);
  if (sortBy) qp.set('sortBy', sortBy);
  if (sortOrder) qp.set('sortOrder', sortOrder);
  return apiRequest(`/api/apps/mine?${qp.toString()}`, { method: 'GET' });
}

// Lista todos apps (admin ou público conforme backend)
export async function getAllApps({ page = 1, pageSize = 50, limit, sortBy, sortOrder = 'desc' } = {}) {
  const qp = new URLSearchParams();
  qp.set('page', page);
  qp.set('pageSize', pageSize ?? limit ?? 50);
  if (sortBy) qp.set('sortBy', sortBy);
  if (sortOrder) qp.set('sortOrder', sortOrder);
  try {
    // Tenta rota admin; se 401, faz fallback para rota pública
    return await apiRequest(`/api/apps?${qp.toString()}`, { method: 'GET' });
  } catch (err) {
    if (err && (err.status === 401 || String(err.message).toLowerCase().includes('não autenticado'))) {
      return apiRequest(`/api/apps/public?${qp.toString()}`, { method: 'GET' });
    }
    throw err;
  }
}

// Detalhes de um app
export async function getAppById(appId) {
  return apiRequest(`/api/apps/${appId}`, { method: 'GET' });
}

// Criar/atualizar card de app a partir de um projeto (admin)
export async function upsertAppFromProject(projectId, data = {}) {
  return apiRequest(`/api/apps/from-project/${projectId}`, { method: 'POST', body: JSON.stringify(data) });
}

// Editar card de app (admin)
export async function updateApp(appId, data) {
  return apiRequest(`/api/apps/${appId}`, { method: 'PUT', body: JSON.stringify(data) });
}

// Mercado Livre/Mercado Pago – criar preferência de pagamento
export async function createPaymentPreference(appId) {
  // Backend deve integrar com Mercado Pago usando credenciais seguras (server-side)
  return apiRequest(`/api/apps/${appId}/purchase`, { method: 'POST' });
}

// Consultar status da compra (retorno/redirect)
export async function getPurchaseStatus(appId, params = {}) {
  const qp = new URLSearchParams(params).toString();
  return apiRequest(`/api/apps/${appId}/purchase/status?${qp}`, { method: 'GET' });
}

// Registrar download liberado
export async function registerDownload(appId) {
  return apiRequest(`/api/apps/${appId}/download`, { method: 'POST' });
}

// Histórico (compras e downloads)
export async function getHistory({ page = 1, pageSize = 20 } = {}) {
  return apiRequest(`/api/apps/history?page=${page}&pageSize=${pageSize}`, { method: 'GET' });
}

// Feedback do app
export async function submitFeedback(appId, { rating, comment }) {
  return apiRequest(`/api/apps/${appId}/feedback`, { method: 'POST', body: JSON.stringify({ rating, comment }) });
}