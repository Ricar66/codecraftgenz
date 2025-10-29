// src/admin/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children, allowed = ['admin'] }) {
  const { isAuthenticated, hasRole, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!hasRole(allowed)) {
    return <Navigate to="/login" state={{ error: 'Sem permissão' }} replace />;
  }
  return children;
}