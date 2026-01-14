// src/services/rankingAPI.js
// Serviço centralizado para operações com ranking
import { apiRequest } from '../lib/apiConfig.js';

/**
 * Busca dados do ranking
 * @returns {Promise<Object>} Dados do ranking (actives, inactives, top3, settings)
 */
export async function getRanking() {
  return await apiRequest('/api/ranking', { method: 'GET', headers: { 'Cache-Control': 'no-cache' } });
}

/**
 * Atualiza pontos de um crafter
 * @param {string|number} crafterId - ID do crafter
 * @param {Object} options - Opções da atualização
 * @param {number} options.delta - Mudança nos pontos (pode ser negativa)
 * @param {number} options.set - Valor absoluto para definir
 * @returns {Promise<Object>} Resultado da atualização
 */
export async function updateCrafterPoints(crafterId, options = {}) {
  // CORRIGIDO: Path correto é /api/crafters/points (não /api/ranking/points)
  return await apiRequest(`/api/crafters/points/${crafterId}`, {
    method: 'PUT',
    body: JSON.stringify(options),
  });
}

/**
 * Atualiza o top 3 do ranking
 * @param {Array} top3 - Array com 3 objetos {crafter_id, position, reward}
 * @returns {Promise<Object>} Resultado da atualização
 */
export async function updateTop3(top3) {
  // CORRIGIDO: Path correto é /api/crafters/top3 (não /api/ranking/top3)
  return await apiRequest('/api/crafters/top3', {
    method: 'PUT',
    body: JSON.stringify({ top3 }),
  });
}

/**
 * Busca histórico de auditoria do ranking
 * @returns {Promise<Array>} Lista de logs de auditoria
 */
export async function getRankingAudit() {
  // CORRIGIDO: Path correto é /api/crafters/audit (não /api/ranking/audit)
  const data = await apiRequest('/api/crafters/audit', { method: 'GET' });
  return data.data || [];
}

/**
 * Atualiza filtros do ranking
 * @param {Object} filters - Filtros a aplicar
 * @returns {Promise<Object>} Resultado da atualização
 */
export async function updateRankingFilters(filters) {
  // CORRIGIDO: Path correto é /api/crafters/filters (não /api/ranking/filters)
  return await apiRequest('/api/crafters/filters', {
    method: 'PUT',
    body: JSON.stringify(filters),
  });
}

/**
 * Busca lista de crafters
 * @param {Object} options - Opções de busca
 * @param {number} options.page - Página atual
 * @param {number} options.limit - Limite por página
 * @param {string} options.search - Termo de busca
 * @param {boolean} options.active_only - Apenas crafters ativos
 * @param {string} options.order_by - Campo para ordenação
 * @param {string} options.order_direction - Direção da ordenação
 * @returns {Promise<Object>} Dados paginados dos crafters
 */
export async function getCrafters(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    if (options.search) params.append('search', options.search);
    if (options.active_only !== undefined) params.append('active_only', options.active_only);
    if (options.order_by) params.append('order_by', options.order_by);
    if (options.order_direction) params.append('order_direction', options.order_direction);
    if (options.nivel) params.append('nivel', options.nivel);
    if (options.min_points !== undefined && options.min_points !== '') params.append('min_points', options.min_points);
    if (options.max_points !== undefined && options.max_points !== '') params.append('max_points', options.max_points);

    const url = `/api/crafters${params.toString() ? '?' + params.toString() : ''}`;
    return await apiRequest(url, { method: 'GET' });
  } catch (error) {
    console.error('Erro ao buscar crafters:', error);
    throw error;
  }
}

/**
 * Busca um crafter por ID
 * @param {string|number} id - ID do crafter
 * @returns {Promise<Object>} Dados do crafter
 */
export async function getCrafterById(id) {
  try {
    return await apiRequest(`/api/crafters/${id}`, { method: 'GET' });
  } catch (error) {
    console.error('Erro ao buscar crafter:', error);
    throw error;
  }
}

/**
 * Cria um novo crafter
 * @param {Object} crafter - Dados do crafter
 * @returns {Promise<Object>} Crafter criado
 */
export async function createCrafter(crafter) {
  const data = await apiRequest('/api/crafters', {
    method: 'POST',
    body: JSON.stringify(crafter),
  });
  return data.crafter;
}

/**
 * Atualiza um crafter existente
 * @param {string|number} id - ID do crafter
 * @param {Object} updates - Dados para atualizar
 * @returns {Promise<Object>} Crafter atualizado
 */
export async function updateCrafter(id, updates) {
  const data = await apiRequest(`/api/crafters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return data.crafter;
}

/**
 * Remove um crafter (soft delete)
 * @param {string|number} id - ID do crafter
 * @returns {Promise<boolean>} Sucesso da operação
 */
export async function deleteCrafter(id) {
  const data = await apiRequest(`/api/crafters/${id}`, { method: 'DELETE' });
  return data.success;
}
