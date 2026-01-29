// src/services/dashboardAPI.js
import { apiRequest } from '../lib/apiConfig.js';

/**
 * Get dashboard statistics with real data
 * @param {string} periodo - Period filter (e.g., '7d', '30d', '90d')
 * @returns {Promise<Object>} Dashboard stats
 */
export async function getDashboardStats(periodo = '30d') {
  const resp = await apiRequest(`/api/dashboard/stats?periodo=${periodo}`, { method: 'GET' });
  return resp?.data ?? resp;
}

/**
 * Get key performance indicators
 * @returns {Promise<Object>} KPIs data
 */
export async function getDashboardKPIs() {
  const resp = await apiRequest('/api/dashboard/kpis', { method: 'GET' });
  return resp?.data ?? resp;
}

/**
 * Get dashboard summary (legacy endpoint)
 * @param {string} periodo - Period filter
 * @returns {Promise<Object>} Dashboard summary
 */
export async function getDashboardResumo(periodo = '30d') {
  const resp = await apiRequest(`/api/dashboard/resumo?periodo=${periodo}`, { method: 'GET' });
  return resp?.data ?? resp;
}
