// src/services/rankingAPI.js
// Serviço centralizado para operações com ranking

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Busca dados do ranking
 * @returns {Promise<Object>} Dados do ranking (actives, inactives, top3, settings)
 */
export async function getRanking() {
  const response = await fetch(`${API_BASE_URL}/api/ranking`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar ranking: ${response.status}`);
  }

  return await response.json();
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
  const response = await fetch(`${API_BASE_URL}/api/ranking/points/${crafterId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'admin', // TODO: usar ID do usuário logado
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar pontos: ${response.status}`);
  }

  return await response.json();
}

/**
 * Atualiza o top 3 do ranking
 * @param {Array} top3 - Array com 3 objetos {crafter_id, position, reward}
 * @returns {Promise<Object>} Resultado da atualização
 */
export async function updateTop3(top3) {
  const response = await fetch(`${API_BASE_URL}/api/ranking/top3`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'admin', // TODO: usar ID do usuário logado
    },
    body: JSON.stringify({ top3 }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar top3: ${response.status}`);
  }

  return await response.json();
}

/**
 * Busca histórico de auditoria do ranking
 * @returns {Promise<Array>} Lista de logs de auditoria
 */
export async function getRankingAudit() {
  const response = await fetch(`${API_BASE_URL}/api/ranking/audit`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar auditoria: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Atualiza filtros do ranking
 * @param {Object} filters - Filtros a aplicar
 * @returns {Promise<Object>} Resultado da atualização
 */
export async function updateRankingFilters(filters) {
  const response = await fetch(`${API_BASE_URL}/api/ranking/filters`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'admin', // TODO: usar ID do usuário logado
    },
    body: JSON.stringify(filters),
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar filtros: ${response.status}`);
  }

  return await response.json();
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
    
    const url = `${API_BASE_URL}/api/crafters${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar crafters: ${response.status}`);
    }
    
    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/crafters/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Crafter não encontrado');
      }
      throw new Error(`Erro ao buscar crafter: ${response.status}`);
    }
    
    return await response.json();
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
  const response = await fetch(`${API_BASE_URL}/api/crafters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'admin', // TODO: usar ID do usuário logado
    },
    body: JSON.stringify(crafter),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar crafter: ${response.status}`);
  }

  const data = await response.json();
  return data.crafter;
}

/**
 * Atualiza um crafter existente
 * @param {string|number} id - ID do crafter
 * @param {Object} updates - Dados para atualizar
 * @returns {Promise<Object>} Crafter atualizado
 */
export async function updateCrafter(id, updates) {
  const response = await fetch(`${API_BASE_URL}/api/crafters/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'admin', // TODO: usar ID do usuário logado
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar crafter: ${response.status}`);
  }

  const data = await response.json();
  return data.crafter;
}

/**
 * Remove um crafter (soft delete)
 * @param {string|number} id - ID do crafter
 * @returns {Promise<boolean>} Sucesso da operação
 */
export async function deleteCrafter(id) {
  const response = await fetch(`${API_BASE_URL}/api/crafters/${id}`, {
    method: 'DELETE',
    headers: {
      'X-User-Id': 'admin', // TODO: usar ID do usuário logado
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao deletar crafter: ${response.status}`);
  }

  const data = await response.json();
  return data.success;
}