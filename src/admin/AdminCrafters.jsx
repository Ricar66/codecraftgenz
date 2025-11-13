import React, { useState, useEffect, useMemo } from 'react';

import { useCrafters, CraftersRepo } from '../hooks/useAdminRepo';
import './AdminCrafters.css';
import './AdminCommon.css';

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
      <div className="admin-content">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando crafters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-content">
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
    <div className="admin-content">
      <div className="admin-crafters-header">
        <h1 className="title">Gerenciar Crafters</h1>
        <div className="header-stats muted">
          <span className="stat-item">
            Total: <strong>{pagination.total}</strong>
          </span>
          <span className="stat-item">
            Página: <strong>{pagination.page} de {pagination.totalPages}</strong>
          </span>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
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

      <div className="crafters-toolbar">
        <div className="toolbar-left">
          <label htmlFor="sort-field" className="toolbar-label">Ordenar por</label>
          <select
            id="sort-field"
            value={sortBy}
            onChange={(e) => handleSort(e.target.value)}
            className="sort-select"
            aria-label="Selecionar campo de ordenação"
          >
            <option value="nome">Nome</option>
            <option value="email">Email</option>
            <option value="points">Pontos</option>
            <option value="active">Status</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="sort-button btn btn-outline"
            aria-label={`Alternar direção da ordenação (${sortDirection === 'asc' ? 'ascendente' : 'descendente'})`}
            title={`Direção: ${sortDirection === 'asc' ? 'Ascendente' : 'Descendente'}`}
          >
            {getSortIcon(sortBy)} {sortDirection === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      <div className="crafter-grid">
        {crafters.length === 0 ? (
          <div className="no-data" style={{ gridColumn: '1 / -1' }}>
            {searchTerm || activeFilter !== 'all' 
              ? 'Nenhum crafter encontrado com os filtros aplicados.' 
              : 'Nenhum crafter cadastrado.'}
          </div>
        ) : (
          crafters.map((crafter) => (
            <div key={crafter.id} className="crafter-card">
              <div className="card-header">
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
                <span className={`status-badge ${crafter.active ? 'active' : 'inactive'}`}>
                  {crafter.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{crafter.email || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Pontos</span>
                  <span className="points-badge">{crafter.points || 0}</span>
                </div>
              </div>

              <div className="card-footer">
                <div className="action-buttons">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {/* TODO: Edição */}}
                    title="Editar crafter"
                    aria-label="Editar crafter"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteCrafter(crafter.id)}
                    title="Excluir crafter"
                    aria-label="Excluir crafter"
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination-container card" style={{ marginTop:16 }}>
          <div className="pagination-info">
            Mostrando {((pagination.page - 1) * itemsPerPage) + 1} a {Math.min(pagination.page * itemsPerPage, pagination.total)} de {pagination.total} crafters
          </div>
          
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || loading}
              className="btn btn-outline"
              aria-label="Página anterior"
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
                    className={`btn btn-outline ${pageNum === pagination.page ? 'active' : ''}`}
                    aria-label={`Ir para página ${pageNum}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || loading}
              className="btn btn-outline"
              aria-label="Página seguinte"
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