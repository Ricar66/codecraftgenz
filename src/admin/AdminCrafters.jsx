import React, { useState, useEffect, useMemo } from 'react';

import { useCrafters, CraftersRepo } from '../hooks/useAdminRepo';
import './AdminCrafters.css';

export default function AdminCrafters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('nome');
  const [sortDirection, setSortDirection] = useState('asc');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'inactive'
  
  // Hook otimizado com opções de busca
  const searchOptions = useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    active_only: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
    order_by: sortBy,
    order_direction: sortDirection
  }), [currentPage, itemsPerPage, searchTerm, activeFilter, sortBy, sortDirection]);
  
  const { crafters, pagination, loading, error, reload, loadPage } = useCrafters(searchOptions);
  // Resetar página quando filtros mudarem
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, searchTerm, activeFilter, sortBy, sortDirection]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadPage(page);
  };

  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const handleDeleteCrafter = async (crafterId) => {
    if (!window.confirm('Tem certeza que deseja excluir este crafter?')) {
      return;
    }

    try {
      await CraftersRepo.delete(crafterId);
      reload(); // Recarregar a lista
    } catch (error) {
      console.error('Erro ao excluir crafter:', error);
      alert('Erro ao excluir crafter: ' + error.message);
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading && crafters.length === 0) {
    return (
      <div className="admin-crafters">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando crafters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-crafters">
        <div className="error-state">
          <h3>Erro ao carregar crafters</h3>
          <p>{error}</p>
          <button onClick={reload} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-crafters">
      <div className="admin-crafters-header">
        <h2>Gerenciar Crafters</h2>
        <div className="header-stats">
          <span className="stat-item">
            Total: <strong>{pagination.total}</strong>
          </span>
          <span className="stat-item">
            Página: <strong>{pagination.page} de {pagination.totalPages}</strong>
          </span>
        </div>
      </div>

      <div className="admin-crafters-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-section">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos os crafters</option>
            <option value="active">Apenas ativos</option>
            <option value="inactive">Apenas inativos</option>
          </select>

          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="items-per-page-select"
          >
            <option value={5}>5 por página</option>
            <option value={10}>10 por página</option>
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
          </select>
        </div>
      </div>

      <div className="crafters-table-container">
        <table className="crafters-table">
          <thead>
            <tr>
              <th 
                onClick={() => handleSort('nome')}
                className={`sortable ${sortBy === 'nome' ? 'active' : ''}`}
              >
                Nome {getSortIcon('nome')}
              </th>
              <th 
                onClick={() => handleSort('email')}
                className={`sortable ${sortBy === 'email' ? 'active' : ''}`}
              >
                Email {getSortIcon('email')}
              </th>
              <th 
                onClick={() => handleSort('points')}
                className={`sortable ${sortBy === 'points' ? 'active' : ''}`}
              >
                Pontos {getSortIcon('points')}
              </th>
              <th 
                onClick={() => handleSort('active')}
                className={`sortable ${sortBy === 'active' ? 'active' : ''}`}
              >
                Status {getSortIcon('active')}
              </th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {crafters.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  {searchTerm || activeFilter !== 'all' 
                    ? 'Nenhum crafter encontrado com os filtros aplicados.' 
                    : 'Nenhum crafter cadastrado.'}
                </td>
              </tr>
            ) : (
              crafters.map((crafter) => (
                <tr key={crafter.id}>
                  <td>
                    <div className="crafter-name">
                      {crafter.avatar_url && (
                        <img 
                          src={crafter.avatar_url} 
                          alt={crafter.nome}
                          className="crafter-avatar"
                        />
                      )}
                      <span>{crafter.nome}</span>
                    </div>
                  </td>
                  <td>{crafter.email || '-'}</td>
                  <td>
                    <span className="points-badge">
                      {crafter.points || 0}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${crafter.active ? 'active' : 'inactive'}`}>
                      {crafter.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-button"
                        onClick={() => {/* TODO: Implementar edição */}}
                        title="Editar crafter"
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => handleDeleteCrafter(crafter.id)}
                        title="Excluir crafter"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Mostrando {((pagination.page - 1) * itemsPerPage) + 1} a {Math.min(pagination.page * itemsPerPage, pagination.total)} de {pagination.total} crafters
          </div>
          
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || loading}
              className="pagination-button"
            >
              ← Anterior
            </button>
            
            <div className="pagination-numbers">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                    className={`pagination-number ${pageNum === pagination.page ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || loading}
              className="pagination-button"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {loading && crafters.length > 0 && (
        <div className="loading-overlay">
          <div className="spinner-small"></div>
        </div>
      )}


    </div>
  );
}