// src/components/UI/Toast/ToastContainer.jsx
// Container que renderiza os toasts

import React from 'react';
import Toast from './Toast';
import styles from './Toast.module.css';

/**
 * ToastContainer - Container que posiciona e renderiza os toasts
 */
function ToastContainer({ toasts, position, onDismiss }) {
  if (toasts.length === 0) return null;

  const positionClass = {
    'top-right': styles.topRight,
    'top-left': styles.topLeft,
    'top-center': styles.topCenter,
    'bottom-right': styles.bottomRight,
    'bottom-left': styles.bottomLeft,
    'bottom-center': styles.bottomCenter
  }[position] || styles.topRight;

  return (
    <div
      className={`${styles.container} ${positionClass}`}
      role="region"
      aria-label="Notificacoes"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}

export default ToastContainer;
