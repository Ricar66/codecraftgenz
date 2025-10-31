// src/services/userAPI.js
// Serviço centralizado para operações com usuários administrativos

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Busca todos os usuários administrativos
 * @returns {Promise<Array>} Lista de usuários
 */
export async function getUsers() {
  // Por enquanto, retorna dados mock já que não há endpoint específico para usuários admin
  // TODO: Implementar endpoint /api/users no backend quando necessário
  return [
    { 
      id: 'u1', 
      name: 'Admin', 
      email: 'admin@codecraft.dev', 
      role: 'admin', 
      status: 'active' 
    }
  ];
}

/**
 * Cria um novo usuário administrativo
 * @param {Object} user - Dados do usuário
 * @returns {Promise<Object>} Usuário criado
 */
export async function createUser(_user) { // eslint-disable-line no-unused-vars
  // TODO: Implementar quando houver endpoint no backend
  throw new Error('Funcionalidade não implementada no backend');
}

/**
 * Atualiza um usuário existente
 * @param {string} id - ID do usuário
 * @param {Object} updates - Dados para atualizar
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function updateUser(_id, _updates) { // eslint-disable-line no-unused-vars
  // TODO: Implementar quando houver endpoint no backend
  throw new Error('Funcionalidade não implementada no backend');
}

/**
 * Alterna o status de um usuário (ativo/inativo)
 * @param {string} id - ID do usuário
 * @returns {Promise<Object>} Resultado da operação
 */
export async function toggleUserStatus(_id) { // eslint-disable-line no-unused-vars
  // TODO: Implementar quando houver endpoint no backend
  throw new Error('Funcionalidade não implementada no backend');
}