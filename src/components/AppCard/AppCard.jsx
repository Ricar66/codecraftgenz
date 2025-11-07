// src/components/AppCard/AppCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const AppCard = ({ app }) => {
  const { id, name, mainFeature, thumbnail, price, status } = app;
  const finalized = status === 'finalizado' || status === 'available' || status === 'ready';
  const displayPrice = price ? `R$ ${Number(price).toLocaleString('pt-BR')}` : 'Gratuito';

  return (
    <article className="app-card" aria-label={`Aplicativo ${name}`}>
      <div className="app-media">
        {thumbnail ? (
          <img src={thumbnail} alt={name} className="app-thumb" />
        ) : (
          <div className="app-thumb placeholder" aria-hidden="true">APP</div>
        )}
        {finalized && <span className="app-ribbon">Disponível</span>}
      </div>
      <div className="app-body">
        <h3 className="app-title" title={name}>{name}</h3>
        <p className="app-feature" title={mainFeature}>{mainFeature}</p>
        <div className="app-meta" aria-label="Preço e status">
          <span className="app-price">{displayPrice}</span>
          <span className={`app-status ${finalized ? 'ok' : 'pending'}`}>{finalized ? 'Pronto para compra' : 'Em preparação'}</span>
        </div>
        <div className="app-actions">
          <Link className="btn btn-buy" to={`/apps/${id}/compra`} target="_blank" rel="noopener noreferrer" aria-label={`Comprar ${name}`}>
            Comprar
          </Link>
          <Link className="btn btn-secondary" to={`/apps/${id}/compra`} target="_blank" rel="noopener noreferrer" aria-label={`Detalhes de ${name}`}>
            Detalhes
          </Link>
        </div>
      </div>
      <style>{`
        .app-card {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 14px;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.28);
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .app-card:hover { transform: translateY(-2px); box-shadow: 0 16px 30px rgba(0,0,0,0.34); }
        @media (max-width: 560px) { .app-card { grid-template-columns: 1fr; } }

        .app-media { position: relative; }
        .app-thumb { width: 140px; height: 100px; object-fit: cover; border-radius: 12px; border: 1px solid rgba(255,255,255,0.18); }
        .app-thumb.placeholder { display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.06); color: var(--texto-gelo); font-weight: 700; letter-spacing: 1px; }
        .app-ribbon { position: absolute; top: 8px; left: 8px; background: linear-gradient(90deg, #D12BF2, #00E4F2); color: #000; padding: 4px 8px; border-radius: 999px; font-size: 0.75rem; border: 1px solid rgba(0,0,0,0.2); }

        .app-title { margin: 0; color: var(--texto-branco); font-size: 1.2rem; }
        .app-feature { color: var(--texto-gelo); margin: 6px 0; font-size: 0.95rem; }
        .app-meta { display: flex; gap: 12px; align-items: center; color: var(--texto-gelo); font-size: 0.95rem; margin-top: 4px; }
        .app-price { color: #00E4F2; font-weight: 700; }
        .app-status.ok { color: #7CF6FF; font-weight: 600; }
        .app-status.pending { color: #FFA500; font-weight: 600; }

        .app-actions { margin-top: 10px; display:flex; gap: 8px; }
        .btn { display:inline-block; padding: 10px 14px; border-radius: 10px; border:1px solid rgba(255,255,255,0.18); cursor:pointer; transition: transform .2s ease, box-shadow .2s ease; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 10px 18px rgba(0,0,0,0.25); }
        .btn-buy { background: linear-gradient(90deg, #D12BF2, #00E4F2); color: #000; border:none; font-weight: 700; }
        .btn-secondary { background: rgba(255,255,255,0.08); color: var(--texto-branco); }
      `}</style>
    </article>
  );
};

export default AppCard;