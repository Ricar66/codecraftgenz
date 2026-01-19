// src/admin/components/AdminFilters.jsx
// Componente de Filtros padronizado para o Admin

import React from 'react';
import styles from './AdminFilters.module.css';

/**
 * AdminFilters - Secao de filtros responsiva e padronizada
 *
 * @param {React.ReactNode} children - Campos de filtro
 * @param {string} layout - Layout: 'row' | 'grid' (default: 'row')
 * @param {number} columns - Numero de colunas no grid (default: 4)
 * @param {Function} onReset - Callback para resetar filtros
 * @param {boolean} showReset - Mostrar botao de reset
 *
 * @example
 * <AdminFilters onReset={handleReset}>
 *   <AdminFilters.Search value={search} onChange={setSearch} />
 *   <AdminFilters.Select
 *     label="Status"
 *     value={status}
 *     onChange={setStatus}
 *     options={[{ value: '', label: 'Todos' }, { value: 'active', label: 'Ativo' }]}
 *   />
 * </AdminFilters>
 */
const AdminFilters = ({
  children,
  layout = 'row',
  columns = 4,
  onReset,
  showReset = false,
  className,
}) => {
  const wrapperClass = [
    styles.filters,
    styles[layout],
    className
  ].filter(Boolean).join(' ');

  const gridStyle = layout === 'grid' ? {
    '--filter-columns': columns
  } : undefined;

  return (
    <div className={wrapperClass} style={gridStyle}>
      <div className={styles.fields}>
        {children}
      </div>
      {showReset && onReset && (
        <button
          type="button"
          className={styles.resetBtn}
          onClick={onReset}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
};

/**
 * AdminFilters.Search - Campo de busca
 */
const FilterSearch = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  debounce = 300,
  className,
}) => {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = React.useRef(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange?.(newValue);
    }, debounce);
  };

  return (
    <div className={`${styles.field} ${className || ''}`}>
      <input
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={styles.input}
        aria-label={placeholder}
      />
    </div>
  );
};

/**
 * AdminFilters.Select - Campo de selecao
 */
const FilterSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Selecione...',
  label,
  className,
}) => {
  return (
    <div className={`${styles.field} ${className || ''}`}>
      {label && <label className={styles.label}>{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={styles.select}
        aria-label={label || placeholder}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * AdminFilters.DateRange - Filtro de periodo
 */
const FilterDateRange = ({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  label,
  className,
}) => {
  return (
    <div className={`${styles.field} ${styles.dateRange} ${className || ''}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.dateInputs}>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange?.(e.target.value)}
          className={styles.input}
          aria-label="Data inicial"
        />
        <span className={styles.dateSeparator}>ate</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndChange?.(e.target.value)}
          className={styles.input}
          aria-label="Data final"
        />
      </div>
    </div>
  );
};

// Compound component pattern
AdminFilters.Search = FilterSearch;
AdminFilters.Select = FilterSelect;
AdminFilters.DateRange = FilterDateRange;

export default AdminFilters;
