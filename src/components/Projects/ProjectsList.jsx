// src/components/Projects/ProjectsList.jsx
import React from 'react';

import useProjects from '../../hooks/useProjects';
import { realtime } from '../../lib/realtime';

import LazyProjectCard from './LazyProjectCard';
import LoadingSpinner, { ProjectsListSkeleton } from './LoadingSpinner';
import ProjectCard from './ProjectCard';
import styles from './ProjectsList.module.css';

/**
 * Componente de Loading Melhorado
 */
const LoadingState = () => {
  return (
    <div className={styles.loadingContainer}>
      <ProjectsListSkeleton count={6} />
      <div className={styles.loadingOverlay}>
        <LoadingSpinner 
          size="large" 
          message="Carregando projetos..." 
        />
      </div>
    </div>
  );
};

/**
 * Componente de Estado Vazio
 */
const EmptyState = ({ onRetry }) => (
  <div className={styles.emptyState} role="status">
    <div className={styles.emptyIcon}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <h3 className={styles.emptyTitle}>Nenhum projeto visível no momento. Volte em breve 🚀</h3>
    <p className={styles.emptyDescription}></p>
    <button 
      className={styles.retryButton}
      onClick={onRetry}
      aria-label="Recarregar lista de projetos"
    >
      Atualizar Lista
    </button>
  </div>
);

/**
 * Componente de Estado de Erro Melhorado
 */
const ErrorState = ({ error, onRetry, onClear }) => {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'timeout':
        return '⏱️';
      case 'server_error':
        return '🔧';
      case 'fallback_success':
        return '📱';
      default:
        return '⚠️';
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'fallback_success':
        return '#f59e0b'; // Amarelo para fallback
      case 'timeout':
        return '#ef4444'; // Vermelho para timeout
      case 'server_error':
        return '#dc2626'; // Vermelho escuro para servidor
      default:
        return '#ef4444';
    }
  };

  return (
    <div className={styles.errorState} role="alert">
      <div className={styles.errorIcon} style={{ color: getErrorColor() }}>
        {getErrorIcon()}
      </div>
      <h3 className={styles.errorTitle}>
        {error.type === 'fallback_success' ? 'Modo Offline' : 'Erro ao Carregar'}
      </h3>
      <p className={styles.errorMessage}>{error.message}</p>
      
      {error.status && error.type !== 'fallback_success' && (
        <p className={styles.errorDetails}>
          Código: {error.status} | Tipo: {error.type}
        </p>
      )}
      
      <div className={styles.errorActions}>
        {error.canRetry && (
          <button 
            className={styles.retryButton}
            onClick={onRetry}
            style={{ backgroundColor: getErrorColor() }}
          >
            🔄 Tentar Novamente
            {error.retryIn && (
              <span className={styles.retryDelay}>
                (em {Math.ceil(error.retryIn / 1000)}s)
              </span>
            )}
          </button>
        )}
        
        {error.type === 'fallback_success' && (
          <button 
            className={styles.refreshButton}
            onClick={onRetry}
          >
            🌐 Tentar Conexão Online
          </button>
        )}
        
        <button 
          className={styles.clearButton}
          onClick={onClear}
        >
          ✕ Fechar
        </button>
      </div>
    </div>
  );
};

/**
 * Componente de Estatísticas dos Projetos
 */
