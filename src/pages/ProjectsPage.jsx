// src/pages/ProjectsPage.jsx
import React from 'react';

import Navbar from '../components/Navbar/Navbar';
import ProjectsList from '../components/Projects/ProjectsList';

/**
 * Página de Projetos
 * Mantém consistência visual com a página inicial usando o mesmo design system
 */
const ProjectsPage = () => {
  return (
    <div className="projects-page">
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
            <ProjectsList />
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

          .section-card {
            padding: 16px;
          }

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

          .section-card {
            padding: 14px;
          }
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