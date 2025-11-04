// src/pages/HomePage/HomePage.jsx
import React, { useState } from 'react';
 
import heroBackground from '../../assets/hero-background.svg';

import AppCard from '../../components/AppCard/AppCard.jsx';
import CasesSection from '../../components/CasesSection/CasesSection';
import CompanySection from '../../components/CompanySection/CompanySection';
import CrafterModal from '../../components/CrafterModal/CrafterModal';
import FeaturesSection from '../../components/FeaturesSection/FeaturesSection';
import Hero from '../../components/Hero/Hero';
import MetricsSection from '../../components/MetricsSection/MetricsSection';
import Navbar from '../../components/Navbar/Navbar';
import OSSPSection from '../../components/OSSPSection/OSSPSection.jsx';

/**
 * Página Inicial
 * Mantém consistência visual com a página de projetos usando o mesmo design system
 */
const HomePage = () => {
  const [isCrafterModalOpen, setIsCrafterModalOpen] = useState(false);

  return (
    <div className="home-page">
      <Navbar />
      <div className="section-block">
        <Hero onCrafterClick={() => setIsCrafterModalOpen(true)} />
      </div>
      <div className="section-block">
        <div className="section-card">
          <FeaturesSection />
        </div>
      </div>

      <div className="section-block">
        <div className="section-card">
          <CompanySection />
        </div>
      </div>

      <div className="section-block">
        <div className="section-card">
          <OSSPSection />
        </div>
      </div>

      <div className="section-block">
        <div className="section-card">
          <MetricsSection />
        </div>
      </div>

      <div className="section-block">
        <div className="section-card">
          <CasesSection />
        </div>
      </div>

      <CrafterModal 
        isOpen={isCrafterModalOpen} 
        onClose={() => setIsCrafterModalOpen(false)} 
      />

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
          position: relative;
          animation: fadeUp 600ms ease-out both;
        }

        .section-card::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background: radial-gradient(1200px 400px at 10% 10%, rgba(209,43,242,0.06), transparent 60%),
                      radial-gradient(800px 400px at 90% 10%, rgba(41,128,185,0.06), transparent 60%);
          opacity: 0.8;
          animation: shimmer 6s ease-in-out infinite alternate;
        }
        @media (max-width: 768px) {
          .section-card {
            padding: 16px;
            border-radius: var(--raio-lg);
          }
        }

        /* ===== ANIMAÇÕES ===== */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { opacity: 0.6; }
          100% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;