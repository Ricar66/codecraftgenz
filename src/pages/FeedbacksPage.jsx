// src/pages/FeedbacksPage.jsx
import React from 'react';

import heroBackground from '../assets/hero-background.svg';
import FeedbackForm from '../components/Feedbacks/FeedbackForm';
import Navbar from '../components/Navbar/Navbar';

export default function FeedbacksPage() {
  return (
    <div className="feedback-page">
      <Navbar />
      
      {/* Hero Section - Consistente com outras páginas */}
      <section 
        className="hero-section"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="overlay"></div>
        <div className="hero-container">
          <div className="hero-content">
            <div className="text-area">
              <h1 className="slogan">
                Compartilhe Seu Feedback
              </h1>
              <p className="description">
                Sua opinião é fundamental para nosso crescimento. 
                Compartilhe sua experiência e ajude-nos a criar soluções ainda melhores.
              </p>
            </div>
            
            {/* Formulário centralizado na hero section */}
            <div className="form-container">
              <FeedbackForm />
            </div>
          </div>
        </div>
      </section>



      <style>{`
        /* ===== CONTAINER PRINCIPAL ===== */
        .feedback-page {
          min-height: 100vh;
          width: 100%;
          background-color: var(--fundo-escuro);
        }

        /* ===== HERO SECTION - IDÊNTICA ÀS OUTRAS PÁGINAS ===== */
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
          background-attachment: fixed;
        }

        /* Overlay idêntico ao da página de projetos */
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(10, 10, 15, 0.85) 0%,
            rgba(26, 26, 46, 0.8) 30%,
            rgba(22, 33, 62, 0.75) 70%,
            rgba(15, 52, 96, 0.7) 100%
          );
          z-index: 1;
        }

        .overlay::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            ellipse at center,
            rgba(0, 0, 0, 0.1) 0%,
            rgba(0, 0, 0, 0.3) 100%
          );
        }

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

        /* Conteúdo do hero */
        .hero-content {
          display: flex;
          flex-direction: column;
          gap: var(--espaco-3xl);
          align-items: center;
        }

        /* Área de texto */
        .text-area {
          display: flex;
          flex-direction: column;
          gap: var(--espaco-xl);
        }

        /* Slogan - Tipografia idêntica às outras páginas */
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

        /* Descrição - Tipografia idêntica às outras páginas */
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

        /* Container do formulário centralizado */
        .form-container {
          width: 100%;
          max-width: 600px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--raio-lg);
          padding: var(--espaco-2xl);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.05);
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
          .hero-container {
            padding: var(--espaco-2xl) var(--espaco-lg);
          }

          .form-container {
            padding: var(--espaco-xl);
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

          .form-container {
            padding: var(--espaco-lg);
          }


        }

        /* ===== MODO ESCURO (CONSISTENTE) ===== */
        @media (prefers-color-scheme: dark) {
          .feedback-page {
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
}