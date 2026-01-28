// src/admin/AdminCrafters.jsx
// Refatorado para usar Design System CodeCraft
import React, { useState, useEffect, useMemo } from 'react';
import { FaUsers, FaSearch, FaEdit, FaTrash, FaStar } from 'react-icons/fa';

import { useCrafters, CraftersRepo } from '../hooks/useAdminRepo';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminCrafters.module.css';

export default function AdminCrafters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('nome');
  const [sortDirection, setSortDirection] = useState('asc');
  const [activeFilter, setActiveFilter] = useState('all');

  const searchOptions = useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    active_only: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
    order_by: sortBy,
    order_direction: sortDirection
  }), [currentPage, itemsPerPage, searchTerm, activeFilter, sortBy, sortDirection]);

  const { crafters, pagination, loading, error, reload, loadPage } = useCrafters(searchOptions);

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
      reload();
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
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando crafters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <AdminCard variant="outlined">
          <div className={styles.errorState}>
            <h3>Erro ao carregar crafters</h3>
            <p>{error}</p>
            <button onClick={reload} className={styles.retryBtn}>
              Tentar novamente
            </button>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <FaUsers className={styles.headerIcon} />
          <div>
            <h1>Gerenciar Crafters</h1>
            <p>Total: {pagination.total} | Página {pagination.page} de {pagination.totalPages}</p>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <section className={styles.filters}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Todos os crafters</option>
            <option value="active">Apenas ativos</option>
            <option value="inactive">Apenas inativos</option>
          </select>

          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className={styles.filterSelect}
          >
            <option value={5}>5 por página</option>
            <option value={10}>10 por página</option>
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => handleSort(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="nome">Ordenar: Nome</option>
            <option value="email">Ordenar: Email</option>
            <option value="points">Ordenar: Pontos</option>
            <option value="active">Ordenar: Status</option>
          </select>

          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className={styles.sortBtn}
          >
            {getSortIcon(sortBy)} {sortDirection === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
      </section>

      {/* Grid de Cards */}
      <section className={styles.craftersGrid}>
        {crafters.length === 0 ? (
          <AdminCard variant="outlined" className={styles.emptyCard}>
            <div className={styles.emptyState}>
              <p>
                {searchTerm || activeFilter !== 'all'
                  ? 'Nenhum crafter encontrado com os filtros aplicados.'
                  : 'Nenhum crafter cadastrado.'}
              </p>
            </div>
          </AdminCard>
        ) : (
          crafters.map((crafter) => (
            <AdminCard key={crafter.id} variant="elevated" hoverable className={styles.crafterCard}>
              <div className={styles.cardHeader}>
                <div className={styles.crafterInfo}>
                  {crafter.avatar_url ? (
                    <img
                      src={crafter.avatar_url}
                      alt={crafter.nome}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {crafter.nome?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={styles.crafterName}>{crafter.nome}</span>
                </div>
                <StatusBadge
                  variant={crafter.active ? 'success' : 'error'}
                  dot
                  pulse={crafter.active}
                >
                  {crafter.active ? 'Ativo' : 'Inativo'}
                </StatusBadge>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>{crafter.email || '-'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Pontos</span>
                  <span className={styles.pointsBadge}>
                    <FaStar className={styles.starIcon} /> {crafter.points || 0}
                  </span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <button
                  className={styles.editBtn}
                  onClick={() => {/* TODO: Edição */}}
                  title="Editar crafter"
                >
                  <FaEdit /> Editar
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteCrafter(crafter.id)}
                  title="Excluir crafter"
                >
                  <FaTrash /> Excluir
                </button>
              </div>
            </AdminCard>
          ))
        )}
      </section>

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <AdminCard variant="outlined" className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Mostrando {((pagination.page - 1) * itemsPerPage) + 1} a {Math.min(pagination.page * itemsPerPage, pagination.total)} de {pagination.total}
          </div>

          <div className={styles.paginationControls}>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || loading}
              className={styles.pageBtn}
            >
              ← Anterior
            </button>

            <div className={styles.pageNumbers}>
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
                    className={`${styles.pageBtn} ${pageNum === pagination.page ? styles.active : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || loading}
              className={styles.pageBtn}
            >
              Próxima →
            </button>
          </div>
        </AdminCard>
      )}

      {/* Loading overlay */}
      {loading && crafters.length > 0 && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinnerSmall} />
        </div>
      )}
    </div>
  );
}
