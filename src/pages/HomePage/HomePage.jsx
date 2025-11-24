// src/pages/HomePage/HomePage.jsx
import React, { useState } from 'react';

import styles from './HomePage.module.css';
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
    <div className={styles.homePage}>
      <Navbar />
      <div className={styles.sectionBlock}>
        <Hero onCrafterClick={() => setIsCrafterModalOpen(true)} />
      </div>
      <div className={styles.sectionBlock}>
        <div className={styles.sectionCard}>
          <FeaturesSection />
        </div>
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionCard}>
          <CompanySection />
        </div>
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionCard}>
          <OSSPSection />
        </div>
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionCard}>
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
    </div>
  );
};

export default HomePage;