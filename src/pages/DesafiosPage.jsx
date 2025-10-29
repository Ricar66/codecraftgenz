// src/pages/DesafiosPage.jsx
import React from 'react';

import Navbar from '../components/Navbar/Navbar';

export default function DesafiosPage() {
  const desafios = [
    { nome: 'Refatoração de Performance', descricao: 'Otimizar renderizações e reduzir TTI.', duracao: '7 dias', recompensa: '+200 pts' },
    { nome: 'API Resiliente', descricao: 'Circuit breaker e retries inteligentes.', duracao: '10 dias', recompensa: '+300 pts' },
    { nome: 'Design System', descricao: 'Criar tokens e componentes base.', duracao: '14 dias', recompensa: '+400 pts' },
  ];

  return (
    <div className="desafios-page">
      <Navbar />

      <section className="section-block">
        <div className="section-card themed">
          <header className="section-header">
            <h1 className="title">Desafios Épicos</h1>
            <h2 className="subtitle">Desafios que moldam gigantes 💪</h2>
            <p className="lead">Cada missão CodeCraft é uma oportunidade de testar suas habilidades e crescer como desenvolvedor.</p>
          </header>

          <div className="desafios-grid">
            {desafios.map((d) => (
              <article key={d.nome} className="desafio-card">
                <div className="icon" aria-hidden="true" />
                <h3 className="name">{d.nome}</h3>
                <p className="desc">{d.descricao}</p>
                <div className="meta">
                  <span className="chip">Duração: {d.duracao}</span>
                  <span className="chip">Recompensa: {d.recompensa}</span>
                </div>
                <button className="cta">Quero participar!</button>
              </article>
            ))}
          </div>

          <footer className="section-footer">
            <p className="helper-text">Nossos desafios não são apenas testes. São experiências que transformam Crafters em verdadeiros criadores do amanhã.</p>
          </footer>
        </div>
      </section>

      <style>{`
        .desafios-page { min-height: 100vh; width: 100%; background: transparent; }
        .section-block { padding: var(--espaco-3xl) var(--espaco-xl); }
        .section-card { max-width: 1200px; margin: 0 auto; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.16); border-radius: var(--raio-xl); backdrop-filter: blur(12px); box-shadow: 0 8px 28px rgba(0,0,0,0.25); padding: var(--espaco-xl); }
        .section-card { overflow: hidden; }

        /* Tema roxo escuro com contraste azul neon */
        .themed { border-color: rgba(104, 0, 123, 0.6); box-shadow: 0 6px 24px rgba(104, 0, 123, 0.35); }

        .section-header { text-align: center; margin-bottom: var(--espaco-lg); }
        .title { font-family: var(--fonte-titulos); font-size: clamp(2rem, 4vw, 3rem); color: var(--texto-branco); }
        .subtitle { font-size: clamp(1.25rem, 2.5vw, 1.5rem); color: var(--texto-gelo); margin-top: var(--espaco-xs); }
        .lead { font-size: 1.05rem; color: var(--texto-gelo); margin-top: var(--espaco-sm); }

        .desafios-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--espaco-lg); margin-top: var(--espaco-lg); align-items: stretch; grid-auto-rows: 1fr; }
        .desafios-grid::before { content: ''; display: block; height: 2px; background: linear-gradient(90deg, rgba(0, 228, 242, 0.5), rgba(0, 228, 242, 0.1)); margin-bottom: var(--espaco-sm); }

        .desafio-card { background: rgba(104, 0, 123, 0.14); border: 1px solid rgba(0, 228, 242, 0.5); border-radius: var(--raio-lg); padding: var(--espaco-md); box-shadow: 0 4px 16px rgba(104, 0, 123, 0.28); transition: transform 180ms ease, box-shadow 180ms ease; height: 100%; overflow: hidden; }
        .desafio-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 228, 242, 0.32); }
        .desafio-card:focus-within { outline: 2px solid rgba(0, 228, 242, 0.7); outline-offset: 2px; }

        .icon { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #68007B, #00E4F2); margin-bottom: var(--espaco-xs); }
        .name { color: #00E4F2; font-weight: 700; }
        .desc { color: var(--texto-gelo); margin: var(--espaco-xs) 0; }
        .meta { display: flex; flex-wrap: wrap; gap: var(--espaco-xs); margin-bottom: var(--espaco-sm); }
        .chip { background: rgba(0, 228, 242, 0.12); border: 1px solid rgba(0, 228, 242, 0.35); color: #00E4F2; border-radius: 999px; padding: 6px 10px; }
        .cta { background: #00E4F2; color: #0A0A0F; border: none; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-weight: 700; box-shadow: 0 2px 8px rgba(0, 228, 242, 0.28); }
        .cta:hover { filter: brightness(1.1); }

        @media (max-width: 1200px) { .section-card { max-width: 1000px; } }
        @media (max-width: 992px) { .desafios-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 768px) { .section-card { padding: var(--espaco-lg); } .desafios-grid { gap: var(--espaco-md); } }
        @media (max-width: 640px) { .section-card { padding: var(--espaco-md); } .desafios-grid { grid-template-columns: 1fr; } .desafios-grid::before { display: none; } }
        @media (prefers-reduced-motion: reduce) { .desafio-card { transition: none; } }
     `}</style>
    </div>
  );
}