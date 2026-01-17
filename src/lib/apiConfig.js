// src/lib/apiConfig.js
// Configuração centralizada da API
import { useState, useEffect } from 'react';

import { toBoolFlag } from '../utils/hooks.js';

// URL do backend em produção (Render)
const PROD_API_URL = 'https://codecraftgenz-monorepo.onrender.com';

// Detecta o ambiente e configura a URL base da API
const getApiBaseUrl = () => {
  const isDev = import.meta.env.DEV;
  const envApiUrl = import.meta.env.VITE_API_URL;

  // Em desenvolvimento, usa variável de ambiente ou localhost
  if (isDev) {
    return envApiUrl || 'http://localhost:8080';
  }

  // Em produção: usa variável de ambiente se configurada, senão usa URL hardcoded
  const allow = toBoolFlag(import.meta.env.VITE_ALLOW_EXTERNAL_API || 'true');
  if (envApiUrl && allow) {
    return envApiUrl;
  }

  // Fallback para URL de produção hardcoded (garante que sempre funciona)
  return PROD_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Função para fazer requisições com tratamento de erro melhorado
export function getAuthHeader() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('cc_session') : null;
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.token) {
        return { Authorization: `Bearer ${session.token}` };
      }
    }
  } catch (e) { void e }
  return {};
}

export function shouldFallbackPublic(err, overrideEnabled) {
  const envFlag = String(import.meta.env.VITE_ADMIN_PUBLIC_FALLBACK || 'off').toLowerCase();
  const enabled = overrideEnabled !== undefined ? !!overrideEnabled : !['off','false','0'].includes(envFlag);
  if (!enabled) return false;
  const msg = String(err?.message || '').toLowerCase();
  const status = Number(err?.status || 0);
  const unauthorized = status === 401 || msg.includes('não autenticado') || msg.includes('unauthorized') || msg.includes('401');
  const network = status === 0 || err?.type === 'network' || msg.includes('conexão') || msg.includes('network');
  const serverError = status >= 500;
  const nonJson = msg.includes('não é json') || msg.includes('html');
  return unauthorized || network || serverError || nonJson;
}

export async function apiRequest(endpoint, options = {}) {
  const isDebug = (
    import.meta.env.DEV ||
    toBoolFlag(import.meta.env.VITE_DEBUG_ADMIN || '') ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('cc_debug') === '1')
  );
  // Agora o endpoint DEVE começar com /api/ (ex: /api/projetos)
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Recupera token da sessão se existir
  const authHeader = getAuthHeader();
  
  try {
    const suppressLog = options.suppressLog === true;
    if (isDebug) {
      const m = String(options.method || 'GET').toUpperCase();
      console.log('[API:req]', m, endpoint);
    }
    const { headers: optHeaders, ...restOptions } = options;
    const response = await fetch(url, {
      ...restOptions,
      credentials: restOptions.credentials || 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(import.meta.env.VITE_CSRF_SECRET ? { 'x-csrf-token': String(import.meta.env.VITE_CSRF_SECRET) } : {}),
        ...optHeaders,
      },
    });

    if (!response.ok) {
      // Tenta extrair mensagem de erro do servidor e propaga detalhes
      let errorMessage = `HTTP ${response.status}`;
      let errorDetails = null;
      try {
        const errorData = await response.json();
        // Backend retorna { success: false, error: { code, message, details } }
        // Ou formato legado { error: string } ou { message: string }
        if (errorData.error && typeof errorData.error === 'object') {
          errorMessage = errorData.error.message || errorData.error.code || errorMessage;
          errorDetails = errorData.error.details;
        } else if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Se não conseguir parsear JSON, usa mensagem padrão
      }

      const apiError = new Error(errorMessage);
      apiError.status = response.status;
      if (errorDetails) apiError.details = errorDetails;
      if (isDebug && !suppressLog) {
        console.error('[API:err]', endpoint, apiError.status, errorMessage, errorDetails || '');
      }
      throw apiError;
    }

    // Retorna a resposta respeitando Content-Type
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      if (isDebug) {
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
    
    if (isDebug && options.suppressLog !== true) {
      console.error('[API:catch]', endpoint, error?.status || 0, error?.message || error);
    }
    throw error;
  }
}

export async function apiRequestMultipart(endpoint, formData, options = {}) {
  const isDebug = (
    import.meta.env.DEV ||
    toBoolFlag(import.meta.env.VITE_DEBUG_ADMIN || '') ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('cc_debug') === '1')
  );
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    ...getAuthHeader(),
    ...(import.meta.env.VITE_CSRF_SECRET ? { 'x-csrf-token': String(import.meta.env.VITE_CSRF_SECRET) } : {}),
    ...options.headers,
  };
  try {
    if (isDebug) {
      console.log('[API:req:multipart]', 'POST', endpoint);
    }
    const response = await fetch(url, {
      method: options.method || 'POST',
      headers,
      body: formData,
      credentials: options.credentials || 'include',
      ...options,
    });
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorDetails = null;
      try {
        const errorData = await response.json();
        // Backend retorna { success: false, error: { code, message, details } }
        if (errorData.error && typeof errorData.error === 'object') {
          errorMessage = errorData.error.message || errorData.error.code || errorMessage;
          errorDetails = errorData.error.details;
        } else if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) { void e }
      const apiError = new Error(errorMessage);
      apiError.status = response.status;
      if (errorDetails) apiError.details = errorDetails;
      if (isDebug) {
        console.error('[API:err:multipart]', endpoint, apiError.status, errorMessage, errorDetails || '');
      }
      throw apiError;
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      if (isDebug) {
        console.log('[API:ok:multipart]', endpoint, response.status, 'json');
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
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      const networkError = new Error('Erro de conexão: Verifique sua internet e tente novamente');
      networkError.type = 'network';
      networkError.status = 0;
      throw networkError;
    }
    if (isDebug) {
      console.error('[API:catch:multipart]', endpoint, error?.status || 0, error?.message || error);
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
