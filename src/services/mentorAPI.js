// src/services/mentorAPI.js
// Serviço centralizado para operações com mentores
import { apiRequest } from '../lib/apiConfig.js';

/**
 * Busca todos os mentores
 * @param {Object} options - Opções da busca
 * @param {boolean} options.all - Se deve incluir mentores não visíveis (admin)
 * @returns {Promise<Array>} Lista de mentores
 */
export async function getMentors(options = {}) {
  const { all = false } = options;
  const url = `/api/mentores${all ? '?all=1' : ''}`;
  const data = await apiRequest(url, { method: 'GET' });
  return data.data || [];
}

/**
 * Busca um mentor por ID
 * @param {string|number} id - ID do mentor
 * @returns {Promise<Object>} Dados do mentor
 */
export async function getMentorById(id) {
  const data = await apiRequest(`/api/mentores/${id}`, { method: 'GET' });
  return data.mentor;
}

/**
 * Cria um novo mentor
 * @param {Object} mentor - Dados do mentor
 * @returns {Promise<Object>} Mentor criado
 */
export async function createMentor(mentor) {
  const data = await apiRequest(`/api/mentores`, {
    method: 'POST',
    body: JSON.stringify(mentor),
  });
  return data.mentor;
}

/**
 * Atualiza um mentor existente
 * @param {string|number} id - ID do mentor
 * @param {Object} updates - Dados para atualizar
 * @returns {Promise<Object>} Mentor atualizado
 */
export async function updateMentor(id, updates) {
  const data = await apiRequest(`/api/mentores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return data.mentor;
}

/**
 * Remove um mentor
 * @param {string|number} id - ID do mentor
 * @returns {Promise<Object>} Mentor removido
 */
export async function deleteMentor(id) {
  const data = await apiRequest(`/api/mentores/${id}`, { method: 'DELETE' });
  return data.removed;
}