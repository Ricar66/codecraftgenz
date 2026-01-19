// src/admin/components/Pagination.jsx
// Componente de Paginacao padronizado para o Admin

import React from 'react';
import styles from './Pagination.module.css';

/**
 * Pagination - Componente de paginacao reutilizavel
 *
 * @param {number} currentPage - Pagina atual (1-indexed)
 * @param {number} totalPages - Total de paginas
 * @param {number} totalItems - Total de itens (opcional)
 * @param {number} itemsPerPage - Itens por pagina
 * @param {Function} onPageChange - Callback(newPage)
 * @param {Function} onItemsPerPageChange - Callback(newItemsPerPage)
 * @param {Array} itemsPerPageOptions - Opcoes de itens por pagina
 * @param {boolean} showItemsPerPage - Mostrar seletor de itens por pagina
 * @param {boolean} showInfo - Mostrar informacao de itens
 *
 * @example
 * <Pagination
 *   currentPage={page}
 *   totalPages={Math.ceil(total / perPage)}
 *   totalItems={total}
 *   itemsPerPage={perPage}
 *   onPageChange={setPage}
 *   onItemsPerPageChange={setPerPage}
 * />
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
  showItemsPerPage = true,
  showInfo = true,
}) => {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrev = () => {
    if (canGoPrev) onPageChange?.(currentPage - 1);
  };

  const handleNext = () => {
    if (canGoNext) onPageChange?.(currentPage + 1);
  };

  const handleFirst = () => {
    if (currentPage !== 1) onPageChange?.(1);
  };

  const handleLast = () => {
    if (currentPage !== totalPages) onPageChange?.(totalPages);
  };

  // Gerar numeros de pagina visiveis
  const getVisiblePages = () => {
    const delta = 2;
    const pages = [];
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    // Adicionar primeira pagina se nao estiver visivel
    if (left > 1) {
      pages.unshift(1);
      if (left > 2) pages.splice(1, 0, '...');
    }

    // Adicionar ultima pagina se nao estiver visivel
    if (right < totalPages) {
      if (right < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  // Calcular range de itens mostrados
  const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

  if (totalPages <= 1 && !showItemsPerPage) {
    return null;
  }

  return (
    <div className={styles.pagination}>
      {/* Info */}
      {showInfo && totalItems !== undefined && (
        <div className={styles.info}>
          Mostrando {startItem}-{endItem} de {totalItems}
        </div>
      )}

      {/* Items per page selector */}
      {showItemsPerPage && onItemsPerPageChange && (
        <div className={styles.perPage}>
          <label htmlFor="items-per-page">Por pagina:</label>
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className={styles.select}
          >
            {itemsPerPageOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      {totalPages > 1 && (
        <nav className={styles.nav} aria-label="Paginacao">
          <button
            className={styles.btn}
            onClick={handleFirst}
            disabled={!canGoPrev}
            aria-label="Primeira pagina"
            title="Primeira"
          >
            &#171;
          </button>
          <button
            className={styles.btn}
            onClick={handlePrev}
            disabled={!canGoPrev}
            aria-label="Pagina anterior"
            title="Anterior"
          >
            &#8249;
          </button>

          <div className={styles.pages}>
            {visiblePages.map((page, idx) => (
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className={styles.ellipsis}>...</span>
              ) : (
                <button
                  key={page}
                  className={`${styles.pageBtn} ${page === currentPage ? styles.active : ''}`}
                  onClick={() => onPageChange?.(page)}
                  aria-current={page === currentPage ? 'page' : undefined}
                  aria-label={`Pagina ${page}`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          <button
            className={styles.btn}
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Proxima pagina"
            title="Proxima"
          >
            &#8250;
          </button>
          <button
            className={styles.btn}
            onClick={handleLast}
            disabled={!canGoNext}
            aria-label="Ultima pagina"
            title="Ultima"
          >
            &#187;
          </button>
        </nav>
      )}
    </div>
  );
};

export default Pagination;
