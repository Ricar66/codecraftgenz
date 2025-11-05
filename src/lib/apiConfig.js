// src/lib/apiConfig.js
// Configuração centralizada da API
import { useState, useEffect } from 'react';

// Detecta o ambiente e configura a URL base da API
const getApiBaseUrl = () => {
  // Verifica se há uma variável de ambiente VITE_API_URL definida
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl; // Ex: http://localhost:8080
  }
  
  // Em desenvolvimento, usa o proxy do Vite (localhost:8080)
  if (import.meta.env.DEV) {
    // CORREÇÃO: Removido o '/api' daqui.
    return 'http://localhost:8080';
  }
  
  // Em produção, usa a URL relativa (mesmo domínio)
  if (typeof window !== 'undefined') {
    // CORREÇÃO: Removido o '/api'. Agora é apenas uma string vazia.
    return ''; 
  }
  
  // Fallback
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Função para fazer requisições com tratamento de erro melhorado
export async function apiRequest(endpoint, options = {}) {
  // Agora o endpoint DEVE começar com /api/ (ex: /api/projetos)
  const url = `${API_BASE_URL}${endpoint}`;
  
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
      
      const apiError = new Error(errorMessage);
      apiError.status = response.status;
      throw apiError;
    }

    // Retorna a resposta JSON se houver conteúdo
    const text = await response.text();
    return text ? JSON.parse(text) : {};

  } catch (error) {
    // Se for erro de rede (ex: ERR_CONNECTION_REFUSED)
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      const networkError = new Error('Erro de conexão: Verifique sua internet e tente novamente');
      networkError.type = 'network';
      networkError.status = 0;
      throw networkError;
    }
    
    throw error;
  }
}

// Função para verificar se a API está disponível
export async function checkApiHealth() {
  try {
    // A rota /api/health é definida no server.js
    await apiRequest('/api/health'); 
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