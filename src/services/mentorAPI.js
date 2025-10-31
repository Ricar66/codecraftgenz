// src/services/mentorAPI.js
// Serviço centralizado para operações com mentores

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Busca todos os mentores
 * @param {Object} options - Opções da busca
 * @param {boolean} options.all - Se deve incluir mentores não visíveis (admin)
 * @returns {Promise<Array>} Lista de mentores
 */
export async function getMentors(options = {}) {
  const { all = false } = options;
  const url = `${API_BASE_URL}/api/mentores${all ? '?all=1' : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar mentores: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Busca um mentor por ID
 * @param {string|number} id - ID do mentor
 * @returns {Promise<Object>} Dados do mentor
 */
export async function getMentorById(id) {
  const response = await fetch(`${API_BASE_URL}/api/mentores/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar mentor: ${response.status}`);
  }

  const data = await response.json();
  return data.mentor;
}

/**
 * Cria um novo mentor
 * @param {Object} mentor - Dados do mentor
 * @returns {Promise<Object>} Mentor criado
 */
export async function createMentor(mentor) {
  const response = await fetch(`${API_BASE_URL}/api/mentores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mentor),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar mentor: ${response.status}`);
  }

  const data = await response.json();
  return data.mentor;
}

/**
 * Atualiza um mentor existente
 * @param {string|number} id - ID do mentor
 * @param {Object} updates - Dados para atualizar
 * @returns {Promise<Object>} Mentor atualizado
 */
export async function updateMentor(id, updates) {
  const response = await fetch(`${API_BASE_URL}/api/mentores/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar mentor: ${response.status}`);
  }

  const data = await response.json();
  return data.mentor;
}

/**
 * Remove um mentor
 * @param {string|number} id - ID do mentor
 * @returns {Promise<Object>} Mentor removido
 */
export async function deleteMentor(id) {
  const response = await fetch(`${API_BASE_URL}/api/mentores/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao remover mentor: ${response.status}`);
  }

  const data = await response.json();
  return data.removed;
}