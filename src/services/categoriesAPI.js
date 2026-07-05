// src/services/categoriesAPI.js
// Categorias da loja de apps — endpoint público (pills da loja) + endpoints admin (CRUD).
import { apiRequest } from '../lib/apiConfig.js';

// Público — categorias ativas, ordenadas por `order`. Consumido por AppsPage.
export async function getPublicCategories() {
  const resp = await apiRequest('/api/categories/public', { method: 'GET' });
  return resp?.data ?? resp;
}

// Admin — todas as categorias (com apps_count).
export async function getCategories() {
  const resp = await apiRequest('/api/categories', { method: 'GET' });
  return resp?.data ?? resp;
}

export async function getCategoryById(id) {
  const resp = await apiRequest(`/api/categories/${encodeURIComponent(id)}`, { method: 'GET' });
  return resp?.data ?? resp;
}

// data: { name, icon?, order?, active? } — slug é gerado no backend a partir do name.
export async function createCategory(data) {
  return apiRequest('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id, data) {
  return apiRequest(`/api/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id) {
  return apiRequest(`/api/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
