// src/services/userAPI.js
// Serviço centralizado para operações com usuários administrativos
import { apiRequest } from '../lib/apiConfig.js'; // Importa a função central

/**
 * Busca todos os usuários administrativos
 * @returns {Promise<Array>} Lista de usuários
 */
export async function getUsers() {
  try {
    // CORREÇÃO: Usa apiRequest
    const data = await apiRequest('/api/auth/users', {
      method: 'GET'
    });
    
    // Mapear os campos do banco para o formato esperado pelo frontend
    return data.map(user => ({
      id: user.id.toString(),
      name: user.nome,
      email: user.email,
      role: user.role,
      status: user.status === 'ativo' ? 'active' : 'inactive'
    }));
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw error;
  }
}

/**
 * Cria um novo usuário administrativo
 * @param {Object} user - Dados do usuário
 * @returns {Promise<Object>} Usuário criado
 */
export async function createUser(user) {
  try {
    // CORREÇÃO: Usa apiRequest
    const data = await apiRequest('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify({
        nome: user.name,
        email: user.email,
        senha: user.password,
        role: user.role || 'viewer'
      })
    });

    // Mapear o resultado para o formato esperado
    return {
      ok: true,
      data: {
        id: data.user.id.toString(),
        name: data.user.nome,
        email: data.user.email,
        role: data.user.role,
        status: data.user.status === 'ativo' ? 'active' : 'inactive'
      }
    };
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Atualiza um usuário existente
 * @param {string} id - ID do usuário
 * @param {Object} updates - Dados para atualizar
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function updateUser(id, updates) {
  try {
    // CORREÇÃO: Usa apiRequest
    const data = await apiRequest(`/api/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nome: updates.name,
        email: updates.email,
        role: updates.role,
        status: updates.status === 'active' ? 'ativo' : 'inativo'
      })
    });
    
    return {
      ok: true,
      data: {
        id: data.user.id.toString(),
        name: data.user.nome,
        email: data.user.email,
        role: data.user.role,
        status: data.user.status === 'ativo' ? 'active' : 'inactive'
      }
    };
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Alterna o status de um usuário (ativo/inativo)
 * @param {string} id - ID do usuário
 * @returns {Promise<Object>} Resultado da operação
 */
export async function toggleUserStatus(id) {
  try {
    // CORREÇÃO: Usa apiRequest
    const data = await apiRequest(`/api/auth/users/${id}/toggle-status`, {
      method: 'PATCH'
    });
    
    return {
      ok: true,
      data: {
        id: data.user.id.toString(),
        name: data.user.nome,
        email: data.user.email,
        role: data.user.role,
        status: data.user.status === 'ativo' ? 'active' : 'inactive'
      }
    };
  } catch (error) {
    console.error('Erro ao alternar status do usuário:', error);
    return {
      ok: false,
      error: error.message
    };
  }
}