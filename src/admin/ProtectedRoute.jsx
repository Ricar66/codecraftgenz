// src/admin/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children, allowed = ['admin'] }) {
  const { isAuthenticated, hasRole, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid rgba(255,255,255,0.06)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!hasRole(allowed)) {
    return <Navigate to="/login" state={{ error: 'Sem permissão' }} replace />;
  }
  return children;
}