// src/pages/MentoriaPage.jsx
import React, { useEffect, useState } from 'react';

import Navbar from '../components/Navbar/Navbar';
import { adminStore } from '../lib/adminStore';
import { realtime } from '../lib/realtime';

export default function MentoriaPage() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const all = adminStore.listMentors();
    setMentors(all.filter(m => m.visible));
    setLoading(false);
    const unsub = realtime.subscribe('mentors_changed', ({ mentors }) => {
      const src = mentors || adminStore.listMentors();
      setMentors(src.filter(m => m.visible));
    });
    const iv = setInterval(() => {
      const src = adminStore.listMentors();
      setMentors(src.filter(m => m.visible));
    }, 10000);
    return () => { unsub(); clearInterval(iv); };
  }, []);

  return (
    <div className="mentoria-page">
      <Navbar />

      <section className="section-block">
        <div className="section-card">
          <header className="section-header">
            <h1 className="title">Mentoria CodeCraft</h1>
            <h2 className="subtitle">Aprenda com quem já está construindo o futuro 🚀</h2>
            <p className="lead">
              Nosso programa de mentoria conecta você a profissionais experientes que vão guiar sua jornada de crescimento.
            </p>
          </header>

          <div className="mentors-grid" aria-busy={loading}>
            {mentors.map((m) => (
              <article key={m.email} className="mentor-card">
                <div className="avatar" aria-hidden="true" />
                <div className="info">
                  <div className="header">
                    <h3 className="name">{m.name}</h3>
                    <p className="role">{m.specialty}</p>
                  </div>
                  <div className="details">
                    <div className="contact">
                      <span className="contact-item" title="Telefone">📱 {m.phone}</span>
                      <span className="contact-item" title="E-mail">✉️ {m.email}</span>
                    </div>
                    <p className="bio">{m.bio}</p>
                  </div>
                </div>
              </article>
            ))}
            {!loading && mentors.length === 0 && (
              <div className="empty" role="status">Nenhum mentor visível no momento.</div>
            )}
          </div>

          <div className="section-footer">
            <p className="helper-text">
              A mentoria CodeCraft é um espaço de troca e aprendizado contínuo. Nossos mentores compartilham experiências reais de mercado,
              te ajudam a definir metas claras e a transformar ideias em projetos de impacto.
            </p>
          </div>
        </div>
      </section>

      <style>{`
        .mentoria-page {
          min-height: 100vh;
          width: 100%;
          background-color: transparent;
        }

        .section-block { padding: var(--espaco-3xl) var(--espaco-xl); }

        .section-card {
          max-width: 1200px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: var(--raio-xl);
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.25);
          padding: var(--espaco-xl);
          overflow: hidden; /* garante que pseudo-elementos e conteúdos não escapem do container */
        }

        .section-header { text-align: center; margin-bottom: var(--espaco-lg); }
        .title { font-family: var(--fonte-titulos); font-size: clamp(2rem, 4vw, 3rem); color: var(--texto-branco); }
        .subtitle { font-size: clamp(1.25rem, 2.5vw, 1.5rem); color: var(--texto-gelo); margin-top: var(--espaco-xs); }
        .lead { font-size: 1.05rem; color: var(--texto-gelo); margin-top: var(--espaco-sm); }

        .mentors-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--espaco-lg);
          margin-top: var(--espaco-lg);
          padding-top: var(--espaco-md);
          align-items: stretch; /* faz os itens preencherem a altura da linha */
          grid-auto-rows: 1fr; /* linhas com alturas proporcionais para cards iguais */
        }

        /* linha de conexão minimalista */
        .mentors-grid::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06));
          margin: 0 var(--espaco-md); /* respeita o padding interno e evita tocar bordas arredondadas */
        }

        .mentor-card {
          display: grid;
          grid-template-columns: 140px 1fr; /* aumenta a coluna da foto */
          gap: var(--espaco-md);
          align-items: start; /* conteúdo começa no topo, permitindo descer com margem */
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: var(--raio-lg);
          padding: var(--espaco-md);
          box-shadow: 0 4px 18px rgba(0,0,0,0.22);
          transition: transform 180ms ease, box-shadow 180ms ease;
          height: 100%;
          overflow: hidden; /* previne que conteúdos internos ultrapassem os limites do card */
        }

        .mentor-card:hover { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(0,0,0,0.26); }
        .mentor-card:focus-within { outline: 2px solid rgba(139, 92, 246, 0.6); outline-offset: 2px; }

        .avatar {
          width: 120px;
          height: 120px; /* foto um pouco maior */
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06));
          border: 1px solid rgba(255,255,255,0.18);
        }

        .info { display: flex; flex-direction: column; height: 100%; }
        .header { display: grid; grid-template-columns: 1fr; align-items: center; gap: 4px; }
        .details { margin-top: auto; text-align: center; }
        .details .bio { margin-top: var(--espaco-sm); }
        .contact { justify-content: center; }

        .name { font-weight: 700; color: var(--texto-branco); }
        .role { color: var(--texto-gelo); font-size: 0.95rem; margin-top: 4px; }
        .contact { display: flex; flex-wrap: wrap; gap: var(--espaco-sm); margin-top: var(--espaco-xs); color: var(--texto-gelo); }
        .contact-item { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 6px 10px; }
        .bio { margin-top: var(--espaco-sm); color: var(--texto-gelo); }

        .section-footer { margin-top: 20px; }
        .helper-text { color: var(--texto-gelo); text-align: center; }

        /* Responsividade */
        @media (max-width: 1200px) {
          .section-card { max-width: 1000px; }
        }
        @media (max-width: 992px) {
          .mentors-grid { grid-template-columns: 1fr 1fr; }
          .mentors-grid::before { left: 8%; right: 8%; }
        }
        @media (max-width: 768px) {
          .section-card { padding: var(--espaco-lg); }
          .mentors-grid { gap: var(--espaco-md); }
          .mentor-card { grid-template-columns: 110px 1fr; }
          .avatar { width: 105px; height: 105px; }
        }
        @media (max-width: 640px) {
          .section-card { padding: var(--espaco-md); }
          .mentors-grid { grid-template-columns: 1fr; }
          .mentors-grid::before { display: none; }
          .mentor-card { grid-template-columns: 90px 1fr; }
          .avatar { width: 90px; height: 90px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mentor-card { transition: none; }
        }
      `}</style>
    </div>
  );
}