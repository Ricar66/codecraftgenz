// src/admin/components/AdminAlert.jsx
// Componente de Alerta/Toast padronizado para o Admin

import React from 'react';
import styles from './AdminAlert.module.css';

/**
 * AdminAlert - Componente de alerta/notificacao
 *
 * @param {'success'|'warning'|'error'|'info'} variant - Tipo do alerta
 * @param {string} title - Titulo opcional
 * @param {boolean} dismissible - Pode ser fechado
 * @param {Function} onDismiss - Callback ao fechar
 * @param {boolean} inline - Versao inline (sem icone grande)
 *
 * @example
 * <AdminAlert variant="success" title="Sucesso!">
 *   Operacao realizada com sucesso.
 * </AdminAlert>
 *
 * @example
 * <AdminAlert variant="error" dismissible onDismiss={() => {}}>
 *   Erro ao processar a requisicao.
 * </AdminAlert>
 */
const AdminAlert = ({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  inline = false,
  className,
}) => {
  const alertClass = [
    styles.alert,
    styles[variant],
    inline && styles.inline,
    className
  ].filter(Boolean).join(' ');

  const icons = {
    success: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 18a8 8 0 100-16 8 8 0 000 16z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7 10l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    warning: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 18a8 8 0 100-16 8 8 0 000 16z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 6v4M10 14h.01"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    error: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 18a8 8 0 100-16 8 8 0 000 16z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7 7l6 6M13 7l-6 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    info: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 18a8 8 0 100-16 8 8 0 000 16z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 9v5M10 6h.01"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return (
    <div className={alertClass} role="alert">
      {!inline && (
        <div className={styles.icon}>
          {icons[variant]}
        </div>
      )}
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.message}>{children}</div>
      </div>
      {dismissible && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label="Fechar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default AdminAlert;
