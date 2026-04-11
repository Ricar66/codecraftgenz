// src/lib/apiConfig.js
// Configuração centralizada da API
import { useState, useEffect } from 'react';

import { toBoolFlag } from '../utils/hooks.js';

// URL do backend em produção (VPS)
const PROD_API_URL = 'https://api.codecraftgenz.com.br';

// Detecta o ambiente e configura a URL base da API
const getApiBaseUrl = () => {
  // Em desenvolvimento, usa variável de ambiente ou localhost
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:8080';
  }

  // Em produção: SEMPRE usa a URL da VPS
  return PROD_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Autenticação via HTTPOnly cookie — token gerenciado pelo browser automaticamente
// credentials: 'include' nas requests envia o cookie sem JavaScript acessar o token
export function getAuthHeader() {
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

// Timeout padrão: 30s para uploads, 15s para requests normais
const DEFAULT_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 60_000;

export async function apiRequest(endpoint, options = {}) {
  const isDebug = import.meta.env.DEV || toBoolFlag(import.meta.env.VITE_DEBUG_ADMIN || '');
  // Agora o endpoint DEVE começar com /api/ (ex: /api/projetos)
  const url = `${API_BASE_URL}${endpoint}`;

  // Recupera token da sessão se existir
  const authHeader = getAuthHeader();

  // Timeout via AbortController — evita hangs indefinidos em backend lento
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const suppressLog = options.suppressLog === true;
    if (isDebug) {
      const m = String(options.method || 'GET').toUpperCase();
      console.log('[API:req]', m, endpoint);
    }
    const { headers: optHeaders, timeoutMs: _t, ...restOptions } = options;
    const response = await fetch(url, {
      ...restOptions,
      signal: restOptions.signal || controller.signal,
      credentials: restOptions.credentials || 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
                ...optHeaders,
      },
    });
    clearTimeout(timeoutId);

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
    clearTimeout(timeoutId);
    // Timeout atingido — AbortError
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Requisição cancelada por timeout. Tente novamente.');
      timeoutError.type = 'timeout';
      timeoutError.status = 0;
      throw timeoutError;
    }
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
  const isDebug = import.meta.env.DEV || toBoolFlag(import.meta.env.VITE_DEBUG_ADMIN || '');
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    ...getAuthHeader(),
        ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    if (isDebug) {
      console.log('[API:req:multipart]', 'POST', endpoint);
    }
    const response = await fetch(url, {
      method: options.method || 'POST',
      headers,
      body: formData,
      signal: options.signal || controller.signal,
      credentials: options.credentials || 'include',
      ...options,
    });
    clearTimeout(timeoutId);
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
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Upload cancelado por timeout. Tente novamente.');
      timeoutError.type = 'timeout';
      timeoutError.status = 0;
      throw timeoutError;
    }
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
