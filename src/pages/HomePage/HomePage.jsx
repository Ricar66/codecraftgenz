// src/pages/HomePage/HomePage.jsx
import React from 'react';

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
      <Hero />
      <FeedbackShowcase />
      <FeaturesSection />

      <style>{`
        /* ===== CONTAINER PRINCIPAL ===== */
        .home-page {
          min-height: 100vh;
          width: 100%;
          background-color: var(--fundo-escuro);
        }

        /* ===== RESPONSIVIDADE ===== */
        @media (max-width: 768px) {
          .home-page {
            background-color: var(--fundo-escuro);
          }
        }

        @media (max-width: 480px) {
          .home-page {
            background-color: var(--fundo-escuro);
          }
        }

        /* ===== MODO ESCURO (CONSISTENTE) ===== */
        @media (prefers-color-scheme: dark) {
          .home-page {
            background-color: var(--fundo-escuro);
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;