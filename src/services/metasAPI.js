// src/services/metasAPI.js
// API service for the Metas (Goals) team calendar module.

import { apiRequest } from '../lib/apiConfig.js';

const BASE = '/api/metas';

// ── Metas ─────────────────────────────────────────────────

export async function getMetas() {
  const res = await apiRequest(BASE, { method: 'GET' });
  return res?.data ?? [];
}

export async function getMetaById(id) {
  const res = await apiRequest(`${BASE}/${id}`, { method: 'GET' });
  return res?.data ?? null;
}

export async function createMeta(data) {
  const res = await apiRequest(BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res?.data ?? res;
}

export async function updateMeta(id, data) {
  const res = await apiRequest(`${BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res?.data ?? res;
}

export async function deleteMeta(id) {
  return apiRequest(`${BASE}/${id}`, { method: 'DELETE' });
}

// ── Observations ───────────────────────────────────────────

export async function addObservation(metaId, content) {
  const res = await apiRequest(`${BASE}/${metaId}/observations`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return res?.data ?? res;
}

export async function deleteObservation(metaId, obsId) {
  return apiRequest(`${BASE}/${metaId}/observations/${obsId}`, { method: 'DELETE' });
}

// ── Team members ───────────────────────────────────────────

export async function getTeamMembers() {
  const res = await apiRequest(`${BASE}/team-members`, { method: 'GET' });
  return res?.data ?? [];
}

// ── Google Calendar ────────────────────────────────────────

export async function getCalendarStatus() {
  return apiRequest(`${BASE}/google/status`, { method: 'GET' });
}

export async function getCalendarConnectUrl() {
  const res = await apiRequest(`${BASE}/google/connect-url`, { method: 'GET' });
  return res?.url ?? null;
}

export async function disconnectCalendar() {
  return apiRequest(`${BASE}/google/disconnect`, { method: 'DELETE' });
}
