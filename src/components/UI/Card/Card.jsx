// src/components/UI/Card/Card.jsx
// Componente Card base reutilizavel

import { forwardRef } from 'react';

import styles from './Card.module.css';

/**
 * Card - Componente de card base padronizado
 *
 * @param {'default'|'elevated'|'outlined'|'glass'} variant - Estilo visual
 * @param {'sm'|'md'|'lg'} padding - Padding interno
 * @param {boolean} hoverable - Efeito hover
 * @param {boolean} clickable - Cursor pointer e efeito clique
 * @param {boolean} fullWidth - 100% de largura
 *
 * @example
 * // Card simples
 * <Card>Conteudo do card</Card>
 *
 * @example
 * // Card elevado com hover
 * <Card variant="elevated" hoverable>
 *   <Card.Header>Titulo</Card.Header>
 *   <Card.Body>Conteudo</Card.Body>
 * </Card>
 *
 * @example
 * // Card glass (glassmorphism)
 * <Card variant="glass">
 *   Conteudo com efeito glass
 * </Card>
 */
const Card = forwardRef(({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  fullWidth = false,
  className,
  onClick,
  as: Component = 'div',
  ...props
}, ref) => {
  const cardClass = [
    styles.card,
    styles[variant],
    styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`],
    hoverable && styles.hoverable,
    clickable && styles.clickable,
    fullWidth && styles.fullWidth,
    className
  ].filter(Boolean).join(' ');

  return (
    <Component
      ref={ref}
      className={cardClass}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      {...props}
    >
      {children}
    </Component>
  );
});

Card.displayName = 'Card';

/**
 * Card.Header - Cabecalho do card
 */
const CardHeader = forwardRef(({
  children,
  className,
  actions,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={`${styles.header} ${className || ''}`} {...props}>
      <div className={styles.headerContent}>{children}</div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
    </div>
  );
});

CardHeader.displayName = 'Card.Header';

/**
 * Card.Body - Corpo principal do card
 */
const CardBody = forwardRef(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={`${styles.body} ${className || ''}`} {...props}>
      {children}
    </div>
  );
});

CardBody.displayName = 'Card.Body';

/**
 * Card.Footer - Rodape do card
 */
const CardFooter = forwardRef(({
  children,
  className,
  align = 'right',
  ...props
}, ref) => {
  const footerClass = [
    styles.footer,
    styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`],
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={footerClass} {...props}>
      {children}
    </div>
  );
});

CardFooter.displayName = 'Card.Footer';

/**
 * Card.Image - Imagem do card
 */
const CardImage = forwardRef(({
  src,
  alt,
  className,
  aspectRatio = '16/9',
  position = 'top',
  ...props
}, ref) => {
  const imageClass = [
    styles.image,
    styles[`image${position.charAt(0).toUpperCase() + position.slice(1)}`],
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={imageClass}
      style={{ aspectRatio }}
      {...props}
    >
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
});

CardImage.displayName = 'Card.Image';

// Compound component pattern
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Image = CardImage;

export default Card;
