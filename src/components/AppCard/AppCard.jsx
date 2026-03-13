// src/components/AppCard/AppCard.jsx
import React from 'react';
import { FaWindows, FaApple, FaLinux } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { getAppImageUrl, getAppPrice } from '../../utils/appModel.js';
import styles from './AppCard.module.css';

const parsePlatforms = (p) => {
  if (!p) return ['windows'];
  if (Array.isArray(p)) return p;
  if (typeof p === 'string') { try { return JSON.parse(p); } catch { return [p]; } }
  return ['windows'];
};

const getBadge = (app) => {
  const statusLower = String(app.status || '').toLowerCase();
  const finalized = !!app.status && statusLower !== 'draft' && statusLower !== 'disabled';
  if (!finalized) return null;
  const name = String(app.name || '').toLowerCase();
  if (name === 'coincraft') return { label: 'Popular', className: styles.badgePopular };
  const created = app.createdAt ? new Date(app.createdAt) : null;
  const isRecent = created && (Date.now() - created.getTime()) < 30 * 24 * 60 * 60 * 1000;
  if (isRecent) return { label: 'Novo', className: styles.badgeNew };
  return { label: 'Disponível', className: styles.badgeAvailable };
};

const AppCard = ({ app, onDownload, onAbout, mode = 'owned', featured = false }) => {
  const { id, name, mainFeature, category } = app;
  const platforms = parsePlatforms(app.platforms);
  const statusLower = String(app.status || '').toLowerCase();
  const finalized = !!app.status && statusLower !== 'draft' && statusLower !== 'disabled';
  const safePrice = getAppPrice(app);
  const displayPrice = safePrice > 0 ? `R$ ${safePrice.toLocaleString('pt-BR')}` : 'Gratuito';
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
        {category && <span className={styles.chip} aria-label="Categoria">{category}</span>}
        <p className={`${styles.feature} ${styles.clamp2}`} title={mainFeature}>{mainFeature}</p>

        <div className={styles.pricingRow} aria-label="Preço">
          <span className={`${styles.price} ${safePrice === 0 ? styles.priceFree : ''}`}>{displayPrice}</span>
        </div>

        {platforms.length > 0 && (
          <div className={styles.platforms} aria-label="Plataformas disponíveis">
            {platforms.includes('windows') && <span className={styles.platformTag}><FaWindows /> Win</span>}
            {platforms.includes('macos') && <span className={styles.platformTag}><FaApple /> Mac</span>}
            {platforms.includes('linux') && <span className={styles.platformTag}><FaLinux /> Linux</span>}
          </div>
        )}

        <div className={styles.actions}>
          {mode === 'public' ? (
            <>
              <Link className={`${styles.btn} ${styles.btnPrimary}`} to={`/apps/${id}/compra`} aria-label={`Comprar ${name}`} data-qa="appcard-buy-btn">
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
