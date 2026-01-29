// src/pages/HomePage/HomePage.jsx
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import logoCodecraft from '../../assets/logo-principal.png';
import CompanySection from '../../components/CompanySection/CompanySection';
import CrafterModal from '../../components/CrafterModal/CrafterModal';
import FeaturesSection from '../../components/FeaturesSection/FeaturesSection';
import FeedbackShowcase from '../../components/Feedbacks/FeedbackShowcase';
import Hero from '../../components/Hero/Hero';
import MetricsSection from '../../components/MetricsSection/MetricsSection';
import Navbar from '../../components/Navbar/Navbar';
import OSSPSection from '../../components/OSSPSection/OSSPSection.jsx';

import styles from './HomePage.module.css';

/**
 * Página Inicial
 * Mantém consistência visual com a página de projetos usando o mesmo design system
 */
const HomePage = () => {
  const [isCrafterModalOpen, setIsCrafterModalOpen] = useState(false);
  const { canonical, ogUrl, ogImageUrl, twitterHandle } = useMemo(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const imageAbs = typeof window !== 'undefined' ? new URL(logoCodecraft, window.location.href).toString() : logoCodecraft;
    const handle = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TWITTER_HANDLE) ? String(import.meta.env.VITE_TWITTER_HANDLE) : '';
    return { canonical: url, ogUrl: url, ogImageUrl: imageAbs, twitterHandle: handle };
  }, []);

  return (
    <div className={styles.homePage}>
      <Helmet>
        <title>CodeCraft Gen-Z | Soluções de Software do Futuro</title>
        <meta name="description" content="A CodeCraft Gen-Z cria soluções de software modernas, escaláveis e seguras, combinando IA, experiências digitais e engenharia de alto desempenho." />
        <meta property="og:title" content="CodeCraft Gen-Z | Soluções de Software do Futuro" />
        <meta property="og:description" content="Soluções de software com foco em performance, segurança e experiência — impulsionadas por design e tecnologia de ponta." />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={ogUrl} />
        <link rel="canonical" href={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CodeCraft Gen-Z | Soluções de Software do Futuro" />
        <meta name="twitter:description" content="Soluções de software com foco em performance, segurança e experiência — impulsionadas por design e tecnologia de ponta." />
        <meta name="twitter:image" content={ogImageUrl} />
        {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
      </Helmet>
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

      <div className={styles.sectionBlock}>
        <div className={styles.sectionCard}>
          <div className={styles.feedbackSection}>
            <h2 className={styles.sectionTitle}>O que dizem sobre nos</h2>
            <p className={styles.sectionSubtitle}>Feedbacks reais de quem ja usou nossos servicos</p>
            <FeedbackShowcase autoIntervalMs={5000} showControls={true} />
          </div>
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