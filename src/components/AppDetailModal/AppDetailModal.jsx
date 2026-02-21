// src/components/AppDetailModal/AppDetailModal.jsx
// Modal de detalhes do app - exibe descricao completa estilo marketing
import React from 'react';
import { Link } from 'react-router-dom';
import { FaWindows, FaApple, FaLinux, FaShoppingCart } from 'react-icons/fa';

import Modal from '../UI/Modal/Modal.jsx';
import { getAppImageUrl, getAppPrice } from '../../utils/appModel.js';

import styles from './AppDetailModal.module.css';

const parsePlatforms = (p) => {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (typeof p === 'string') {
    try { return JSON.parse(p); } catch { return p.split(',').map(s => s.trim()).filter(Boolean); }
  }
  return [];
};

const parseTags = (t) => {
  if (!t) return [];
  if (Array.isArray(t)) return t;
  if (typeof t === 'string') {
    try { return JSON.parse(t); } catch { return t.split(',').map(s => s.trim()).filter(Boolean); }
  }
  return [];
};

const parseScreenshots = (s) => {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  if (typeof s === 'string') {
    try { return JSON.parse(s); } catch { return []; }
  }
  return [];
};

const platformIcons = {
  windows: { icon: <FaWindows />, label: 'Windows' },
  macos: { icon: <FaApple />, label: 'macOS' },
  linux: { icon: <FaLinux />, label: 'Linux' },
};

export default function AppDetailModal({ app, onClose }) {
  if (!app) return null;

  const imageUrl = getAppImageUrl(app);
  const price = getAppPrice(app);
  const displayPrice = price > 0 ? `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Gratuito';
  const platforms = parsePlatforms(app.platforms);
  const tags = parseTags(app.tags);
  const screenshots = parseScreenshots(app.screenshots);
  const description = app.description || app.shortDescription || app.mainFeature || '';

  return (
    <Modal isOpen onClose={onClose} size="xl" title={null} showCloseButton>
      {/* Hero */}
      <div className={styles.hero}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={app.name}
            className={styles.heroImage}
            loading="eager"
          />
        ) : (
          <div className={styles.heroPlaceholder}>
            {app.name?.slice(0, 3).toUpperCase() || 'APP'}
          </div>
        )}
        <div className={styles.heroOverlay}>
          <h2 className={styles.heroTitle}>{app.name}</h2>
          {app.category && (
            <span className={styles.heroBadge}>{app.category}</span>
          )}
        </div>
      </div>

      {/* Descricao */}
      {description && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Sobre o Aplicativo</h3>
          <p className={styles.description}>{description}</p>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Recursos</h3>
          <div className={styles.tags}>
            {tags.map((tag, i) => (
              <span key={i} className={styles.tag}>{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Plataformas */}
      {platforms.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Plataformas</h3>
          <div className={styles.platforms}>
            {platforms.map((p) => {
              const key = String(p).toLowerCase();
              const info = platformIcons[key];
              return (
                <span key={key} className={styles.platform}>
                  {info?.icon} {info?.label || p}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Grid */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Informacoes</h3>
        <div className={styles.infoGrid}>
          {app.version && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Versao</span>
              <span className={styles.infoValue}>v{app.version}</span>
            </div>
          )}
          {app.category && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Categoria</span>
              <span className={styles.infoValue}>{app.category}</span>
            </div>
          )}
          {app.size && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tamanho</span>
              <span className={styles.infoValue}>{app.size}</span>
            </div>
          )}
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Preco</span>
            <span className={styles.infoValue}>{displayPrice}</span>
          </div>
        </div>
      </div>

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Screenshots</h3>
          <div className={styles.screenshots}>
            {screenshots.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Screenshot ${i + 1} de ${app.name}`}
                className={styles.screenshot}
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}

      {/* CTA Bar */}
      <div className={styles.ctaBar}>
        <div className={styles.ctaPrice}>
          <span className={styles.ctaPriceLabel}>A partir de</span>
          <span className={styles.ctaPriceValue}>{displayPrice}</span>
        </div>
        <Link to={`/apps/${app.id}/compra`} className={styles.ctaButton} onClick={onClose}>
          <FaShoppingCart /> Comprar Agora
        </Link>
      </div>
    </Modal>
  );
}
