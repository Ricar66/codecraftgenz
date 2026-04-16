import { apiRequest } from '../lib/apiConfig.js';

export async function getDiscordAuthUrl() {
  return apiRequest('/api/discord/auth/url');
}

export async function getDiscordStatus() {
  return apiRequest('/api/discord/status');
}

export async function unlinkDiscord() {
  return apiRequest('/api/discord/unlink', { method: 'DELETE' });
}

// Admin
export async function getBotStatus() {
  return apiRequest('/api/discord/bot-status');
}

export async function getBotConfig() {
  return apiRequest('/api/discord/config');
}

export async function updateBotConfig(config) {
  return apiRequest('/api/discord/config', { method: 'PUT', body: JSON.stringify(config) });
}

export async function getBotLogs(page = 1) {
  return apiRequest(`/api/discord/logs?page=${page}`);
}

export async function triggerBotAction(action) {
  return apiRequest(`/api/discord/trigger/${action}`, { method: 'POST' });
}

export async function getMemberRanking({ page = 1, limit = 50, role = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (role) params.set('role', role);
  return apiRequest(`/api/discord/ranking?${params}`);
}
