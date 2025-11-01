import React, { createContext, useContext } from 'react';

import { useDataSync } from '../hooks/useDataSync.js';

// Criar o contexto
const DataSyncContext = createContext();

// Provider do contexto
export function DataSyncProvider({ children }) {
  const {
    data,
    loading,
    error,
    lastUpdate,
    forceRefresh,
    silentRefresh,
    invalidateAndRefresh,
    createCrafter,
    createTeam,
    updateTeamStatus,
    removeCrafterFromTeam
  } = useDataSync();

  // Extrair dados específicos
  const crafters = data.crafters || [];
  const mentors = data.mentors || [];
  const projects = data.projects || [];
  const teams = data.teams || [];

  // Função para processar crafters com informações de equipe
  const getCraftersWithTeamInfo = () => {
    return crafters.map(crafter => {
      const crafterTeams = teams.filter(team => team.crafter_id === crafter.id);
      return {
        ...crafter,
        teams: crafterTeams,
        hasTeam: crafterTeams.length > 0,
        teamCount: crafterTeams.length
      };
    });
  };

  // Função para agrupar equipes por projeto
  const getEquipesGroupedByProject = () => {
    const grouped = {};
    teams.forEach(team => {
      const projectId = team.projeto_id;
      if (!grouped[projectId]) {
        const project = projects.find(p => p.id === projectId);
        grouped[projectId] = {
          project,
          teams: []
        };
      }
      grouped[projectId].teams.push(team);
    });
    return grouped;
  };

  // Função para obter crafters disponíveis (sem equipe)
  const getAvailableCrafters = () => {
    const craftersInTeams = teams.map(team => team.crafter_id);
    return crafters.filter(crafter => !craftersInTeams.includes(crafter.id));
  };

  // Dados processados
  const craftersWithTeamInfo = getCraftersWithTeamInfo();
  const groupedTeams = getEquipesGroupedByProject();
  const availableCrafters = getAvailableCrafters();

  // Função para notificar mudanças
  const notifyDataChange = () => {
    forceRefresh();
  };

  // Valor do contexto
  const contextValue = {
    // Dados básicos
    crafters,
    mentors,
    projects,
    teams,
    loading,
    error,
    lastUpdate,
    
    // Funções de controle
    forceRefresh,
    silentRefresh,
    invalidateAndRefresh,
    notifyDataChange,
    
    // Funções de manipulação
    createCrafter,
    createTeam,
    updateTeamStatus,
    removeCrafterFromTeam,
    
    // Dados processados
    craftersWithTeamInfo,
    groupedTeams,
    availableCrafters,
    
    // Funções de processamento
    getCraftersWithTeamInfo,
    getEquipesGroupedByProject,
    getAvailableCrafters
  };

  return (
    <DataSyncContext.Provider value={contextValue}>
      {children}
    </DataSyncContext.Provider>
  );
}

// Hook para usar o contexto
export function useDataSyncContext() {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSyncContext deve ser usado dentro de um DataSyncProvider');
  }
  return context;
}

// Export padrão para compatibilidade
export { useDataSyncContext as useDataSync };