// src/components/CompanySection/CompanySection.jsx
import React from 'react';
import logoCodeCraft from '../../assets/logo-codecraft.svg';

const CompanySection = () => {
  return (
    <section className="company-section" aria-label="Sobre a empresa">
      <header className="company-header">
        <h2 className="company-title">Sobre a CodeCraft</h2>
        <p className="company-lead">Tecnologia, criatividade e colaboração para acelerar resultados.</p>
      </header>

      <div className="values-grid">
        <div className="value-card">
          <div className="value-icon" aria-hidden="true">⚙️</div>
          <h3 className="value-title">Inovação</h3>
          <p className="value-text">Exploramos novas ideias e frameworks para soluções escaláveis.</p>
        </div>
        <div className="value-card">
          <div className="value-icon" aria-hidden="true">🏅</div>
          <h3 className="value-title">Qualidade</h3>
          <p className="value-text">Entrega com excelência, padrões e boas práticas.</p>
        </div>
        <div className="value-card">
          <div className="value-icon" aria-hidden="true">💬</div>
          <h3 className="value-title">Comunidade</h3>
          <p className="value-text">Compartilhamos conhecimento e aprendemos juntos.</p>
        </div>
        <div className="value-card">
          <div className="value-icon" aria-hidden="true">🛡️</div>
          <h3 className="value-title">Segurança</h3>
          <p className="value-text">Proteção de dados e compliance no centro da operação.</p>
        </div>
      </div>

      <div className="services">
        <h3 className="services-title">Serviços</h3>
        <ul className="services-list" aria-label="Serviços oferecidos">
          <li>Desenvolvimento web e mobile</li>
          <li>Arquitetura e cloud</li>
          <li>Data & AI</li>
          <li>Mentoria e capacitação</li>
        </ul>
      </div>

      <div className="partners">
        <h3 className="partners-title">Parceiros e Clientes</h3>
        <div className="partners-row" role="list">
          <div role="listitem" className="partner-item">
            <img src={logoCodeCraft} alt="Parceiro" />
          </div>
          <div role="listitem" className="partner-item">
            <img src={logoCodeCraft} alt="Parceiro" />
          </div>
          <div role="listitem" className="partner-item">
            <img src={logoCodeCraft} alt="Parceiro" />
          </div>
          <div role="listitem" className="partner-item">
            <img src={logoCodeCraft} alt="Parceiro" />
          </div>
        </div>
      </div>

      <div className="cta">
        <a className="cta-btn" href="/mentoria">Conheça nossa mentoria</a>
        <a className="cta-btn secondary" href="/projetos">Veja nossos projetos</a>
      </div>

      <style>{`
        .company-section { padding: 16px; }
        .company-header { text-align: center; margin-bottom: 16px; }
        .company-title { color: var(--texto-branco); font-size: clamp(1.6rem, 3vw, 2rem); margin: 0; }
        .company-lead { color: var(--texto-gelo); margin-top: 8px; }

        .values-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
        @media (max-width: 900px) { .values-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .values-grid { grid-template-columns: 1fr; } }
        .value-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; }
        .value-icon { font-size: 1.4rem; margin-bottom: 8px; }
        .value-title { color: var(--texto-branco); margin: 0 0 6px; font-size: 1.1rem; }
        .value-text { color: var(--texto-gelo); margin: 0; }

        .services { margin-top: 20px; }
        .services-title { color: var(--texto-branco); margin-bottom: 8px; }
        .services-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; color: var(--texto-gelo); }
        @media (max-width: 560px) { .services-list { grid-template-columns: 1fr; } }

        .partners { margin-top: 20px; }
        .partners-title { color: var(--texto-branco); margin-bottom: 8px; }
        .partners-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: center; }
        @media (max-width: 900px) { .partners-row { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .partners-row { grid-template-columns: 1fr; } }
        .partner-item { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px; text-align: center; }
        .partner-item img { max-width: 120px; opacity: 0.9; }

        .cta { margin-top: 20px; display: flex; gap: 12px; justify-content: center; }
        .cta-btn { background: #D12BF2; color: #fff; padding: 10px 14px; border-radius: 8px; text-decoration: none; }
        .cta-btn.secondary { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18); color: var(--texto-branco); }
        .cta-btn:hover { filter: brightness(0.95); }
      `}</style>
    </section>
  );
};

export default CompanySection;