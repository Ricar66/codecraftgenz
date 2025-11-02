// src/lib/apiConfig.js
// Configuração centralizada da API
import { useState, useEffect } from 'react';

// Detecta o ambiente e configura a URL base da API
const getApiBaseUrl = () => {
  // Verifica se há uma variável de ambiente VITE_API_URL definida
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl;
  }
  
  // Em desenvolvimento, usa o proxy do Vite (localhost:8080)
  if (import.meta.env.DEV) {
    return 'http://localhost:8080';
  }
  
  // Em produção, assume API na mesma origem (mesmo domínio)
  // Isso funciona para deploy no mesmo servidor do frontend e backend
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback para SSR ou ambientes sem window
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Função para fazer requisições com tratamento de erro melhorado
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
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