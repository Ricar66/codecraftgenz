// src/components/UI/Select/Select.jsx
// Componente de Select reutilizavel

import { forwardRef, useState } from 'react';
import { FiChevronDown, FiAlertCircle } from 'react-icons/fi';

import styles from './Select.module.css';

/**
 * Select - Componente de select padronizado
 *
 * @param {'sm'|'md'|'lg'} size - Tamanho do select
 * @param {string} label - Label do campo
 * @param {string} placeholder - Placeholder (primeira opcao desabilitada)
 * @param {Array} options - Array de opcoes [{value, label}]
 * @param {string} helperText - Texto de ajuda
 * @param {string} error - Mensagem de erro
 * @param {boolean} disabled - Desabilita o select
 * @param {boolean} required - Campo obrigatorio
 * @param {boolean} fullWidth - Se ocupa 100% da largura
 *
 * @example
 * // Select simples
 * <Select
 *   label="Categoria"
 *   options={[
 *     { value: 'tech', label: 'Tecnologia' },
 *     { value: 'design', label: 'Design' }
 *   ]}
 * />
 *
 * @example
 * // Select com erro
 * <Select label="Pais" error="Selecione um pais" options={paises} />
 */
const Select = forwardRef(({
  size = 'md',
  label,
  placeholder = 'Selecione uma opcao',
  options = [],
  helperText,
  error,
  disabled = false,
  required = false,
  fullWidth = false,
  className,
  id,
  name,
  value,
  onChange,
  onBlur,
  onFocus,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const selectId = id || name || `select-${Math.random().toString(36).slice(2, 9)}`;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;

  const hasError = Boolean(error);
  const hasValue = value !== undefined && value !== '';

  const wrapperClass = [
    styles.wrapper,
    fullWidth && styles.fullWidth,
    className
  ].filter(Boolean).join(' ');

  const selectWrapperClass = [
    styles.selectWrapper,
    styles[size],
    hasError && styles.error,
    disabled && styles.disabled,
    isFocused && styles.focused,
    !hasValue && styles.placeholder
  ].filter(Boolean).join(' ');

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div className={wrapperClass}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <div className={selectWrapperClass}>
        <select
          ref={ref}
          id={selectId}
          name={name}
          className={styles.select}
          disabled={disabled}
          required={required}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-invalid={hasError}
          aria-describedby={[
            hasError ? errorId : null,
            helperText ? helperId : null,
            ariaDescribedBy
          ].filter(Boolean).join(' ') || undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        <span className={styles.iconWrapper}>
          {hasError ? (
            <FiAlertCircle className={styles.iconError} />
          ) : (
            <FiChevronDown className={styles.iconChevron} />
          )}
        </span>
      </div>

      {(helperText || error) && (
        <div className={styles.helperWrapper}>
          {error && (
            <span id={errorId} className={styles.errorText} role="alert">
              {error}
            </span>
          )}
          {helperText && !error && (
            <span id={helperId} className={styles.helperText}>
              {helperText}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
