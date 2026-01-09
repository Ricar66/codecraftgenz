// src/components/Button/Button.jsx
// Componente de Botao reutilizavel com todas as variantes

import { forwardRef } from 'react';

import { Spinner } from '../UI/Loading/Loading';

import styles from './Button.module.css';

/**
 * Button - Componente de botao padronizado
 *
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'|'success'} variant - Estilo visual
 * @param {'sm'|'md'|'lg'} size - Tamanho do botao
 * @param {boolean} fullWidth - Se o botao ocupa 100% da largura
 * @param {boolean} loading - Exibe spinner e desabilita
 * @param {boolean} disabled - Desabilita o botao
 * @param {React.ReactNode} leftIcon - Icone a esquerda
 * @param {React.ReactNode} rightIcon - Icone a direita
 *
 * @example
 * // Botao primario padrao
 * <Button>Enviar</Button>
 *
 * @example
 * // Botao com loading
 * <Button loading>Salvando...</Button>
 *
 * @example
 * // Botao com icone
 * <Button leftIcon={<FiSave />}>Salvar</Button>
 *
 * @example
 * // Botao outline grande
 * <Button variant="outline" size="lg">Ver mais</Button>
 */
const Button = forwardRef(({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className,
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}, ref) => {

  const isDisabled = disabled || loading;

  const buttonClass = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={buttonClass}
      onClick={onClick}
      type={type}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className={styles.spinnerWrapper}>
          <Spinner size="sm" />
          <span className={styles.loadingText}>{children}</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className={styles.iconLeft}>{leftIcon}</span>}
          <span className={styles.content}>{children}</span>
          {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
