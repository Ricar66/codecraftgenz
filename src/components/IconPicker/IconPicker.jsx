// src/components/IconPicker/IconPicker.jsx
// Seletor de ícone lucide-react — grade curada + busca por nome.
// Salva o NOME do ícone (string), não o componente.
import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CATEGORY_ICON_LIST } from '../../utils/lucideIconMap';
import styles from './IconPicker.module.css';

export default function IconPicker({ value, onChange, disabled = false }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_ICON_LIST;
    return CATEGORY_ICON_LIST.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || item.group.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className={styles.picker}>
      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={16} />
        <input
          type="text"
          placeholder="Buscar ícone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
          disabled={disabled}
        />
      </div>

      <div className={styles.grid} role="listbox" aria-label="Selecionar ícone">
        {filtered.map(({ name, Icon }) => {
          const selected = value === name;
          return (
            <button
              key={name}
              type="button"
              className={`${styles.item} ${selected ? styles.itemSelected : ''}`}
              onClick={() => onChange?.(name)}
              disabled={disabled}
              title={name}
              aria-pressed={selected}
              aria-label={name}
            >
              <Icon size={20} />
              <span className={styles.itemLabel}>{name}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className={styles.empty}>Nenhum ícone encontrado</div>
        )}
      </div>
    </div>
  );
}
