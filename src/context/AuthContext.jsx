// src/context/AuthContext.jsx
// Autenticação via HTTPOnly cookie — token gerenciado pelo browser
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '../lib/apiConfig.js';

import { AuthContext } from './AuthCore';

async function fetchMe(retryCount = 0) {
  const isDebug = import.meta.env.DEV;
  try {
    const json = await apiRequest('/api/auth/me', { method: 'GET' });
    const userData = json?.data || json?.user || null;
    if (isDebug && userData) {
      console.log('[Auth:fetchMe] Usuario carregado:', userData.email, userData.role);
    }
    return userData;
  } catch (error) {
    if (isDebug) {
      console.warn('[Auth:fetchMe]', error?.status || 0, error?.message || 'Erro desconhecido');
    }
    // Retry em erro de rede ou 503 (máx 2)
    if ((error?.status === 0 || error?.status === 503 || error?.type === 'network') && retryCount < 2) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return fetchMe(retryCount + 1);
    }
    // 401 = cookie expirado ou inválido — limpa cache
    if (error?.status === 401) {
      sessionStorage.removeItem('cc_user_cache');
    }
    return null;
  }
}

function useAuthProvider() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    // Tenta recuperar user do sessionStorage (cache temporário, NÃO é token)
    try {
      const cached = sessionStorage.getItem('cc_user_cache');
      if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      // Sempre tenta fetchMe — se o cookie HTTPOnly existir, vai funcionar
      const u = await fetchMe();
      if (u) {
        setUser(u);
        try { sessionStorage.setItem('cc_user_cache', JSON.stringify(u)); } catch {}
      } else {
        // Cookie expirado ou inexistente
        sessionStorage.removeItem('cc_user_cache');
        setUser(null);
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email, password, redirectTo = null) => {
    try {
      // Backend seta cookie HTTPOnly automaticamente na resposta
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Usa dados do login se disponíveis, senão busca via cookie
      let u = data?.user || data?.data?.user;
      if (!u) u = await fetchMe();

      if (u) {
        flushSync(() => { setUser(u); });
        try { sessionStorage.setItem('cc_user_cache', JSON.stringify(u)); } catch {}

        const isAdmin = ['admin', 'administrator', 'superadmin', 'owner', 'editor'].includes(
          String(u.role || '').toLowerCase()
        );
        navigate(redirectTo || (isAdmin ? '/admin' : '/'));
      }
      return { ok: true };
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return { ok: false, error: error?.message || 'Erro de conexão. Tente novamente.' };
    }
  }, [navigate]);

  const loginWithGoogle = useCallback(async (credential, redirectTo = null) => {
    try {
      // Backend seta cookie HTTPOnly automaticamente na resposta
      const data = await apiRequest('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      });

      let u = data?.user || data?.data?.user;
      if (!u) u = await fetchMe();

      if (u) {
        flushSync(() => { setUser(u); });
        try { sessionStorage.setItem('cc_user_cache', JSON.stringify(u)); } catch {}

        const isAdmin = ['admin', 'administrator', 'superadmin', 'owner', 'editor'].includes(
          String(u.role || '').toLowerCase()
        );
        navigate(redirectTo || (isAdmin ? '/admin' : '/'));
      }
      return { ok: true };
    } catch (error) {
      console.error('Erro Google auth:', error);
      return { ok: false, error: error?.message || 'Erro ao autenticar com Google.' };
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      // Backend limpa o cookie HTTPOnly via res.clearCookie()
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch { /* ignora erro no logout */ }
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
    loginWithGoogle,
    logout,
    hasRole,
  }), [user, loading, login, loginWithGoogle, logout, hasRole]);

  return value;
}

export function AuthProvider({ children }) {
  const value = useAuthProvider();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
