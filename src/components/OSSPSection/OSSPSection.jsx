// src/components/OSSPSection/OSSPSection.jsx
import React from 'react';

const OSSPSection = () => {
  return (
    <section className="ossp-section" aria-label="Programa OSSP - Open Source & Security Policy">
      <header className="ossp-header">
        <h2 className="ossp-title">Programa OSSP</h2>
        <p className="ossp-subtitle">Open Source & Security Policy</p>
        <p className="ossp-lead">Nosso compromisso com software aberto, segurança e responsabilidade corporativa.</p>
      </header>

      <div className="ossp-grid">
        <div className="ossp-card">
          <div className="ossp-icon" aria-hidden="true">🔒</div>
          <h3 className="ossp-card-title">Segurança em Primeiro Lugar</h3>
          <p className="ossp-card-text">Monitoramento de CVEs, revisão de dependências, políticas de atualização e varreduras periódicas.</p>
        </div>
        <div className="ossp-card">
          <div className="ossp-icon" aria-hidden="true">📜</div>
          <h3 className="ossp-card-title">Licenciamento</h3>
          <p className="ossp-card-text">Uso responsável de licenças (MIT, Apache 2.0, GPL compatíveis) e compliance em distribuição.</p>
        </div>
        <div className="ossp-card">
          <div className="ossp-icon" aria-hidden="true">🤝</div>
          <h3 className="ossp-card-title">Contribuição</h3>
          <p className="ossp-card-text">Participação ativa em projetos OSS, PRs de melhoria e respeito aos guias de contribuição.</p>
        </div>
        <div className="ossp-card">
          <div className="ossp-icon" aria-hidden="true">🔍</div>
          <h3 className="ossp-card-title">Auditoria</h3>
          <p className="ossp-card-text">Code reviews, trilhas de auditoria e governança técnica para garantir qualidade e transparência.</p>
        </div>
      </div>

      <div className="ossp-footer">
        <a className="ossp-link" href="/README.md" target="_blank" rel="noopener noreferrer">Conheça nossas diretrizes</a>
      </div>

      <style>{`
        .ossp-section { padding: 16px; }
        .ossp-header { text-align: center; margin-bottom: 16px; }
        .ossp-title { color: var(--texto-branco); font-size: clamp(1.6rem, 3vw, 2rem); margin: 0; }
        .ossp-subtitle { color: var(--texto-gelo); margin-top: 4px; }
        .ossp-lead { color: var(--texto-gelo); margin-top: 8px; }

        .ossp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        @media (max-width: 900px) { .ossp-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .ossp-grid { grid-template-columns: 1fr; } }

        .ossp-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; position: relative; overflow: hidden; }
        .ossp-card::before { content: ''; position: absolute; inset: 0; border-radius: inherit; background: radial-gradient(600px 200px at 20% 10%, rgba(209,43,242,0.08), transparent 60%); opacity: 0.6; }
        .ossp-icon { font-size: 1.4rem; margin-bottom: 8px; }
        .ossp-card-title { color: var(--texto-branco); margin: 0 0 6px; font-size: 1.1rem; }
        .ossp-card-text { color: var(--texto-gelo); margin: 0; }

        .ossp-footer { margin-top: 16px; text-align: center; }
        .ossp-link { display: inline-block; background: #D12BF2; color: #fff; padding: 10px 14px; border-radius: 8px; text-decoration: none; }
        .ossp-link:hover { filter: brightness(0.95); }
      `}</style>
    </section>
  );
};

export default OSSPSection;