// src/components/UI/Input/Input.jsx
// Componente de Input reutilizavel com todas as variantes

import { forwardRef, useState } from 'react';
import { FiEye, FiEyeOff, FiAlertCircle, FiCheck } from 'react-icons/fi';

import styles from './Input.module.css';

/**
 * Input - Componente de input padronizado
 *
 * @param {'text'|'email'|'password'|'number'|'tel'|'url'|'search'} type - Tipo do input
 * @param {'sm'|'md'|'lg'} size - Tamanho do input
 * @param {string} label - Label do campo
 * @param {string} placeholder - Placeholder
 * @param {string} helperText - Texto de ajuda abaixo do input
 * @param {string} error - Mensagem de erro (ativa estado de erro)
 * @param {boolean} success - Estado de sucesso
 * @param {boolean} disabled - Desabilita o input
 * @param {boolean} required - Campo obrigatorio
 * @param {boolean} fullWidth - Se o input ocupa 100% da largura
 * @param {React.ReactNode} leftIcon - Icone a esquerda
 * @param {React.ReactNode} rightIcon - Icone a direita
 *
 * @example
 * // Input simples
 * <Input label="Email" type="email" placeholder="seu@email.com" />
 *
 * @example
 * // Input com erro
 * <Input label="Senha" type="password" error="Senha muito curta" />
 *
 * @example
 * // Input com icone
 * <Input label="Buscar" leftIcon={<FiSearch />} />
 */
const Input = forwardRef(({
  type = 'text',
  size = 'md',
  label,
  placeholder,
  helperText,
  error,
  success = false,
  disabled = false,
  required = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  id,
  name,
  value,
  onChange,
  onBlur,
  onFocus,
  autoComplete,
  maxLength,
  minLength,
  pattern,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputId = id || name || `input-${Math.random().toString(36).slice(2, 9)}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const hasError = Boolean(error);
  const hasSuccess = success && !hasError;

  const wrapperClass = [
    styles.wrapper,
    fullWidth && styles.fullWidth,
    className
  ].filter(Boolean).join(' ');

  const inputWrapperClass = [
    styles.inputWrapper,
    styles[size],
    hasError && styles.error,
    hasSuccess && styles.success,
    disabled && styles.disabled,
    isFocused && styles.focused,
    leftIcon && styles.hasLeftIcon,
    (rightIcon || isPassword || hasError || hasSuccess) && styles.hasRightIcon
  ].filter(Boolean).join(' ');

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const togglePassword = () => {
    setShowPassword(prev => !prev);
  };

  // Determinar icone direito
  const getRightIcon = () => {
    if (isPassword) {
      return (
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={togglePassword}
          tabIndex={-1}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? <FiEyeOff /> : <FiEye />}
        </button>
      );
    }
    if (hasError) {
      return <FiAlertCircle className={styles.iconError} />;
    }
    if (hasSuccess) {
      return <FiCheck className={styles.iconSuccess} />;
    }
    if (rightIcon) {
      return rightIcon;
    }
    return null;
  };

  return (
    <div className={wrapperClass}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <div className={inputWrapperClass}>
        {leftIcon && (
          <span className={styles.iconLeft}>{leftIcon}</span>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={inputType}
          className={styles.input}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete={autoComplete}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          aria-invalid={hasError}
          aria-describedby={[
            hasError ? errorId : null,
            helperText ? helperId : null,
            ariaDescribedBy
          ].filter(Boolean).join(' ') || undefined}
          {...props}
        />

        {getRightIcon() && (
          <span className={styles.iconRight}>{getRightIcon()}</span>
        )}
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

Input.displayName = 'Input';

export default Input;
