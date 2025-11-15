// src/lib/apiConfig.js
// Configuração centralizada da API
import { useState, useEffect } from 'react';

// Detecta o ambiente e configura a URL base da API
const getApiBaseUrl = () => {
  const isDev = import.meta.env.DEV;
  const devApiUrl = import.meta.env.VITE_API_URL;
  if (isDev) {
    return devApiUrl || 'http://localhost:8080';
  }
  const prodApiUrl = import.meta.env.VITE_API_URL;
  const allowExternal = String(import.meta.env.VITE_ALLOW_EXTERNAL_API || 'false').toLowerCase();
  const allow = ['true','1','yes','on'].includes(allowExternal);
  if (prodApiUrl && allow) {
    return prodApiUrl;
  }
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
    if (import.meta.env.DEV) {
      const m = String(options.method || 'GET').toUpperCase();
      console.log('[API:req]', m, endpoint);
    }
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(import.meta.env.VITE_CSRF_SECRET ? { 'x-csrf-token': String(import.meta.env.VITE_CSRF_SECRET) } : {}),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      // Tenta extrair mensagem de erro do servidor e propaga detalhes
      let errorMessage = `HTTP ${response.status}`;
      let errorDetails = null;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        errorDetails = errorData;
      } catch {
        // Se não conseguir parsear JSON, usa mensagem padrão
      }

      const apiError = new Error(errorMessage);
      apiError.status = response.status;
      if (errorDetails) apiError.details = errorDetails;
      if (import.meta.env.DEV) {
        console.error('[API:err]', endpoint, apiError.status, errorMessage, errorDetails || '');
      }
      throw apiError;
    }

    // Retorna a resposta respeitando Content-Type
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      if (import.meta.env.DEV) {
        const size = Array.isArray(json?.data) ? json.data.length : (Array.isArray(json) ? json.length : undefined);
        console.log('[API:ok]', endpoint, response.status, typeof size === 'number' ? `items=${size}` : 'json');
      }
      return json;
    }
    const text = await response.text();
    if (!text) return {};
    const ctLower = (response.headers.get('content-type') || '').toLowerCase();
    if (ctLower.includes('text/html')) {
      const e = new Error('Resposta da API não é JSON (recebido HTML). Verifique proxy /api ou base da API.');
      e.status = response.status;
      throw e;
    }
    throw new Error('Resposta da API não é JSON');

  } catch (error) {
    // Se for erro de rede (ex: ERR_CONNECTION_REFUSED)
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      const networkError = new Error('Erro de conexão: Verifique sua internet e tente novamente');
      networkError.type = 'network';
      networkError.status = 0;
      throw networkError;
    }
    
    if (import.meta.env.DEV) {
      console.error('[API:catch]', endpoint, error?.status || 0, error?.message || error);
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