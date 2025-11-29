// src/services/appsAPI.js
import { apiRequest } from '../lib/apiConfig.js';
import { API_BASE_URL } from '../lib/apiConfig.js';

// Lista apps do usuário autenticado
export async function getMyApps({ page = 1, pageSize = 12, limit, sortBy, sortOrder = 'desc' } = {}) {
  const qp = new URLSearchParams();
  qp.set('page', page);
  qp.set('pageSize', pageSize ?? limit ?? 12);
  if (sortBy) qp.set('sortBy', sortBy);
  if (sortOrder) qp.set('sortOrder', sortOrder);
  const resp = await apiRequest(`/api/apps/mine?${qp.toString()}`, { method: 'GET' });
  return resp?.data ?? resp;
}

// Lista aplicativos públicos (sem autenticação)
export async function getPublicApps({ page = 1, pageSize = 24, sortBy = 'updatedAt', sortOrder } = {}) {
  const qp = new URLSearchParams();
  qp.set('page', page);
  qp.set('pageSize', pageSize);
  qp.set('sortBy', sortBy);
  if (sortOrder) qp.set('sortOrder', sortOrder);
  const resp = await apiRequest(`/api/apps/public?${qp.toString()}`, { method: 'GET' });
  return resp?.data ?? resp;
}

// Lista todos apps (admin ou público conforme backend)
export async function getAllApps({ page = 1, pageSize = 50, limit, sortBy, sortOrder = 'desc', publicFallback } = {}) {
  const qp = new URLSearchParams();
  qp.set('page', page);
  qp.set('pageSize', pageSize ?? limit ?? 50);
  if (sortBy) qp.set('sortBy', sortBy);
  if (sortOrder) qp.set('sortOrder', sortOrder);
  try {
    const resp = await apiRequest(`/api/apps?${qp.toString()}`, { method: 'GET' });
    return resp.data;
  } catch (err) {
    const envFlag = String(import.meta.env.VITE_ADMIN_PUBLIC_FALLBACK || 'off').toLowerCase();
    const fbEnabled = publicFallback !== undefined ? !!publicFallback : !['off','false','0'].includes(envFlag);
    const msg = String(err?.message || '').toLowerCase();
    const isUnauthorized = err && (err.status === 401 || msg.includes('não autenticado') || msg.includes('unauthorized') || msg.includes('401'));
    const isNetwork = err && (err.status === 0 || err.type === 'network' || msg.includes('conexão') || msg.includes('network'));
    const isServerError = err && (Number(err.status) >= 500);
    if (fbEnabled && (isUnauthorized || isNetwork || isServerError)) {
      const pubResp = await apiRequest(`/api/apps/public?${qp.toString()}`, { method: 'GET' });
      return pubResp.data;
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

export async function createApp(data) {
  return apiRequest(`/api/apps`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteApp(appId) {
  return apiRequest(`/api/apps/${appId}`, { method: 'DELETE' });
}

// Admin – upload de executável
export async function uploadAppExecutable(appId, file) {
  const fd = new FormData();
  fd.append('file', file);
  let authHeader = {};
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('cc_session') : null;
    if (raw) { const session = JSON.parse(raw); if (session?.token) authHeader = { Authorization: `Bearer ${session.token}` }; }
  } catch {}
  const resp = await fetch(`${API_BASE_URL}/api/apps/${appId}/executable/upload`, {
    method: 'POST',
    headers: { ...authHeader },
    body: fd,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(()=>({}));
    const e = new Error(err?.error || `HTTP ${resp.status}`);
    e.status = resp.status;
    throw e;
  }
  return resp.json();
}

// Mercado Livre/Mercado Pago – criar preferência de pagamento
export async function createPaymentPreference(appId, options = {}) {
  // Backend integra com Mercado Pago usando credenciais seguras (server-side)
  // options pode incluir: payment_methods, statement_descriptor, expires, expiration_date_from, expiration_date_to, payer
  const body = Object.keys(options || {}).length ? JSON.stringify(options) : undefined;
  return apiRequest(`/api/apps/${appId}/purchase`, { method: 'POST', ...(body ? { body } : {}) });
}

// Mercado Pago – criar pagamento direto (cartão/pix/boleto)
export async function createDirectPayment(appId, payload = {}, extra = {}) {
  // payload pode incluir: token (cartão), payment_method_id, installments, payer, additional_info
  const headers = {};
  if (extra?.deviceId) headers['x-device-id'] = String(extra.deviceId);
  if (extra?.trackingId) headers['x-tracking-id'] = String(extra.trackingId);
  return apiRequest(`/api/apps/${appId}/payment/direct`, { method: 'POST', body: JSON.stringify(payload), headers });
}

// Mercado Pago – buscar pagamentos (últimos 12 meses)
export async function searchPayments(params = {}) {
  const qp = new URLSearchParams(params).toString();
  return apiRequest(`/api/payments/search?${qp}`, { method: 'GET' });
}

// Mercado Pago – obter pagamento por ID
export async function getPaymentById(id) {
  if (id === undefined || id === null || String(id).length === 0) {
    throw new Error('id é obrigatório');
  }
  return apiRequest(`/api/payments/${encodeURIComponent(String(id))}`, { method: 'GET' });
}

// Mercado Pago – atualizar pagamento por ID (PUT)
export async function updatePaymentById(id, payload = {}) {
  if (id === undefined || id === null || String(id).length === 0) {
    throw new Error('id é obrigatório');
  }
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    throw new Error('payload JSON é obrigatório');
  }
  return apiRequest(`/api/payments/${encodeURIComponent(String(id))}`, { method: 'PUT', body: JSON.stringify(payload) });
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

// Admin – listar pagamentos do banco (app_payments)
export async function adminListAppPayments(params = {}) {
  const qp = new URLSearchParams(params).toString();
  return apiRequest(`/api/admin/app-payments?${qp}`, { method: 'GET' });
}

// Admin – obter pagamento + auditoria por payment_id
export async function adminGetAppPayment(paymentId) {
  if (!paymentId) throw new Error('paymentId é obrigatório');
  return apiRequest(`/api/admin/app-payments/${encodeURIComponent(String(paymentId))}`, { method: 'GET' });
}

// Obter último resultado de pagamento direto (cache em memória do backend)
export async function getLastDirectPayment(appId) {
  if (!appId) throw new Error('appId é obrigatório');
  return apiRequest(`/api/apps/${appId}/payment/last`, { method: 'GET' });
}