const ProjectsStats = ({ stats, isVisible }) => {
  if (!isVisible || stats.total === 0) return null;

  return (
    <div className={styles.statsContainer} role="region" aria-label="Estatísticas dos projetos">
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{stats.total}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{stats.inProgress}</span>
          <span className={styles.statLabel}>Em Andamento</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{stats.averageProgress}%</span>
          <span className={styles.statLabel}>Progresso Médio</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente principal de listagem de projetos
 * Gerencia todos os estados e renderiza a interface apropriada
 */
const ProjectsList = ({ useAdminStore = false }) => {
  const {
    projects,
    loading,
    error,
    isEmpty,
    hasError,
    hasProjects,
    retryCount,
    refetch,
    retryWithBackoff,
    clearError,
    stats
  } = useProjects({
    autoFetch: true,
    filters: {},
    refetchInterval: 60000, // Aumentado para 60s (era 30s) - reduz carga na API
    timeout: 8000, // Reduzido para 8s (era 10s) - falha mais rápido
    maxRetries: 2, // Reduzido para 2 (era 3) - menos espera em erros
    useAdminStore,
    publicOnly: false
  });

  // Como agora tudo vem da API, não precisamos mais do adminStore
  // useAdminStore é mantido apenas para compatibilidade, mas sempre usa projects da API
  const displayedProjects = projects;
  const sortProjects = (list) => {
    const toStatusValue = (p) => String(p.status || '').toLowerCase();
    const getDate = (p) => p.data_inicio || p.startDate || null;
    return list.slice().sort((a, b) => {
      const sa = toStatusValue(a), sb = toStatusValue(b);
      const aIsWaiting = sa === 'aguardando_start';
      const bIsWaiting = sb === 'aguardando_start';
      if (aIsWaiting !== bIsWaiting) return aIsWaiting ? 1 : -1;
      const da = getDate(a) ? new Date(getDate(a)).getTime() : 0;
      const db = getDate(b) ? new Date(getDate(b)).getTime() : 0;
      return db - da;
    });
  };
  const orderedProjects = sortProjects(displayedProjects);

  // Debounce simples para evitar refetch em cascata ao receber eventos em burst
  const refetchCooldownRef = React.useRef(0);
  React.useEffect(() => {
    const handler = () => {
      const now = Date.now();
      if (now - refetchCooldownRef.current < 1000) {
        // Ignora eventos dentro de 1s
        return;
      }
      refetchCooldownRef.current = now;
      try { refetch(); } catch (err) { console.warn('projects_changed refetch error', err); }
    };
    const unsub = realtime.subscribe('projects_changed', handler);
    return () => unsub();
  }, [refetch]);
  const hasDisplayed = displayedProjects.length > 0;

  /**
   * Handler para retry inteligente com limpeza de erro
   */
  const handleRetry = async () => {
    try {
      clearError();
      if (error && error.retryIn) {
        // Usa retry com backoff se há delay recomendado
        await retryWithBackoff();
      } else {
        // Usa refetch normal
        await refetch();
      }
    } catch (err) {
      console.error('Erro durante retry:', err);
    }
  };

  /**
   * Renderização condicional baseada no estado
   */
  
  // Estado de loading inicial
  if (!useAdminStore && loading && projects.length === 0) {
    return <LoadingState />;
  }

  // Estado de erro
  if (!useAdminStore && hasError && projects.length === 0) {
    return (
      <ErrorState 
        error={error} 
        onRetry={handleRetry}
        onClear={clearError}
        retryCount={retryCount}
      />
    );
  }

  // Estado vazio (sem projetos)
  if (!useAdminStore && isEmpty && !loading) {
    return <EmptyState onRetry={handleRetry} />;
  }

  // Renderização principal - sempre mostra os cards se existirem
  return (
    <div className={styles.container}>
      {/* Cabeçalho da seção */}
      <div className={styles.header}>
        <h2 className={styles.title}>{useAdminStore ? 'Projetos publicados' : 'Projetos em Desenvolvimento'}</h2>
        <p className={styles.subtitle}>
          {useAdminStore ? 'Itens visíveis definidos no Admin' : 'Acompanhe o progresso dos nossos projetos mais recentes'}
        </p>
      </div>

      {/* Estatísticas dos projetos */}
      {!useAdminStore && hasProjects && <ProjectsStats stats={stats} />}

      {/* Grid simples de projetos - máximo 3 por linha */}
      <div className={styles.projectsGrid}>
        {orderedProjects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
          />
        ))}
      </div>

      {/* Footer com informações */}
      {hasDisplayed && (
        <div className={styles.footer}>
          <p className={styles.projectCount}>
            {orderedProjects.length} projeto{orderedProjects.length !== 1 ? 's' : ''} encontrado{orderedProjects.length !== 1 ? 's' : ''}
          </p>
          {!useAdminStore && (
            <button 
              onClick={refetch}
              className={styles.refreshButton}
              disabled={loading}
            >
              🔄 Atualizar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectsList;