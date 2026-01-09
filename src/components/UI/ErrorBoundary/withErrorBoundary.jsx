// src/components/UI/ErrorBoundary/withErrorBoundary.jsx
// HOC para envolver componentes com Error Boundary

import React from 'react';

import ErrorBoundary from './ErrorBoundary';

/**
 * HOC para envolver componentes com Error Boundary
 * @param {React.Component} WrappedComponent - Componente a ser envolvido
 * @param {Object} options - Opcoes do ErrorBoundary (variant, showDetails, onError, fallback)
 * @returns {React.Component} Componente envolvido com ErrorBoundary
 */
export function withErrorBoundary(WrappedComponent, options = {}) {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default withErrorBoundary;
