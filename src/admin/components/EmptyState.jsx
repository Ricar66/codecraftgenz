// src/admin/components/EmptyState.jsx
// Componente de Estado Vazio padronizado para o Admin

import React from 'react';
import styles from './EmptyState.module.css';

/**
 * EmptyState - Exibe mensagem quando nao ha dados
 *
 * @param {string} title - Titulo principal
 * @param {string} description - Descricao/mensagem secundaria
 * @param {React.ReactNode} icon - Icone ou ilustracao
 * @param {React.ReactNode} action - Botao ou acao
 * @param {'sm'|'md'|'lg'} size - Tamanho do componente
 *
 * @example
 * <EmptyState
 *   title="Nenhum usuario encontrado"
 *   description="Tente ajustar os filtros ou adicione um novo usuario"
 *   action={<button>Adicionar usuario</button>}
 * />
 */
const EmptyState = ({
  title = 'Nenhum resultado',
  description,
  icon,
  action,
  size = 'md',
  className,
}) => {
  const wrapperClass = [
    styles.emptyState,
    styles[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass}>
      {icon && (
        <div className={styles.icon}>
          {icon}
        </div>
      )}
      {!icon && (
        <div className={styles.defaultIcon}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.3"
            />
            <path
              d="M24 16V24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M24 32H24.02"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      <h4 className={styles.title}>{title}</h4>
      {description && (
        <p className={styles.description}>{description}</p>
      )}
      {action && (
        <div className={styles.action}>
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
