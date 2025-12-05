// src/context/AuthContext.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '../lib/apiConfig.js';

import { AuthContext } from './AuthCore';

async function fetchMe() {
  try {
    const json = await apiRequest('/api/auth/me', { method: 'GET' });
    return json?.user || null;
  } catch { return null; }
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { ok: false, error: data.error || 'Erro no login' };
      }
      const u = await fetchMe();
      if (u) setUser(u);
      navigate('/admin');
      return { ok: true };
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return { ok: false, error: 'Erro de conexão. Tente novamente.' };
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { void e }
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
