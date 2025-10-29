// src/context/AuthContext.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminStore } from '../lib/adminStore';

import { AuthContext } from './AuthCore';

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
    // inicializa storage interno e semente
    adminStore.initSeeds();

    const s = getStoredSession();
    if (s?.token) {
      const u = adminStore.getUserById(s.userId);
      if (u) {
        setUser(u);
        setToken(s.token);
      } else {
        clearStoredSession();
      }
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

    const result = await adminStore.verifyCredentials(email, password);
    if (!result.ok) {
      attempts.count += 1;
      localStorage.setItem('cc_login_attempts', JSON.stringify(attempts));
      return { ok: false, error: result.error || 'Credenciais inválidas' };
    }

    // sucesso
    localStorage.setItem('cc_login_attempts', JSON.stringify({ count: 0, windowStart: Date.now() }));
    const u = result.user;
    const tokenValue = `token-${u.id}-${Date.now()}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h
    const session = { token: tokenValue, userId: u.id, role: u.role, expiresAt };
    setStoredSession(session);
    setUser(u);
    setToken(tokenValue);
    adminStore.addLog('login', `${u.email} fez login`);
    navigate('/admin');
    return { ok: true };
  }, [navigate]);

  const logout = useCallback(() => {
    const s = getStoredSession();
    if (s?.userId) {
      const u = adminStore.getUserById(s.userId);
      if (u) adminStore.addLog('logout', `${u.email} fez logout`);
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