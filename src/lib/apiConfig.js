// src/lib/apiConfig.js
// Configuração centralizada da API
import { useState, useEffect } from 'react';

// Detecta o ambiente e configura a URL base da API
// Em desenvolvimento, usa localhost:8080/api
// Em produção (Azure), usa URL relativa "/api" no mesmo domínio do site
const isDevelopment = import.meta.env.DEV;
export const API_BASE_URL = isDevelopment ? 'http://localhost:8080/api' : '/api';

// Função para fazer requisições com tratamento de erro melhorado
export async function apiRequest(endpoint, options = {}) {
  // Normaliza endpoint para evitar duplicação de "/api"
  const hasApiInBase = API_BASE_URL.endsWith('/api');
  const normalizedEndpoint = hasApiInBase && endpoint.startsWith('/api')
    ? endpoint.replace(/^\/api/, '')
    : endpoint;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;
  // Recupera token da sessão se existir
  let authHeader = {};
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('cc_session') : null;
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.token) {
        authHeader = { Authorization: `Bearer ${session.token}` };
      }
    }
  } catch {
    // Ignora erros de parse/localStorage indisponível
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      // Tenta extrair mensagem de erro do servidor
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Se não conseguir parsear JSON, usa mensagem padrão
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    // Se for erro de rede, fornece uma mensagem mais clara
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Não foi possível conectar com o servidor. Verifique se a API está rodando.');
    }
    
    throw error;
  }
}

// Função para verificar se a API está disponível
export async function checkApiHealth() {
  try {
    await apiRequest('/api/test-db');
    return { available: true };
  } catch (error) {
    return { 
      available: false, 
      error: error.message 
    };
  }
}

// Hook para verificar status da API
export function useApiHealth() {
  const [status, setStatus] = useState({ 
    available: null, 
    loading: true, 
    error: null 
  });

  useEffect(() => {
    checkApiHealth().then(result => {
      setStatus({
        available: result.available,
        loading: false,
        error: result.error || null
      });
    });
  }, []);

  return status;
}

// Objeto de configuração da API (para compatibilidade com imports existentes)
export const apiConfig = {
  baseURL: API_BASE_URL
};