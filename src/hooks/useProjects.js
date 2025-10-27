// src/hooks/useProjects.js
import { useState, useEffect, useCallback, useRef } from 'react';

import { getProjects } from '../services/projectsAPI';
import { globalPerformanceMonitor } from '../utils/performanceMonitor';

/**
 * Hook customizado para gerenciamento de projetos
 * Gerencia estado de loading, dados, erros e operações relacionadas a projetos
 * 
 * @param {Object} options - Opções de configuração
 * @param {boolean} options.autoFetch - Se deve buscar dados automaticamente (padrão: true)
 * @param {boolean} options.useMock - Se deve usar dados mock (padrão: false)
 * @param {Object} options.filters - Filtros para aplicar na busca
 * @param {number} options.refetchInterval - Intervalo para refetch automático em ms
 * @param {number} options.timeout - Timeout máximo para requisições em ms (padrão: 10000)
 * @param {number} options.maxRetries - Número máximo de tentativas (padrão: 3)
 * @returns {Object} Estado e funções do hook
 */
const useProjects = (options = {}) => {
  const {
    autoFetch = true,
    useMock = true, // Temporariamente forçando dados mock devido à API indisponível
    filters = {},
    refetchInterval = null,
    timeout = 10000, // 10 segundos
    maxRetries = 3
  } = options;

  // Estados principais
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // Estados adicionais
  const [isEmpty, setIsEmpty] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs para controle
  const abortControllerRef = useRef(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * Função principal para buscar projetos
   * @param {Object} fetchOptions - Opções específicas para esta busca
   * @returns {Promise<Array>} Lista de projetos
   */
  const fetchProjects = useCallback(async (fetchOptions = {}) => {
    // Inicia medição de performance
    const measureId = `fetch-projects-${Date.now()}`;
    globalPerformanceMonitor.startMeasure(measureId, {
      options: { ...options, ...fetchOptions },
      retryCount
    });

    // Verifica se o componente ainda está montado
    if (!isMountedRef.current) return [];

    // Verifica se já excedeu o número máximo de tentativas
    if (retryCount >= maxRetries) {
      setError({
        message: `Falha ao carregar projetos após ${maxRetries} tentativas. Verifique sua conexão.`,
        status: 0,
        type: 'max_retries',
        canRetry: false
      });
      setLoading(false);
      return [];
    }

    // Cancela requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Cria novo controller para esta requisição
    abortControllerRef.current = new AbortController();

    // Configura timeout
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, timeout);

    try {
      setLoading(true);
      setError(null);

      const mergedOptions = {
        useMockData: useMock,
        filters: { ...filters, ...fetchOptions.filters },
        signal: abortControllerRef.current.signal,
        ...fetchOptions
      };

      const response = await getProjects({
        ...mergedOptions,
        useCache: true,
        useMockData: useMock
      });

      // Limpa o timeout se a requisição foi bem-sucedida
      clearTimeout(timeoutId);

      // Verifica se o componente ainda está montado
      if (!isMountedRef.current) return response.data || [];

      // Atualiza estado com dados validados
      setProjects(response.data || []);
      setIsEmpty((response.data || []).length === 0);
      setLastFetch(new Date());
      setRetryCount(0);

      // Log de informações úteis
      if (response.meta) {
        console.log(`📊 Projetos carregados:`, {
          source: response.meta.source,
          count: response.data?.length || 0,
          cached: response.meta.cached,
          validation: response.meta.validation
        });
      }

      // Finaliza medição com sucesso
      globalPerformanceMonitor.endMeasure(measureId, {
        success: true,
        projectCount: response.data?.length || 0,
        source: response.meta?.source,
        cached: response.meta?.cached
      });

      return response.data || [];
    } catch (error) {
      // Limpa o timeout em caso de erro
      clearTimeout(timeoutId);

      // Verifica se o componente ainda está montado
      if (!isMountedRef.current) return [];

      // Trata diferentes tipos de erro com fallbacks robustos
      if (error.name === 'AbortError') {
        // Timeout - tenta fallback para dados mock se não estiver usando
        if (!useMock && retryCount === 0) {
          console.warn('Timeout na API real, tentando fallback para dados mock...');
          try {
            const fallbackData = await getProjects({ useMockData: true });
            setProjects(fallbackData);
            setIsEmpty(fallbackData.length === 0);
            setLastFetch(new Date());
            setError({
              message: 'Usando dados offline devido a problemas de conectividade',
              status: 200,
              type: 'fallback_success',
              canRetry: true,
              isFallback: true
            });
            setLoading(false);
            return fallbackData;
          } catch (fallbackError) {
            console.error('Fallback também falhou:', fallbackError);
          }
        }
        
        setRetryCount(prev => prev + 1);
        setError({
          message: 'Timeout: A requisição demorou muito para responder',
          status: 408,
          type: 'timeout',
          canRetry: retryCount < maxRetries - 1,
          retryIn: Math.min(2000 * Math.pow(2, retryCount), 10000) // Backoff exponencial
        });
      } else if (error.status >= 500) {
        // Erro de servidor - tenta fallback para dados mock
        if (!useMock) {
          console.warn('Erro de servidor, tentando fallback para dados mock...');
          try {
            const fallbackData = await getProjects({ useMockData: true });
            setProjects(fallbackData);
            setIsEmpty(fallbackData.length === 0);
            setLastFetch(new Date());
            setError({
              message: 'Servidor temporariamente indisponível. Exibindo dados offline.',
              status: 200,
              type: 'fallback_success',
              canRetry: true,
              isFallback: true
            });
            setLoading(false);
            return fallbackData;
          } catch (fallbackError) {
            console.error('Fallback também falhou:', fallbackError);
          }
        }
        
        setRetryCount(prev => prev + 1);
        setError({
          message: 'Erro interno do servidor. Tente novamente em alguns instantes.',
          status: error.status,
          type: 'server_error',
          canRetry: retryCount < maxRetries - 1,
          retryIn: Math.min(3000 * Math.pow(2, retryCount), 15000)
        });
      } else {
        // Outros erros
        setRetryCount(prev => prev + 1);
        setError({
          message: error.message || 'Erro desconhecido ao carregar projetos',
          status: error.status || 0,
          type: 'unknown',
          canRetry: retryCount < maxRetries - 1,
          retryIn: Math.min(1000 * Math.pow(2, retryCount), 5000)
        });
      }

      // Finaliza medição com erro
      globalPerformanceMonitor.endMeasure(measureId, {
        success: false,
        error: error.message,
        retryCount
      });

      setLoading(false);
      return [];
    } finally {
      // Sempre limpa o timeout
      clearTimeout(timeoutId);
      
      // Só atualiza loading se o componente ainda estiver montado
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [useMock, timeout, maxRetries]); // Dependências estáveis - removido retryCount e filters

  /**
   * Função para retry com backoff exponencial
   */
  const retryWithBackoff = useCallback(async (delay = 1000) => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const result = await fetchProjects();
        resolve(result);
      }, delay);
    });
  }, [fetchProjects]);

  /**
   * Função para refetch manual (limpa erro e tenta novamente)
   */
  const refetch = useCallback(async (options = {}) => {
    setError(null);
    setRetryCount(0);
    return fetchProjects(options);
  }, [fetchProjects]);

  /**
   * Função para limpar erros
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  /**
   * Função para adicionar um projeto à lista (otimistic update)
   * @param {Object} newProject - Novo projeto
   */
  const addProject = useCallback((newProject) => {
    setProjects(prev => [newProject, ...prev]);
    setIsEmpty(false);
  }, []);

  /**
   * Função para atualizar um projeto na lista
   * @param {string} projectId - ID do projeto
   * @param {Object} updates - Atualizações a aplicar
   */
  const updateProject = useCallback((projectId, updates) => {
    setProjects(prev => 
      prev.map(project => 
        project.id === projectId 
          ? { ...project, ...updates }
          : project
      )
    );
  }, []);

  /**
   * Função para remover um projeto da lista
   * @param {string} projectId - ID do projeto
   */
  const removeProject = useCallback((projectId) => {
    setProjects(prev => {
      const filtered = prev.filter(project => project.id !== projectId);
      setIsEmpty(filtered.length === 0);
      return filtered;
    });
  }, []);

  /**
   * Busca inicial e configuração de refetch automático
   */
  useEffect(() => {
    if (autoFetch) {
      fetchProjects();
    }

    // Configura refetch automático se especificado
    if (refetchInterval && refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchProjects();
      }, refetchInterval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoFetch, refetchInterval]); // Removido fetchProjects das dependências para evitar loop infinito

  /**
   * Cleanup ao desmontar componente
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Estados derivados para facilitar uso
   */
  const isInitialLoading = loading && projects.length === 0 && !error;
  const isRefetching = loading && projects.length > 0;
  const hasError = error !== null;
  const hasProjects = projects.length > 0;

  /**
   * Estatísticas dos projetos
   */
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    averageProgress: projects.length > 0 
      ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
      : 0
  };

  return {
    // Dados
    projects,
    stats,
    lastFetch,

    // Estados
    loading,
    error,
    isEmpty,
    retryCount,

    // Estados derivados
    isInitialLoading,
    isRefetching,
    hasError,
    hasProjects,

    // Funções
    fetchProjects,
    refetch,
    retryWithBackoff,
    clearError,
    addProject,
    updateProject,
    removeProject
  };
};

export default useProjects;