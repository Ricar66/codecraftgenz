// src/admin/components/AdminTable.jsx
// Componente de Tabela padronizado para o Admin

import React from 'react';
import styles from './AdminTable.module.css';

/**
 * AdminTable - Tabela responsiva padronizada
 *
 * @param {Array} columns - Colunas da tabela [{ key, label, width?, align?, render? }]
 * @param {Array} data - Dados da tabela
 * @param {Function} onRowClick - Callback ao clicar em uma linha
 * @param {boolean} loading - Estado de carregamento
 * @param {string} emptyMessage - Mensagem quando não há dados
 * @param {boolean} hoverable - Efeito hover nas linhas
 * @param {boolean} striped - Linhas alternadas
 *
 * @example
 * <AdminTable
 *   columns={[
 *     { key: 'name', label: 'Nome' },
 *     { key: 'email', label: 'Email' },
 *     { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
 *     { key: 'actions', label: '', render: (_, row) => <button>Editar</button> }
 *   ]}
 *   data={users}
 *   loading={loading}
 * />
 */
const AdminTable = ({
  columns = [],
  data = [],
  onRowClick,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  hoverable = true,
  striped = false,
  className,
}) => {
  const tableClass = [
    styles.tableWrapper,
    hoverable && styles.hoverable,
    striped && styles.striped,
    className
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className={tableClass}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={tableClass}>
        <div className={styles.empty}>
          <span>{emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={tableClass}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.key || i}
                style={{
                  width: col.width,
                  textAlign: col.align || 'left'
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? styles.clickable : ''}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.key || colIdx}
                  data-label={col.label}
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.render
                    ? col.render(row[col.key], row, rowIdx)
                    : row[col.key] ?? '-'
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTable;
