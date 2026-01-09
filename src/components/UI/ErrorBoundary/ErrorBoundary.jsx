// src/components/UI/ErrorBoundary/ErrorBoundary.jsx
// Componente para capturar erros React e exibir fallback

import React, { Component } from 'react';

import styles from './ErrorBoundary.module.css';

/**
 * Error Boundary - Captura erros em componentes filhos
 * Previne que a aplicacao inteira quebre por erros em uma secao
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o state para renderizar o fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log do erro para servicos de monitoramento
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({ errorInfo });

    // Aqui voce pode enviar para servicos como Sentry, LogRocket, etc
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error } = this.state;
    const {
      children,
      fallback,
      variant = 'page', // 'page' | 'section' | 'inline'
      showDetails = false
    } = this.props;

    if (hasError) {
      // Fallback customizado
      if (fallback) {
        return fallback({ error, retry: this.handleRetry });
      }

      // Fallback padrao baseado no variant
      if (variant === 'inline') {
        return (
          <div className={styles.inlineError}>
            <span className={styles.inlineIcon}>⚠️</span>
            <span className={styles.inlineText}>Erro ao carregar</span>
            <button
              className={styles.inlineRetry}
              onClick={this.handleRetry}
            >
              Tentar novamente
            </button>
          </div>
        );
      }

      if (variant === 'section') {
        return (
          <div className={styles.sectionError}>
            <div className={styles.sectionIcon}>😕</div>
            <h3 className={styles.sectionTitle}>Algo deu errado</h3>
            <p className={styles.sectionText}>
              Nao foi possivel carregar esta secao.
            </p>
            <button
              className={styles.retryButton}
              onClick={this.handleRetry}
            >
              Tentar novamente
            </button>
          </div>
        );
      }

      // Default: page error
      return (
        <div className={styles.pageError}>
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 7V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
            </div>

            <h1 className={styles.errorTitle}>Oops! Algo deu errado</h1>

            <p className={styles.errorDescription}>
              Encontramos um problema inesperado. Nossa equipe foi notificada
              e estamos trabalhando para resolver.
            </p>

            {showDetails && error && (
              <details className={styles.errorDetails}>
                <summary>Detalhes tecnicos</summary>
                <pre>{error.toString()}</pre>
              </details>
            )}

            <div className={styles.errorActions}>
              <button
                className={`${styles.actionButton} ${styles.primary}`}
                onClick={this.handleRetry}
              >
                Tentar novamente
              </button>
              <button
                className={`${styles.actionButton} ${styles.secondary}`}
                onClick={this.handleGoHome}
              >
                Voltar ao inicio
              </button>
              <button
                className={`${styles.actionButton} ${styles.outline}`}
                onClick={this.handleReload}
              >
                Recarregar pagina
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
