// src/components/AppCard/AppCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const AppCard = ({ app }) => {
  const { id, name, mainFeature, thumbnail, price, status } = app;
  const finalized = status === 'finalizado' || status === 'available' || status === 'ready';
  return (
    <article className="app-card">
      {thumbnail && <img src={thumbnail} alt={name} className="app-thumb" />}
      <div className="app-body">
        <h3 className="app-title">{name}</h3>
        <p className="app-feature">{mainFeature}</p>
        <div className="app-meta">
          <span className="app-price">{price ? `R$ ${Number(price).toLocaleString('pt-BR')}` : '—'}</span>
          <span className={`app-status ${finalized ? 'ok' : 'pending'}`}>{finalized ? 'Disponível' : 'Em preparação'}</span>
        </div>
        <div className="app-actions">
          <Link className="btn btn-primary" to={`/apps/${id}/compra`} target="_blank" rel="noopener noreferrer">
            Download / Comprar
          </Link>
        </div>
      </div>
      <style>{`
        .app-card { display: grid; grid-template-columns: 120px 1fr; gap: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px; }
        @media (max-width: 560px) { .app-card { grid-template-columns: 1fr; } }
        .app-thumb { width: 120px; height: 90px; object-fit: cover; border-radius: 8px; }
        .app-title { margin: 0; color: var(--texto-branco); font-size: 1.1rem; }
        .app-feature { color: var(--texto-gelo); margin: 6px 0; }
        .app-meta { display: flex; gap: 12px; align-items: center; color: var(--texto-gelo); font-size: 0.9rem; }
        .app-status.ok { color: #00E4F2; font-weight: 600; }
        .app-status.pending { color: #FFA500; font-weight: 600; }
        .app-actions { margin-top: 8px; }
        .btn { display:inline-block; padding: 8px 12px; border-radius: 8px; border:1px solid rgba(255,255,255,0.18); }
        .btn-primary { background: #D12BF2; color: #fff; }
      `}</style>
    </article>
  );
};

export default AppCard;