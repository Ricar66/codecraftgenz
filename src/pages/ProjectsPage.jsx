// src/pages/ProjectsPage.jsx
import React, { useEffect, useState } from 'react';

import heroBackground from '../assets/hero-background.svg';
import Navbar from '../components/Navbar/Navbar';
import ProjectsList from '../components/Projects/ProjectsList';
import * as mentorAPI from '../services/mentorAPI.js';

/**
 * Página de Projetos
 * Mantém consistência visual com a página inicial usando o mesmo design system
 */
const ProjectsPage = () => {
  const [mentors, setMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await mentorAPI.getMentors({ all: false });
        // Normalizar nomes para UI
        const normalized = (Array.isArray(list) ? list : []).map(m => ({
          ...m,
          photo: m.avatar_url || m.foto_url || m.photo || null,
          name: m.nome || m.name || '',
          phone: m.telefone || m.phone || '',
          bio: m.bio || m.descricao || '',
          email: m.email || '',
          createdAt: m.created_at || m.createdAt || null,
          updatedAt: m.updated_at || m.updatedAt || null,
          projects_count: m.projects_count || m.projetos_count || m.projectsCount || null,
        }));
        setMentors(normalized.filter(m => m.visible !== false));
      } catch (err) {
        console.error('Erro ao carregar mentores (usuário):', err);
        setMentors([]);
      } finally {
        setLoadingMentors(false);
      }
    };
    load();
  }, []);
  return (
    <div className="projects-page" style={{
      backgroundImage: `url(${heroBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      minHeight: '100vh'
    }}>
      <Navbar />
      
      {/* Hero Section - limpa, usando o fundo global */}
      <section 
        className="hero-section"
      >
        <div className="hero-container">
          <div className="hero-content">
            <div className="text-area">
              <h1 className="slogan">
                Nossos Projetos
              </h1>
              <p className="description">
                Acompanhe o progresso dos nossos projetos em desenvolvimento. 
                Cada projeto representa nossa dedicação em criar soluções inovadoras 
                e de alta qualidade para nossos clientes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lista de Projetos */}
      <section className="projects-section">
        <div className="projects-container">
          <div className="section-card">
            <ProjectsList useAdminStore={false} />
          </div>
        </div>
      </section>

      {/* Seção de Mentores (Usuário) */}
      <section className="mentors-section">
        <div className="projects-container">
          <div className="section-card">
            <header className="mentors-header">
              <h2 className="mentors-title">Mentores</h2>
              <p className="mentors-subtitle">Conheça os profissionais que orientam nossos projetos</p>
            </header>
            <div className="mentors-grid" aria-busy={loadingMentors}>
              {mentors.map((m) => (
                <article key={m.id || m.email || m.name} className="mentor-card" aria-label={`Mentor ${m.name}`}>
                  <div className="avatar" aria-hidden={!!(m.avatar_url || m.photo)}>
                    {m.avatar_url || m.photo ? (
                      <img
                        src={m.avatar_url || m.photo}
                        alt={`Foto de ${m.name}`}
                        style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}
                        loading="lazy"
                        decoding="async"
                        fetchpriority="low"
                        width="120"
                        height="120"
                      />
                    ) : null}
                  </div>
                  <div className="info">
                    <div className="header">
                      <h3 className="name">{m.name}</h3>
                      <p className="role">{m.specialty || ''}</p>
                      <div className="chips">
                        {m.id ? (<span className="chip" aria-label="ID">ID: {m.id}</span>) : (<span className="chip" aria-label="ID">ID: —</span>)}
                        <span className={`chip ${m.visible ? 'alt' : ''}`} aria-label="Visibilidade">{m.visible ? 'Visível' : 'Oculto'}</span>
                      </div>
                    </div>
                    <div className="details">
                      <div className="contact">
                        {m.phone ? (<span className="contact-item" title={m.phone}>📞 {m.phone}</span>) : null}
                        {m.email ? (<span className="contact-item" title={m.email}>📧 {m.email}</span>) : null}
                      </div>
                      <p className="bio">{m.bio}</p>
                      <div className="stats">
                        <span className="stat-item">Projetos orientados: {m.projects_count ?? '—'}</span>
                        {m.created_at ? (<span className="stat-item">Mentor desde {new Date(m.created_at).toLocaleDateString('pt-BR', { month:'2-digit', year:'numeric' })}</span>) : null}
                        {m.updated_at ? (<span className="stat-item">Atualizado {new Date(m.updated_at).toLocaleDateString('pt-BR', { month:'2-digit', year:'numeric' })}</span>) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {!loadingMentors && mentors.length === 0 && (
                <div className="empty" role="status">Nenhum mentor disponível no momento.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <style>{`
        /* ===== CONTAINER PRINCIPAL ===== */
        .projects-page {
          min-height: 100vh;
          width: 100%;
          background: transparent; /* fundo vem do wrapper global */
        }

        /* ===== HERO SECTION - IDÊNTICA À PÁGINA INICIAL ===== */
        .hero-section {
          min-height: 100vh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        /* Sem overlay: usa o fundo padrão da Home vindo do wrapper global */

        /* Container do hero */
        .hero-container {
          position: relative;
          z-index: 2;
          max-width: 1000px;
          width: 100%;
          padding: var(--espaco-3xl) var(--espaco-xl);
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: var(--espaco-2xl);
        }

        /* Área de texto */
        .text-area {
          display: flex;
          flex-direction: column;
          gap: var(--espaco-xl);
        }

        /* Slogan - Tipografia idêntica à página inicial */
        .slogan {
          font-family: var(--fonte-titulos);
          font-size: clamp(2.5rem, 8vw, 5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--texto-branco);
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          margin-bottom: var(--espaco-lg);
          background: linear-gradient(
            135deg,
            var(--cor-primaria) 0%,
            var(--cor-terciaria) 50%,
            var(--texto-branco) 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite alternate;
        }

        /* Descrição - Tipografia idêntica à página inicial */
        .description {
          font-family: var(--fonte-subtitulos);
          font-size: clamp(1rem, 2.5vw, 1.375rem);
          font-weight: 400;
          line-height: 1.7;
          color: var(--texto-gelo);
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          max-width: 700px;
          margin: 0 auto;
        }

        /* ===== SEÇÃO DE PROJETOS ===== */
        .projects-section {
          background: transparent;
          padding: var(--espaco-3xl) 0;
          position: relative;
        }

        .projects-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 var(--espaco-xl);
        }

      .section-card {
          max-width: 1200px;
          margin: 0 auto;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: var(--raio-xl);
          backdrop-filter: blur(10px);
          box-shadow: 0 6px 24px rgba(0,0,0,0.25);
          padding: var(--espaco-xl);
          overflow: hidden;
        }

        /* ===== MENTORES (USUÁRIO) ===== */
        .mentors-section { background: transparent; padding: var(--espaco-3xl) 0; }
        .mentors-header { text-align: center; margin-bottom: var(--espaco-md); }
        .mentors-title { font-family: var(--fonte-titulos); font-size: clamp(1.8rem, 3vw, 2.4rem); color: var(--texto-branco); }
        .mentors-subtitle { color: var(--texto-gelo); }
        .mentors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: var(--espaco-lg);
          margin-top: var(--espaco-md);
        }
        .mentor-card {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: var(--espaco-md);
          align-items: start;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: var(--raio-lg);
          padding: var(--espaco-md);
          box-shadow: 0 4px 18px rgba(0,0,0,0.22);
        }
        .avatar { width: 100px; height: 100px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #D12BF2 0%, #68007B 100%); border: 2px solid rgba(244,244,244,0.6); }
        .info { display: flex; flex-direction: column; gap: var(--espaco-xs); min-width: 0; }
        .header { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
        .chips { display:flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
        .chip { display:inline-block; padding: 6px 10px; border-radius: 999px; font-size: 0.8rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); color: var(--texto-branco); }
        .chip.alt { background: rgba(209,43,242,0.12); border-color: rgba(209,43,242,0.35); }
        .role { color: var(--texto-gelo); font-size: 0.95rem; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; overflow-wrap: anywhere; }
        .name { font-weight: 700; color: var(--texto-branco); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; overflow-wrap: anywhere; }
        .contact { display: flex; flex-wrap: wrap; gap: var(--espaco-sm); margin-top: var(--espaco-xs); color: var(--texto-gelo); }
        .contact-item { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 6px 10px; max-width: 100%; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; overflow-wrap: anywhere; word-break: break-word; }
        .bio { margin-top: var(--espaco-sm); color: var(--texto-gelo); line-height: 1.5; word-break: break-word; overflow-wrap: anywhere; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
        .stats { display:flex; flex-wrap: wrap; gap: 10px; margin-top: var(--espaco-sm); color: var(--texto-gelo); }
        .stat-item { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 6px 8px; }

        /* ===== ANIMAÇÕES ===== */
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }

        /* ===== RESPONSIVIDADE ===== */
        @media (max-width: 768px) {
          .hero-section { background-attachment: fixed; }
          .hero-container {
            padding: var(--espaco-2xl) var(--espaco-lg);
          }

          .projects-container {
            padding: 0 var(--espaco-lg);
          }

          .section-card { padding: 16px; }

          .slogan {
            font-size: clamp(2rem, 6vw, 3rem);
          }

          .description {
            font-size: clamp(0.875rem, 2vw, 1.125rem);
          }
        }

        @media (max-width: 480px) {
          .hero-container {
            padding: var(--espaco-xl) var(--espaco-md);
          }

          .projects-container {
            padding: 0 var(--espaco-md);
          }

          .projects-section {
            padding: var(--espaco-2xl) 0;
          }

          .section-card { padding: 14px; }
          .name, .role { white-space: normal; } /* permite quebrar linhas em telas pequenas */
        }

        /* ===== MODO ESCURO (CONSISTENTE) ===== */
        @media (prefers-color-scheme: dark) {
          .projects-page {
            background-color: var(--fundo-escuro);
          }
        }

        /* ===== REDUÇÃO DE MOVIMENTO ===== */
        @media (prefers-reduced-motion: reduce) {
          .slogan {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ProjectsPage;