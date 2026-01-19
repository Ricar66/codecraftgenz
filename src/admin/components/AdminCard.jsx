// src/admin/components/AdminCard.jsx
// Componente de Card padronizado para o Admin

import React from 'react';
import styles from './AdminCard.module.css';

/**
 * AdminCard - Card base para o painel Admin
 *
 * @param {'default'|'elevated'|'outlined'} variant - Estilo visual
 * @param {'sm'|'md'|'lg'} padding - Padding interno
 * @param {boolean} hoverable - Efeito hover
 * @param {boolean} clickable - Cursor pointer e efeito clique
 * @param {boolean} fullWidth - 100% de largura
 *
 * @example
 * <AdminCard>Conteudo simples</AdminCard>
 *
 * @example
 * <AdminCard variant="elevated" hoverable>
 *   <AdminCard.Header title="Titulo" actions={<button>Acao</button>} />
 *   <AdminCard.Body>Conteudo</AdminCard.Body>
 *   <AdminCard.Footer>Rodape</AdminCard.Footer>
 * </AdminCard>
 */
const AdminCard = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  fullWidth = false,
  className,
  onClick,
  ...props
}) => {
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
    <div
      className={cardClass}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * AdminCard.Header - Cabecalho do card
 */
const CardHeader = ({
  children,
  title,
  subtitle,
  actions,
  className,
  noBorder = false,
  ...props
}) => {
  const headerClass = [
    styles.header,
    noBorder && styles.noBorder,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={headerClass} {...props}>
      <div className={styles.headerContent}>
        {title && <h3 className={styles.title}>{title}</h3>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
    </div>
  );
};

/**
 * AdminCard.Body - Corpo principal do card
 */
const CardBody = ({
  children,
  className,
  noPadding = false,
  ...props
}) => {
  const bodyClass = [
    styles.body,
    noPadding && styles.noPadding,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={bodyClass} {...props}>
      {children}
    </div>
  );
};

/**
 * AdminCard.Footer - Rodape do card
 */
const CardFooter = ({
  children,
  className,
  align = 'right',
  noBorder = false,
  ...props
}) => {
  const footerClass = [
    styles.footer,
    styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`],
    noBorder && styles.noBorder,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={footerClass} {...props}>
      {children}
    </div>
  );
};

/**
 * AdminCard.Section - Secao interna com titulo
 */
const CardSection = ({
  children,
  title,
  className,
  collapsible = false,
  defaultOpen = true,
  ...props
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const sectionClass = [
    styles.section,
    collapsible && styles.collapsible,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={sectionClass} {...props}>
      {title && (
        <div
          className={styles.sectionHeader}
          onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
          role={collapsible ? 'button' : undefined}
          aria-expanded={collapsible ? isOpen : undefined}
        >
          <span className={styles.sectionTitle}>{title}</span>
          {collapsible && (
            <span className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>
              &#8250;
            </span>
          )}
        </div>
      )}
      {(!collapsible || isOpen) && (
        <div className={styles.sectionContent}>
          {children}
        </div>
      )}
    </div>
  );
};

// Compound component pattern
AdminCard.Header = CardHeader;
AdminCard.Body = CardBody;
AdminCard.Footer = CardFooter;
AdminCard.Section = CardSection;

export default AdminCard;
