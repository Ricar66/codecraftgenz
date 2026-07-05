// src/components/AppCard/AppCard.jsx
import React from 'react';
import { WindowsIcon, AppleIcon, LinuxIcon } from '../UI/BrandIcons/index.jsx';
import { Link } from 'react-router-dom';

import { trackFunnelStep } from '../../services/analyticsAPI.js';
import { getAppImageUrl, getAppPrice } from '../../utils/appModel.js';
import { getLucideIcon } from '../../utils/lucideIconMap.js';
import { stripMarkdown } from '../../utils/textUtils.js';
import styles from './AppCard.module.css';

const parsePlatforms = (p) => {
  if (!p) return ['windows'];
  if (Array.isArray(p)) return p;
  if (typeof p === 'string') { try { return JSON.parse(p); } catch { return [p]; } }
  return ['windows'];
};

const getBadge = (app) => {
  const statusLower = String(app.status || '').toLowerCase();
  const finalized = statusLower === 'publicar';
  if (!finalized) return null;
  const name = String(app.name || '').toLowerCase();
  if (name === 'coincraft') return { label: 'Popular', className: styles.badgePopular };
  const created = app.createdAt ? new Date(app.createdAt) : null;
  const isRecent = created && (Date.now() - created.getTime()) < 30 * 24 * 60 * 60 * 1000;
  if (isRecent) return { label: 'Novo', className: styles.badgeNew };
  return { label: 'Disponível', className: styles.badgeAvailable };
};

const AppCard = ({ app, onDownload, onAbout, mode = 'owned', featured = false }) => {
  const { id, name, mainFeature } = app;
  // `app.category` agora é objeto { id, name, slug, icon } | null (nova FK).
  const category = app.category && typeof app.category === 'object' ? app.category : null;
  const CategoryIconComp = category?.icon ? getLucideIcon(category.icon) : null;
  const platforms = parsePlatforms(app.platforms);
  const statusLower = String(app.status || '').toLowerCase();
  const finalized = statusLower === 'publicar';
  const safePrice = getAppPrice(app);
  const displayPrice = safePrice > 0 ? `R$ ${safePrice.toLocaleString('pt-BR')}` : 'Gratuito';
  const originalPrice = Number(app?.original_price ?? app?.originalPrice ?? 0);
  const hasDiscount = safePrice > 0 && originalPrice > safePrice;
  const discountPct = hasDiscount ? Math.round(((originalPrice - safePrice) / originalPrice) * 100) : 0;
  const badge = getBadge(app);

  const cardClass = [styles.card, featured ? styles.cardFeatured : ''].filter(Boolean).join(' ');

  return (
    <article className={cardClass} aria-label={`Aplicativo ${name}`}>
      <div className={styles.media}>
        {getAppImageUrl(app) ? (
          <img
            src={getAppImageUrl(app)}
            alt={name}
            className={styles.thumb}
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">APP</div>
        )}
        {badge && <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title} title={name}>{name}</h3>
        {category && (
          <span className={styles.chip} aria-label={`Categoria: ${category.name}`}>
            {CategoryIconComp && <CategoryIconComp size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />}
            {category.name}
          </span>
        )}
        <p className={`${styles.feature} ${styles.clamp2}`} title={mainFeature}>{mainFeature}</p>

        <div className={styles.pricingRow} aria-label="Preço">
          {hasDiscount && (
            <span style={{ color: '#a0a0b0', fontSize: '0.85rem', textDecoration: 'line-through', marginRight: 6 }}>
              R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          <span className={`${styles.price} ${safePrice === 0 ? styles.priceFree : ''}`}>{displayPrice}</span>
          {hasDiscount && (
            <span style={{
              display: 'inline-block',
              padding: '1px 8px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #d12bf2 0%, #D12BF2 100%)',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              marginLeft: 6,
            }}>
              −{discountPct}%
            </span>
          )}
          {safePrice > 0 && (
            <span className={styles.licenseType}>{app.license_type === 'assinatura' ? 'Assinatura' : 'Licença vitalícia'}</span>
          )}
        </div>

        {platforms.length > 0 && (
          <div className={styles.platforms} aria-label="Plataformas disponíveis">
            {platforms.includes('windows') && <span className={styles.platformTag}><WindowsIcon /> Win</span>}
            {platforms.includes('macos') && <span className={styles.platformTag}><AppleIcon /> Mac</span>}
            {platforms.includes('linux') && <span className={styles.platformTag}><LinuxIcon /> Linux</span>}
          </div>
        )}

        <div className={styles.actions}>
          {mode === 'public' ? (
            <>
              <Link className={`${styles.btn} ${styles.btnPrimary}`} to={`/apps/${id}/compra`} aria-label={`Comprar ${name}`} data-qa="appcard-buy-btn" onClick={() => trackFunnelStep('purchase_funnel', 'app_buy_clicked', { app_id: app.id, app_name: app.name || app.titulo, price: app.price || app.preco })}>
                Comprar Agora
              </Link>
              {onAbout ? (
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onAbout(app)} aria-label={`Sobre ${name}`}>
                  Sobre
                </button>
              ) : (
                <Link className={`${styles.btn} ${styles.btnSecondary}`} to={`/apps/${id}/compra`} aria-label={`Detalhes de ${name}`}>
                  Detalhes
                </Link>
              )}
            </>
          ) : (
            <>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => {
                  trackFunnelStep('purchase_funnel', 'app_downloaded', { app_id: app.id });
                  try { navigator.vibrate?.(10); } catch (e) {
                    if (import.meta.env?.DEV) console.warn('Vibrate não suportado ou bloqueado:', e);
                  }
                  onDownload?.(app);
                }}
                aria-label={`Download de ${name}`}
                data-qa="appcard-download-btn"
              >
                Download
              </button>
              <Link className={`${styles.btn} ${styles.btnSecondary}`} to={`/apps/${id}/compra`} target="_blank" rel="noopener noreferrer" aria-label={`Detalhes de ${name}`}>
                Detalhes
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export default AppCard;
