// src/components/AppCard/AppCard.jsx
import React from 'react';
import { getAppImageUrl, getAppPrice } from '../../utils/appModel.js';
import { Link } from 'react-router-dom';

const AppCard = ({ app, onDownload, mode = 'owned' }) => {
  const { id, name, mainFeature, thumbnail, image, price, status, version, size, category } = app;
  const finalized = status === 'finalizado' || status === 'available' || status === 'ready';
  const safePrice = getAppPrice(app);
  const displayPrice = safePrice > 0 ? `R$ ${safePrice.toLocaleString('pt-BR')}` : 'Gratuito';
  const displayVersion = version ? `v${version}` : 'v1.0';
  const displaySize = size ? `${size}` : '—';

  return (
    <article className="app-card" aria-label={`Aplicativo ${name}`}>
      <div className="app-media">
        {(thumbnail || image) ? (
          <img
            src={getAppImageUrl(app)}
            alt={name}
            className="app-thumb"
            loading="lazy"
            decoding="async"
            width="140"
            height="100"
            fetchpriority="low"
          />
        ) : (
          <div className="app-thumb placeholder" aria-hidden="true">APP</div>
        )}
        {finalized && <span className="app-ribbon">Disponível</span>}
      </div>
      <div className="app-body">
        <h3 className="app-title" title={name}>{name}</h3>
        {category && <span className="app-chip" aria-label="Categoria">{category}</span>}
        <p className="app-feature clamp-2" title={mainFeature}>{mainFeature}</p>
        <div className="app-meta" aria-label="Preço e status">
          <span className="app-price">{displayPrice}</span>
          <span className={`app-status ${finalized ? 'ok' : 'pending'}`}>{finalized ? 'Pronto para compra' : 'Em preparação'}</span>
        </div>
        <div className="app-submeta" aria-label="Versão e tamanho">
          <span className="app-version">{displayVersion}</span>
          <span className="app-size">{displaySize}</span>
        </div>
        <div className="app-actions">
          {mode === 'public' ? (
            <>
              <Link className="btn btn-buy" to={`/apps/${id}/compra`} aria-label={`Comprar ${name}`} data-qa="appcard-buy-btn">
                Comprar Agora
              </Link>
              <Link className="btn btn-secondary" to={`/apps/${id}/compra`} aria-label={`Detalhes de ${name}`}>
                Detalhes
              </Link>
            </>
          ) : (
            <>
              <button
                className="btn btn-buy"
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
              <Link className="btn btn-secondary" to={`/apps/${id}/compra`} target="_blank" rel="noopener noreferrer" aria-label={`Detalhes de ${name}`}>
                Detalhes
              </Link>
            </>
          )}
        </div>
      </div>
      <style>{`
        .app-card {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 14px;
          background: transparent;
          border-radius: 16px;
          padding: 16px;
          transition: transform .2s ease;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 560px) { .app-card { grid-template-columns: 1fr; } }

        .app-media { position: relative; }
        .app-thumb { width: 140px; height: 100px; object-fit: cover; border-radius: 12px; border: 1px solid rgba(255,255,255,0.18); }
        .app-thumb.placeholder { display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.06); color: var(--texto-gelo); font-weight: 700; letter-spacing: 1px; }
        .app-ribbon { position: absolute; top: 8px; left: 8px; background: linear-gradient(90deg, #D12BF2, #00E4F2); color: #000; padding: 4px 8px; border-radius: 999px; font-size: 0.75rem; border: 1px solid rgba(0,0,0,0.2); }

        .app-title { margin: 0; color: var(--texto-branco); font-size: clamp(1.1rem, 2.5vw, 1.3rem); letter-spacing: .2px; }
        .app-chip { display:inline-flex; align-items:center; gap:6px; padding: 4px 8px; border-radius: 999px; background: rgba(255,255,255,0.08); color: #b0e1ff; font-size: .75rem; border: 1px solid rgba(255,255,255,0.14); margin-top: 6px; width: fit-content; }
        .app-feature { color: var(--texto-gelo); margin: 6px 0; font-size: 0.95rem; }
        .clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .app-meta { display: flex; gap: 12px; align-items: center; color: var(--texto-gelo); font-size: 0.95rem; margin-top: 4px; }
        .app-price { color: #00E4F2; font-weight: 700; }
        .app-status.ok { color: #7CF6FF; font-weight: 600; }
        .app-status.pending { color: #FFA500; font-weight: 600; }

        .app-submeta { display:flex; gap:12px; align-items:center; color: var(--texto-gelo); font-size: 0.85rem; }
        .app-version { color: #b0e1ff; }
        .app-size { color: #d6d6d6; }

        .app-actions { margin-top: 10px; display:flex; gap: 8px; flex-wrap: wrap; }
        .btn { display:inline-block; padding: 10px 14px; border-radius: 10px; border:1px solid rgba(255,255,255,0.18); cursor:pointer; transition: transform .12s ease, box-shadow .12s ease, filter .12s ease; min-width: 140px; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 10px 18px rgba(0,0,0,0.25); }
        .btn:active { transform: translateY(0px) scale(0.98); filter: brightness(0.95); }
        .btn:focus-visible { outline: 2px solid #00E4F2; outline-offset: 2px; }
        .btn-buy { background: linear-gradient(90deg, #D12BF2, #00E4F2); color: #000; border:none; font-weight: 700; }
        .btn-secondary { background: rgba(255,255,255,0.08); color: var(--texto-branco); }

        @media (max-width: 560px) {
          .btn { width: 100%; min-width: unset; }
        }
      `}</style>
    </article>
  );
};

export default AppCard;