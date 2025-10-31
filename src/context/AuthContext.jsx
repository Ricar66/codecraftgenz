// src/context/AuthContext.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthContext } from './AuthCore';

// Usuário admin padrão (sem adminStore)
const DEFAULT_ADMIN = {
  id: 'u1',
  name: 'Admin',
  email: 'admin@codecraft.dev',
  role: 'admin',
  status: 'active'
};

function getStoredSession() {
  try {
    const raw = localStorage.getItem('cc_session');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.expiresAt) return null;
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem('cc_session');
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setStoredSession(session) {
  localStorage.setItem('cc_session', JSON.stringify(session));
}

function clearStoredSession() {
  localStorage.removeItem('cc_session');
}

function useAuthProvider() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getStoredSession();
    if (s?.token && s?.userId === DEFAULT_ADMIN.id) {
      setUser(DEFAULT_ADMIN);
      setToken(s.token);
    } else {
      clearStoredSession();
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    // rate limit simples: 5 tentativas/15min
    const attemptsRaw = localStorage.getItem('cc_login_attempts');
    let attempts = attemptsRaw ? JSON.parse(attemptsRaw) : { count: 0, windowStart: Date.now() };
    const windowMs = 15 * 60 * 1000;
    if (Date.now() - attempts.windowStart > windowMs) {
      attempts = { count: 0, windowStart: Date.now() };
    }
    if (attempts.count >= 5) {
      return { ok: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' };
    }

    // Verificação simples de credenciais (sem adminStore)
    if (email === DEFAULT_ADMIN.email && password === 'admin') {
      // sucesso
      localStorage.setItem('cc_login_attempts', JSON.stringify({ count: 0, windowStart: Date.now() }));
      const tokenValue = `token-${DEFAULT_ADMIN.id}-${Date.now()}`;
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h
      const session = { token: tokenValue, userId: DEFAULT_ADMIN.id, role: DEFAULT_ADMIN.role, expiresAt };
      setStoredSession(session);
      setUser(DEFAULT_ADMIN);
      setToken(tokenValue);
      console.log('Login realizado:', DEFAULT_ADMIN.email);
      navigate('/admin');
      return { ok: true };
    } else {
      attempts.count += 1;
      localStorage.setItem('cc_login_attempts', JSON.stringify(attempts));
      return { ok: false, error: 'Credenciais inválidas' };
    }
  }, [navigate]);

  const logout = useCallback(() => {
    const s = getStoredSession();
    if (s?.userId) {
      console.log('Logout realizado:', DEFAULT_ADMIN.email);
    }
    clearStoredSession();
    setUser(null);
    setToken(null);
    navigate('/login');
  }, [navigate]);

  const hasRole = useCallback((roles) => {
    if (!user) return false;
    if (!roles || roles.length === 0) return true;
    return roles.includes(user.role);
  }, [user]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    logout,
    hasRole,
  }), [user, token, loading, login, logout, hasRole]);

  return value;
}

export function AuthProvider({ children }) {
  const value = useAuthProvider();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}