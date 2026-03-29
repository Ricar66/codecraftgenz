// src/services/userAPI.js
// Serviço centralizado para operações com usuários administrativos
import { apiRequest } from '../lib/apiConfig.js'; // Importa a função central
import { normalizeUser } from '../utils/normalizers.js';

/**
 * Busca todos os usuários administrativos
 * @returns {Promise<Array>} Lista de usuários
 */
export async function getUsers() {
  try {
    const res = await apiRequest('/api/auth/users', { method: 'GET' });
    // Backend retorna { success: true, data: { users: [...] } }
    const list = Array.isArray(res?.data?.users) ? res.data.users : (
      Array.isArray(res?.data) ? res.data : (
        Array.isArray(res?.users) ? res.users : (
          Array.isArray(res) ? res : []
        )
      )
    );
    return list.map(normalizeUser);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw error;
  }
}

export async function getAllUsers() {
  const json = await apiRequest('/api/auth/users', { method: 'GET' });
  // Backend retorna { success: true, data: { users: [...] } }
  return json?.data?.users ?? json?.data ?? [];
}

/**
 * Cria um novo usuário administrativo
 * @param {Object} user - Dados do usuário
 * @returns {Promise<Object>} Usuário criado
 */
export async function createUser(user) {
  const response = await apiRequest('/api/auth/users', {
    method: 'POST',
    body: JSON.stringify({
      nome: user.name,
      email: user.email,
      senha: user.password,
      role: user.role || 'viewer'
    })
  });
  const userData = response?.data?.user || response?.user || response?.data;
  if (!userData) throw new Error('Resposta inválida do servidor');
  return normalizeUser(userData);
}

/**
 * Atualiza um usuário existente
 * @param {string} id - ID do usuário
 * @param {Object} updates - Dados para atualizar
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function updateUser(id, updates) {
  const payload = {
    nome: updates.name,
    email: updates.email,
    role: updates.role,
    status: updates.status === 'active' ? 'ativo' : 'inativo'
  };
  if (updates.password) payload.senha = updates.password;
  const response = await apiRequest(`/api/auth/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  const userData = response?.data?.user || response?.user || response?.data;
  if (!userData) throw new Error('Resposta inválida do servidor');
  return normalizeUser(userData);
}

/**
 * Alterna o status de um usuário (ativo/inativo)
 * @param {string} id - ID do usuário
 * @returns {Promise<Object>} Resultado da operação
 */
export async function toggleUserStatus(id) {
  const response = await apiRequest(`/api/auth/users/${id}/toggle-status`, {
    method: 'PATCH'
  });
  const userData = response?.data?.user || response?.user || response?.data;
  if (!userData) throw new Error('Resposta inválida do servidor');
  return normalizeUser(userData);
}

/**
 * Redefine a senha de um usuário admin via endpoint seguro
 * @param {Object} params
 * @param {string} params.email - E-mail do admin
 * @param {string} params.newPassword - Nova senha
 * @param {string} params.token - Token de reset (header x-admin-reset-token)
 * @returns {Promise<{ok:boolean, message?:string, error?:string}>}
 */
export async function resetAdminPassword({ email, newPassword, token }) {
  try {
    const data = await apiRequest('/api/auth/admin/reset-password', {
      method: 'POST',
      headers: {
        'x-admin-reset-token': token || '',
      },
      body: JSON.stringify({
        email,
        new_password: newPassword,
      })
    });
    return { ok: true, message: data.message || 'Senha redefinida com sucesso' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function requestPasswordReset(email) {
  try {
    const data = await apiRequest('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    return { ok: true, resetLink: data?.reset_link || null };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function confirmPasswordReset({ token, newPassword }) {
  try {
    // Backend espera 'password', não 'new_password'
    const data = await apiRequest('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword })
    });
    return { ok: true, message: data?.message || 'Senha redefinida com sucesso' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}