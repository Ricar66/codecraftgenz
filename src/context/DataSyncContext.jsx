import React, { createContext, useContext, useCallback } from 'react';
import { useDataSync } from '../hooks/useDataSync';

/**
 * Contexto para sincronização de dados global
 * Permite que todos os componentes acessem e atualizem dados sincronizados
 */
const DataSyncContext = createContext();

/**
 * Provider do contexto de sincronização de dados
 */
export const DataSyncProvider = ({ children }) => {
  // Hook de sincronização com configurações otimizadas
  const {
    data,
    loading,
    error,
    lastUpdate,
    forceRefresh,
    silentRefresh,
    invalidateAndRefresh,
    createCrafter: hookCreateCrafter,
    createTeam: hookCreateTeam,
    updateTeamStatus: hookUpdateTeamStatus,
    removeCrafterFromTeam: hookRemoveCrafterFromTeam
  } = useDataSync({
    autoRefresh: true,
    refreshInterval: 30000, // 30 segundos
    onError: (error) => {
      console.error('Erro na sincronização de dados:', error);
    },
    onDataUpdate: (newData) => {
      console.log('Dados atualizados:', {
        crafters: newData.crafters.length,
        mentores: newData.mentores.length,
        projetos: newData.projetos.length,
        equipes: newData.equipes.length,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Função para notificar que dados foram modificados
   * Deve ser chamada após operações de CREATE, UPDATE, DELETE
   */
  const notifyDataChange = useCallback(() => {
    silentRefresh();
  }, [silentRefresh]);

  /**
   * Função para criar um crafter (apenas na página dedicada)
   */
  const createCrafter = useCallback(async (crafterData) => {
    return await hookCreateCrafter(crafterData);
  }, [hookCreateCrafter]);

  /**
   * Função para criar uma equipe
   */
  const createEquipe = useCallback(async (equipeData) => {
    return await hookCreateTeam(equipeData);
  }, [hookCreateTeam]);

  /**
   * Função para atualizar status de equipe
   */
  const updateEquipeStatus = useCallback(async (equipeId, status) => {
    return await hookUpdateTeamStatus(equipeId, status);
  }, [hookUpdateTeamStatus]);

  /**
   * Função para remover crafter de equipe
   */
  const removeCrafterFromEquipe = useCallback(async (equipeId) => {
    return await hookRemoveCrafterFromTeam(equipeId);
  }, [hookRemoveCrafterFromTeam]);

  /**
   * Função para processar crafters com informações de equipe
   */
  const getCraftersWithTeamInfo = useCallback(() => {
    return data.crafters.map(crafter => {
      // Encontrar equipe do crafter
      const equipe = data.equipes.find(e => e.crafter_id === crafter.id);
      
      // Encontrar projeto e mentor através da equipe
      const projeto = equipe ? data.projetos.find(p => p.id === equipe.projeto_id) : null;
      const mentor = equipe ? data.mentores.find(m => m.id === equipe.mentor_id) : null;

      return {
        ...crafter,
        equipe_id: equipe?.id || null,
        projeto_nome: projeto?.titulo || projeto?.nome || 'Não atribuído',
        projeto_id: projeto?.id || null,
        mentor_nome: mentor?.nome || 'Não atribuído',
        mentor_id: mentor?.id || null,
        status_inscricao: equipe?.status_inscricao || 'Sem equipe'
      };
    });
  }, [data.crafters, data.equipes, data.projetos, data.mentores]);

  /**
   * Função para agrupar equipes por projeto
   */
  const getEquipesGroupedByProject = useCallback(() => {
    return data.equipes.reduce((acc, equipe) => {
      if (!acc[equipe.projeto_id]) {
        acc[equipe.projeto_id] = [];
      }
      acc[equipe.projeto_id].push({
        ...equipe,
        crafter_nome: data.crafters.find(c => c.id === equipe.crafter_id)?.nome || 'Crafter não encontrado',
        mentor_nome: data.mentores.find(m => m.id === equipe.mentor_id)?.nome || 'Mentor não encontrado',
        projeto_titulo: data.projetos.find(p => p.id === equipe.projeto_id)?.titulo || 'Projeto não encontrado'
      });
      return acc;
    }, {});
  }, [data.equipes, data.crafters, data.mentores, data.projetos]);

  /**
   * Função para obter crafters disponíveis (sem equipe)
   */
  const getAvailableCrafters = useCallback(() => {
    const craftersInTeams = new Set(data.equipes.map(e => e.crafter_id));
    return data.crafters.filter(crafter => !craftersInTeams.has(crafter.id));
  }, [data.crafters, data.equipes]);

  const contextValue = {
    // Dados sincronizados
    crafters: data.crafters || [],
    mentors: data.mentors || [],
    projects: data.projects || [],
    teams: data.teams || [],
    
    // Estados
    loading,
    error,
    lastUpdate,
    
    // Funções de sincronização
    forceRefresh,
    silentRefresh,
    invalidateAndRefresh,
    notifyDataChange,
    
    // Funções de manipulação
    createCrafter,
    createTeam: createTeam,
    updateTeamStatus,
    removeCrafterFromTeam,
    
    // Dados processados
    craftersWithTeamInfo,
    groupedTeams,
    availableCrafters
  };

  return (
    <DataSyncContext.Provider value={contextValue}>
      {children}
    </DataSyncContext.Provider>
  );
};

/**
 * Hook para usar o contexto de sincronização
 */
export const useDataSyncContext = () => {
  const context = useContext(DataSyncContext);
  
  if (!context) {
    throw new Error('useDataSyncContext deve ser usado dentro de um DataSyncProvider');
  }
  
  return context;
};

export default DataSyncContext;