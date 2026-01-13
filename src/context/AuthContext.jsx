// src/context/AuthContext.jsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '../lib/apiConfig.js';

import { AuthContext } from './AuthCore';

// Verifica se existe token salvo
function hasStoredToken() {
  try {
    const raw = localStorage.getItem('cc_session');
    if (raw) {
      const session = JSON.parse(raw);
      return !!session?.token;
    }
  } catch { /* ignore */ }
  return false;
}

async function fetchMe(retryCount = 0) {
  const isDebug = import.meta.env.DEV || localStorage.getItem('cc_debug') === '1';
  try {
    const json = await apiRequest('/api/auth/me', { method: 'GET' });
    // Backend retorna { success: true, data: { user } } ou { user }
    return json?.data?.user || json?.data || json?.user || null;
  } catch (error) {
    // Log apenas em desenvolvimento para debug
    if (isDebug) {
      console.warn('[Auth:fetchMe]', error?.status || 0, error?.message || 'Erro desconhecido');
    }
    // Se for erro de rede ou 503 e temos token, tenta novamente (máx 2 retries)
    if ((error?.status === 0 || error?.status === 503 || error?.type === 'network') && hasStoredToken() && retryCount < 2) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return fetchMe(retryCount + 1);
    }
    // Se for 401, limpa o token inválido
    if (error?.status === 401) {
      localStorage.removeItem('cc_session');
    }
    return null;
  }
}

function useAuthProvider() {
  const navigate = useNavigate();
  // Inicializa com null mas mantém loading true até verificar
  const [user, setUser] = useState(() => {
    // Tenta recuperar user do sessionStorage (cache temporário)
    try {
      const cached = sessionStorage.getItem('cc_user_cache');
      if (cached && hasStoredToken()) {
        return JSON.parse(cached);
      }
    } catch { /* ignore */ }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      // Só tenta buscar se tem token
      if (hasStoredToken()) {
        const u = await fetchMe();
        if (u) {
          setUser(u);
          // Cache temporário no sessionStorage
          try {
            sessionStorage.setItem('cc_user_cache', JSON.stringify(u));
          } catch { /* ignore */ }
        } else if (!hasStoredToken()) {
          // Token foi removido (401) - limpa cache
          sessionStorage.removeItem('cc_user_cache');
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      // Backend retorna { success: true, data: { token, user } }
      const token = data?.token || data?.data?.token;
      const userData = data?.user || data?.data?.user;
      if (token) {
        localStorage.setItem('cc_session', JSON.stringify({ token }));
      }
      // Usa dados do login se disponíveis, senão busca
      let u = userData;
      if (!u) {
        u = await fetchMe();
      }
      if (u) {
        setUser(u);
        try {
          sessionStorage.setItem('cc_user_cache', JSON.stringify(u));
        } catch { /* ignore */ }
      }
      navigate('/admin');
      return { ok: true };
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return { ok: false, error: error?.message || 'Erro de conexão. Tente novamente.' };
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch { /* ignora erro no logout */ }
    localStorage.removeItem('cc_session');
    sessionStorage.removeItem('cc_user_cache');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const hasRole = useCallback((roles) => {
    if (!user) return false;
    const ur = String(user.role || '').trim().toLowerCase();
    const allowed = Array.isArray(roles) ? roles : [roles];
    const normalized = new Set(allowed.filter(Boolean).map(r => String(r).trim().toLowerCase()));
    if (normalized.size === 0) return true;
    if (normalized.has('admin')) {
      if (['admin','administrator','superadmin','owner'].includes(ur)) return true;
    }
    return normalized.has(ur);
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
  }), [user, loading, login, logout, hasRole]);

  return value;
}

export function AuthProvider({ children }) {
  const value = useAuthProvider();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
