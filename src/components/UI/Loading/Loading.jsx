// src/components/UI/Loading/Loading.jsx
// Componentes de loading reutilizaveis

import React from 'react';

import styles from './Loading.module.css';

/**
 * Spinner de carregamento
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} color - 'primary' | 'secondary' | 'white'
 */
export const Spinner = ({ size = 'md', color = 'primary', className = '' }) => {
  return (
    <div
      className={`${styles.spinner} ${styles[size]} ${styles[color]} ${className}`}
      role="status"
      aria-label="Carregando..."
    >
      <span className={styles.srOnly}>Carregando...</span>
    </div>
  );
};

/**
 * Skeleton para texto/paragrafo
 * @param {number} lines - numero de linhas
 * @param {string} width - largura do ultimo item
 */
export const SkeletonText = ({ lines = 3, lastWidth = '60%', className = '' }) => {
  return (
    <div className={`${styles.skeletonGroup} ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={styles.skeletonLine}
          style={{ width: i === lines - 1 ? lastWidth : '100%' }}
        />
      ))}
    </div>
  );
};

/**
 * Skeleton para cards
 */
export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`${styles.skeletonCard} ${className}`} aria-hidden="true">
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonTitle} />
        <SkeletonText lines={2} lastWidth="80%" />
        <div className={styles.skeletonButton} />
      </div>
    </div>
  );
};

/**
 * Skeleton para avatar
 */
export const SkeletonAvatar = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`${styles.skeletonAvatar} ${styles[`avatar${size.charAt(0).toUpperCase() + size.slice(1)}`]} ${className}`}
      aria-hidden="true"
    />
  );
};

/**
 * Loading overlay para paginas/secoes
 */
export const LoadingOverlay = ({ message = 'Carregando...', fullScreen = false }) => {
  return (
    <div className={`${styles.overlay} ${fullScreen ? styles.fullScreen : ''}`}>
      <div className={styles.overlayContent}>
        <Spinner size="lg" />
        <p className={styles.overlayMessage}>{message}</p>
      </div>
    </div>
  );
};

/**
 * Loading inline para botoes
 */
export const ButtonLoader = ({ children, loading = false, disabled = false, ...props }) => {
  return (
    <button {...props} disabled={disabled || loading}>
      {loading ? (
        <span className={styles.buttonLoading}>
          <Spinner size="sm" color="white" />
          <span>Carregando...</span>
        </span>
      ) : children}
    </button>
  );
};

/**
 * Skeleton para lista de items
 */
export const SkeletonList = ({ count = 5, className = '' }) => {
  return (
    <div className={`${styles.skeletonList} ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeletonListItem}>
          <SkeletonAvatar size="sm" />
          <div className={styles.skeletonListContent}>
            <div className={styles.skeletonListTitle} />
            <div className={styles.skeletonListSubtitle} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default {
  Spinner,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  LoadingOverlay,
  ButtonLoader,
  SkeletonList
};
