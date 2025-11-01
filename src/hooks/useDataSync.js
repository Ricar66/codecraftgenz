import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook personalizado para sincronização de dados em tempo real
 * Gerencia crafters, mentores, projetos e equipes com atualizações automáticas
 */
export const useDataSync = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 segundos
    onError = null,
    onDataUpdate = null
  } = options;

  // Estados principais
  const [data, setData] = useState({
    crafters: [],
    mentores: [],
    projetos: [],
    equipes: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, error, success

  // Refs para controle
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  // URLs das APIs
  const API_ENDPOINTS = {
    crafters: '/api/sqlite/crafters',
    mentores: '/api/mentores?all=1',
    projetos: '/api/sqlite/projetos',
    equipes: '/api/sqlite/equipes'
  };

  /**
   * Função auxiliar para fazer requisições com retry
   */
  const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      } catch (error) {
        lastError = error;
        if (i < maxRetries) {
          // Aguardar um tempo crescente antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    throw lastError;
  };

  /**
   * Função para carregar dados de uma API específica
   */
  const fetchData = useCallback(async (endpoint, key) => {
    try {
      const response = await fetchWithRetry(endpoint, {
        signal: abortControllerRef.current?.signal
      });
      

      
      const result = await response.json();
      
      // Normalizar dados baseado no tipo
      let normalizedData = [];
      
      if (key === 'mentores') {
        // API de mentores tem estrutura diferente
        normalizedData = (result || []).map(mentor => ({
          id: mentor.id,
          nome: mentor.name || mentor.nome,
          email: mentor.email,
          telefone: mentor.phone || mentor.telefone,
          bio: mentor.bio,
          visible: mentor.visible
        }));
      } else {
        // APIs SQLite têm estrutura padrão
        normalizedData = result.success ? (result.data || []) : [];
      }
      
      return { key, data: normalizedData };
    } catch (error) {
      if (error.name === 'AbortError') {
        return null; // Request foi cancelada
      }
      throw new Error(`Erro ao carregar ${key}: ${error.message}`);
    }
  }, []);

  /**
   * Função principal para carregar todos os dados
   */
  const loadAllData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
        setSyncStatus('syncing');
      }
      
      setError(null);

      // Cancelar requisições anteriores
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Criar novo AbortController
      abortControllerRef.current = new AbortController();

      // Carregar todos os dados em paralelo
      const promises = Object.entries(API_ENDPOINTS).map(([key, endpoint]) =>
        fetchData(endpoint, key)
      );

      const results = await Promise.allSettled(promises);
      
      // Processar resultados
      const newData = { ...data };
      const errors = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const { key, data: fetchedData } = result.value;
          newData[key] = fetchedData;
        } else if (result.status === 'rejected') {
          errors.push(result.reason.message);
        }
      });

      // Atualizar estado
      setData(newData);
      setLastUpdate(new Date());
      setSyncStatus(errors.length > 0 ? 'error' : 'success');

      if (errors.length > 0) {
        const errorMessage = `Erros na sincronização: ${errors.join(', ')}`;
        setError(errorMessage);
        if (onError) onError(errorMessage);
      } else {
        setError(null);
        if (onDataUpdate) onDataUpdate(newData);
      }

    } catch (error) {
      const errorMessage = `Erro geral na sincronização: ${error.message}`;
      setError(errorMessage);
      setSyncStatus('error');
      if (onError) onError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [data, fetchData, onError, onDataUpdate]);

  /**
   * Função para forçar atualização manual
   */
  const forceRefresh = useCallback(() => {
    loadAllData(true);
  }, [loadAllData]);

  /**
   * Função para atualização silenciosa (sem loading)
   */
  const silentRefresh = useCallback(() => {
    loadAllData(false);
  }, [loadAllData]);

  /**
   * Configurar auto-refresh
   */
  useEffect(() => {
    // Carregar dados iniciais
    loadAllData(true);

    // Configurar intervalo de atualização (apenas se não houver erros)
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (!error) {
          silentRefresh();
        }
      }, refreshInterval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoRefresh, refreshInterval, loadAllData, silentRefresh, error]);

  /**
   * Cria um novo crafter
   */
  const createCrafter = useCallback(async (crafterData) => {
    try {
      const response = await fetchWithRetry('/api/sqlite/crafters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(crafterData)
      });

      const result = await response.json();
      
      // Atualizar dados locais
      await loadAllData(true);
      
      return result;
    } catch (error) {
      console.error('Erro ao criar crafter:', error);
      throw error;
    }
  }, [loadAllData, fetchWithRetry]);

  /**
   * Cria uma nova equipe
   */
  const createTeam = useCallback(async (teamData) => {
    try {
      const response = await fetchWithRetry('/api/sqlite/equipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData)
      });

      const result = await response.json();
      
      // Atualizar dados locais
      await loadAllData(true);
      
      return result;
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
      throw error;
    }
  }, [loadAllData, fetchWithRetry]);

  /**
   * Atualiza o status de uma equipe
   */
  const updateTeamStatus = useCallback(async (equipeId, novoStatus) => {
    try {
      const response = await fetchWithRetry('/api/sqlite/equipes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: equipeId,
          status_inscricao: novoStatus
        })
      });

      const result = await response.json();
      
      // Atualizar dados locais
      await loadAllData(true);
      
      return result;
    } catch (error) {
      console.error('Erro ao atualizar status da equipe:', error);
      throw error;
    }
  }, [loadAllData, fetchWithRetry]);

  /**
   * Remove um crafter de uma equipe
   */
  const removeCrafterFromTeam = useCallback(async (equipeId) => {
    try {
      const response = await fetchWithRetry(`/api/sqlite/equipes/${equipeId}`, {
        method: 'DELETE'
      });

      // Atualizar dados locais
      await loadAllData(true);
      
      return true;
    } catch (error) {
      console.error('Erro ao remover crafter da equipe:', error);
      throw error;
    }
  }, [loadAllData, fetchWithRetry]);

  /**
   * Função para invalidar cache e recarregar dados específicos
   */
  const invalidateAndRefresh = useCallback((dataTypes = []) => {
    if (dataTypes.length === 0) {
      // Recarregar tudo
      forceRefresh();
    } else {
      // Recarregar tipos específicos
      const promises = dataTypes.map(type => {
        if (API_ENDPOINTS[type]) {
          return fetchData(API_ENDPOINTS[type], type);
        }
        return Promise.resolve(null);
      });

      Promise.allSettled(promises).then(results => {
        const newData = { ...data };
        
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            const { key, data: fetchedData } = result.value;
            newData[key] = fetchedData;
          }
        });

        setData(newData);
        setLastUpdate(new Date());
        if (onDataUpdate) onDataUpdate(newData);
      });
    }
  }, [data, fetchData, forceRefresh, onDataUpdate]);

  return {
    // Dados
    crafters: data.crafters,
    mentores: data.mentores,
    projetos: data.projetos,
    equipes: data.equipes,
    
    // Estados
    loading,
    error,
    lastUpdate,
    syncStatus,
    
    // Funções
    forceRefresh,
    silentRefresh,
    invalidateAndRefresh,
    createCrafter,
    createTeam,
    updateTeamStatus,
    removeCrafterFromTeam
  };
};

export default useDataSync;