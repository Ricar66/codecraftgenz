// src/admin/components/StatusBadge.jsx
// Componente de Badge de Status padronizado para o Admin

import React from 'react';
import styles from './StatusBadge.module.css';

/**
 * StatusBadge - Badge de status visual
 *
 * @param {'success'|'warning'|'error'|'info'|'neutral'|'primary'|'accent'} variant - Variante visual
 * @param {'sm'|'md'|'lg'} size - Tamanho
 * @param {boolean} dot - Mostrar dot indicador
 * @param {boolean} pulse - Animacao de pulse no dot
 *
 * @example
 * <StatusBadge variant="success">Ativo</StatusBadge>
 * <StatusBadge variant="warning" dot pulse>Pendente</StatusBadge>
 * <StatusBadge variant="error">Inativo</StatusBadge>
 */
const StatusBadge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  className,
}) => {
  const badgeClass = [
    styles.badge,
    styles[variant],
    styles[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClass}>
      {dot && (
        <span className={`${styles.dot} ${pulse ? styles.pulse : ''}`} />
      )}
      {children}
    </span>
  );
};

/**
 * Helper: mapear status comum para variante
 */
StatusBadge.getVariant = (status) => {
  const statusLower = String(status).toLowerCase();

  const variants = {
    // Sucesso
    active: 'success',
    ativo: 'success',
    approved: 'success',
    aprovado: 'success',
    paid: 'success',
    pago: 'success',
    completed: 'success',
    concluido: 'success',
    finalizado: 'success',
    published: 'success',
    publicado: 'success',

    // Aviso
    pending: 'warning',
    pendente: 'warning',
    processing: 'warning',
    processando: 'warning',
    draft: 'warning',
    rascunho: 'warning',
    review: 'warning',
    revisao: 'warning',

    // Erro
    inactive: 'error',
    inativo: 'error',
    rejected: 'error',
    rejeitado: 'error',
    failed: 'error',
    falhou: 'error',
    cancelled: 'error',
    cancelado: 'error',
    blocked: 'error',
    bloqueado: 'error',

    // Info
    new: 'info',
    novo: 'info',
    ongoing: 'info',
    andamento: 'info',
  };

  return variants[statusLower] || 'neutral';
};

/**
 * Helper: traduzir status
 */
StatusBadge.translate = (status) => {
  const statusLower = String(status).toLowerCase();

  const translations = {
    active: 'Ativo',
    inactive: 'Inativo',
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    draft: 'Rascunho',
    published: 'Publicado',
    completed: 'Concluido',
    failed: 'Falhou',
    cancelled: 'Cancelado',
    processing: 'Processando',
    paid: 'Pago',
    ongoing: 'Em andamento',
    new: 'Novo',
    review: 'Em revisao',
    blocked: 'Bloqueado',
  };

  return translations[statusLower] || status;
};

export default StatusBadge;
