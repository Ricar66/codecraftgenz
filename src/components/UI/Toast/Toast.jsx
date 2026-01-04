// src/components/UI/Toast/Toast.jsx
// Componente individual de toast

import React, { useState, useEffect } from 'react';

import styles from './Toast.module.css';

// Icones padrao por tipo
const defaultIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

/**
 * Toast - Componente individual de notificacao
 */
function Toast({
  type = 'info',
  title,
  message,
  dismissible = true,
  action,
  icon,
  duration,
  onDismiss
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  // Animacao de progresso
  useEffect(() => {
    if (duration > 0) {
      const interval = 50;
      const decrement = (interval / duration) * 100;

      const timer = setInterval(() => {
        setProgress(prev => {
          const next = prev - decrement;
          return next < 0 ? 0 : next;
        });
      }, interval);

      return () => clearInterval(timer);
    }
  }, [duration]);

  // Handler para fechar com animacao
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 200); // Duracao da animacao de saida
  };

  const displayIcon = icon || defaultIcons[type];

  return (
    <div
      className={`${styles.toast} ${styles[type]} ${isExiting ? styles.exiting : ''}`}
      role="alert"
    >
      {/* Icone */}
      <div className={styles.icon}>
        {displayIcon}
      </div>

      {/* Conteudo */}
      <div className={styles.content}>
        {title && <strong className={styles.title}>{title}</strong>}
        <p className={styles.message}>{message}</p>

        {/* Acao customizada */}
        {action && (
          <button
            className={styles.actionButton}
            onClick={() => {
              action.onClick?.();
              handleDismiss();
            }}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Botao de fechar */}
      {dismissible && (
        <button
          className={styles.closeButton}
          onClick={handleDismiss}
          aria-label="Fechar notificacao"
        >
          ✕
        </button>
      )}

      {/* Barra de progresso */}
      {duration > 0 && (
        <div className={styles.progressBar}>
          <div
            className={styles.progress}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default Toast;
