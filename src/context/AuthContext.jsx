// src/context/AuthContext.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '../lib/apiConfig.js';

import { AuthContext } from './AuthCore';

async function fetchMe() {
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
    // Se for erro de rede, logar separadamente
    if (error?.status === 0 || error?.type === 'network') {
      console.warn('[Auth] Erro de rede - usuário pode ainda estar autenticado');
    }
    return null;
  }
}

function useAuthProvider() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await fetchMe();
      if (u) setUser(u);
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
      if (token) {
        localStorage.setItem('cc_session', JSON.stringify({ token }));
      }
      // Busca dados completos do usuário
      const u = await fetchMe();
      if (u) setUser(u);
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
