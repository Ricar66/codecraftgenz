// src/pages/HomePage/HomePage.jsx
import React from 'react';
 
import heroBackground from '../../assets/hero-background.svg';
import FeaturesSection from '../../components/FeaturesSection/FeaturesSection';
import FeedbackShowcase from '../../components/Feedbacks/FeedbackShowcase';
import Hero from '../../components/Hero/Hero';
import Navbar from '../../components/Navbar/Navbar';

/**
 * Página Inicial
 * Mantém consistência visual com a página de projetos usando o mesmo design system
 */
const HomePage = () => {
  return (
    <div className="home-page">
      <Navbar />
      <div className="section-block">
        <Hero />
      </div>
      <div className="section-block">
        <div className="section-card">
          <FeaturesSection />
        </div>
      </div>
      <div className="section-block feedback-section">
        <FeedbackShowcase />
      </div>

      <style>{`
        /* ===== CONTAINER PRINCIPAL ===== */
        .home-page {
          min-height: 100vh;
          width: 100%;
          background-image: url(${heroBackground});
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
        }

        /* Fundo fixo também no mobile, conforme solicitado */
        @media (max-width: 768px) { .home-page { background-attachment: fixed; } }
        @media (max-width: 480px) { .home-page { background-attachment: fixed; } }

        /* ===== BLOCO TRANSPARENTE POR SEÇÃO ===== */
        .section-block {
          background: transparent;
          padding: 40px 0;
        }
        @media (max-width: 768px) {
          .section-block { padding: 24px 0; }
        }
        
        /* ===== CARD TRANSPARENTE PARA FEATURES ===== */
        .section-card {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px;
          border-radius: var(--raio-xl);
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: transparent;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
          overflow: hidden; /* garante contenção de pseudo-elementos e children */
        }
        @media (max-width: 768px) {
          .section-card {
            padding: 16px;
            border-radius: var(--raio-lg);
          }
        }
        
        /* ===== SEÇÃO DE FEEDBACKS NO FINAL ===== */
        .feedback-section { padding: 0; }
      `}</style>
    </div>
  );
};

export default HomePage;