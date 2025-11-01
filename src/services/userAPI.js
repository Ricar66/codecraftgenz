// src/services/userAPI.js
// Serviço centralizado para operações com usuários administrativos

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Busca todos os usuários administrativos
 * @returns {Promise<Array>} Lista de usuários
 */
export async function getUsers() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
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
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nome: user.name,
        email: user.email,
        senha: user.password,
        role: user.role || 'viewer'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
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
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/api/auth/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nome: updates.name,
        email: updates.email,
        role: updates.role,
        status: updates.status === 'active' ? 'ativo' : 'inativo'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
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
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/api/auth/users/${id}/toggle-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
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