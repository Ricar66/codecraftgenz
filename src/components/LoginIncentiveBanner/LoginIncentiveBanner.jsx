// src/components/LoginIncentiveBanner/LoginIncentiveBanner.jsx
// Banner de incentivo ao login para usuários não autenticados na página de compra

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import styles from './LoginIncentiveBanner.module.css';

/**
 * LoginIncentiveBanner - Banner que incentiva o login sem bloquear a compra
 *
 * Exibe apenas para usuários não autenticados, mostrando benefícios de fazer login
 * antes de comprar, mas permite continuar a compra como guest.
 *
 * @param {string} className - Classe CSS adicional
 * @param {boolean} compact - Versão compacta do banner
 */
export default function LoginIncentiveBanner({ className, compact = false }) {
  const { isAuthenticated, loading } = useAuth();

  // Não mostra nada se está carregando ou se já está autenticado
  if (loading || isAuthenticated) {
    return null;
  }

  const benefits = [
    'Historico de compras centralizado',
    'Acesso em multiplos dispositivos',
    'Suporte prioritario',
  ];

  if (compact) {
    return (
      <div className={`${styles.bannerCompact} ${className || ''}`}>
        <span className={styles.icon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
        <span className={styles.compactText}>
          <Link to="/login" className={styles.link}>Faca login</Link> para vincular esta compra a sua conta
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.banner} ${className || ''}`}>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.iconLarge}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <div>
            <h4 className={styles.title}>Ja tem uma conta?</h4>
            <p className={styles.subtitle}>Faca login para uma experiencia melhor</p>
          </div>
        </div>

        <ul className={styles.benefits}>
          {benefits.map((benefit, idx) => (
            <li key={idx} className={styles.benefit}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <Link to="/login" className={styles.loginButton}>
            Fazer Login
          </Link>
          <Link to="/register" className={styles.registerButton}>
            Criar Conta
          </Link>
        </div>
        <span className={styles.orText}>ou continue sem login abaixo</span>
      </div>

      <p className={styles.disclaimer}>
        Voce pode comprar sem login. Basta informar seu email para receber a licenca.
      </p>
    </div>
  );
}
