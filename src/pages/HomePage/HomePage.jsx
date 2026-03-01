// src/pages/HomePage/HomePage.jsx
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

import appsBanner from '../../assets/apps-banner.jpg';
import companiesBanner from '../../assets/companies-banner.jpg';
import desafiosBanner from '../../assets/desafios-banner.jpg';
import hero3dImg from '../../assets/hero-3d.jpg';
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

const sectionReveal = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const HomePage = () => {
  const [isCrafterModalOpen, setIsCrafterModalOpen] = useState(false);
  const { canonical, ogUrl, ogImageUrl, twitterHandle } = useMemo(() => {
    const BASE_URL = 'https://codecraftgenz.com.br';
    const url = typeof window !== 'undefined' ? window.location.href : BASE_URL;
    const imageAbs = typeof window !== 'undefined' ? new URL(logoCodecraft, window.location.href).toString() : `${BASE_URL}${logoCodecraft}`;
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
      <main>
        <div className={styles.sectionBlock}>
          <Hero onCrafterClick={() => setIsCrafterModalOpen(true)} />
        </div>

        {/* Showcase 1 - Equipe (imagem esquerda) */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={sectionReveal}
        >
          <div className={styles.showcaseRow}>
            <div className={styles.showcaseImage}>
              <img src={hero3dImg} alt="Equipe CodeCraft desenvolvendo solucoes" loading="lazy" />
            </div>
            <div className={styles.showcaseContent}>
              <span className={styles.showcaseBadge}>Sobre nos</span>
              <h2 className={styles.showcaseTitle}>Criando o futuro, linha por linha</h2>
              <p className={styles.showcaseDesc}>
                Somos uma equipe Gen-Z apaixonada por tecnologia. Desenvolvemos solucoes
                de software modernas, escalaveis e com design que faz a diferenca.
              </p>
              <ul className={styles.showcaseFeatures}>
                <li><span className={styles.featureIcon}>⚡</span> Desenvolvimento agil e moderno</li>
                <li><span className={styles.featureIcon}>🎨</span> Design UI/UX premium</li>
                <li><span className={styles.featureIcon}>🚀</span> Deploy continuo e escalavel</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Showcase 2 - Desafios (imagem direita) */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={sectionReveal}
        >
          <div className={`${styles.showcaseRow} ${styles.showcaseReverse}`}>
            <div className={styles.showcaseImage}>
              <img src={desafiosBanner} alt="Desafios de programacao CodeCraft" loading="lazy" />
            </div>
            <div className={styles.showcaseContent}>
              <span className={styles.showcaseBadge}>Desafios</span>
              <h2 className={styles.showcaseTitle}>Supere seus limites</h2>
              <p className={styles.showcaseDesc}>
                Desafios reais que testam suas habilidades e aceleram seu crescimento.
                Problemas do mercado, prazos reais e feedback de profissionais.
              </p>
              <ul className={styles.showcaseFeatures}>
                <li><span className={styles.featureIcon}>🎯</span> Desafios com problemas reais</li>
                <li><span className={styles.featureIcon}>📊</span> Ranking e reconhecimento</li>
                <li><span className={styles.featureIcon}>💬</span> Feedback de mentores</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Showcase 3 - Aplicativos (imagem esquerda) */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={sectionReveal}
        >
          <div className={styles.showcaseRow}>
            <div className={styles.showcaseImage}>
              <img src={appsBanner} alt="Hub de aplicativos CodeCraft" loading="lazy" />
            </div>
            <div className={styles.showcaseContent}>
              <span className={styles.showcaseBadge}>Aplicativos</span>
              <h2 className={styles.showcaseTitle}>Nosso ecossistema de apps</h2>
              <p className={styles.showcaseDesc}>
                Aplicativos desenvolvidos com as melhores praticas de engenharia.
                Solucoes robustas, interfaces intuitivas e performance de alto nivel.
              </p>
              <ul className={styles.showcaseFeatures}>
                <li><span className={styles.featureIcon}>📱</span> Apps desktop e mobile</li>
                <li><span className={styles.featureIcon}>🔄</span> Atualizacoes automaticas</li>
                <li><span className={styles.featureIcon}>🛡️</span> Suporte tecnico dedicado</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Showcase 4 - Empresas (imagem direita) */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={sectionReveal}
        >
          <div className={`${styles.showcaseRow} ${styles.showcaseReverse}`}>
            <div className={styles.showcaseImage}>
              <img src={companiesBanner} alt="Solucoes empresariais CodeCraft" loading="lazy" />
            </div>
            <div className={styles.showcaseContent}>
              <span className={styles.showcaseBadge}>Para Empresas</span>
              <h2 className={styles.showcaseTitle}>Solucoes sob medida</h2>
              <p className={styles.showcaseDesc}>
                Da ideacao ao deploy, construimos solucoes que combinam tecnologia
                de ponta com design intuitivo para entregar resultados reais.
              </p>
              <ul className={styles.showcaseFeatures}>
                <li><span className={styles.featureIcon}>🤝</span> Consultoria personalizada</li>
                <li><span className={styles.featureIcon}>⚙️</span> Desenvolvimento full-stack</li>
                <li><span className={styles.featureIcon}>📞</span> Suporte 24/7</li>
              </ul>
            </div>
          </div>
        </motion.div>

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

        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <div className={styles.sectionCard}>
            <div className={styles.feedbackSection}>
              <h2 className={styles.sectionTitle}>O que dizem sobre nós</h2>
              <p className={styles.sectionSubtitle}>Feedbacks reais de quem já usou nossos serviços</p>
              <FeedbackShowcase autoIntervalMs={5000} showControls={true} />
            </div>
          </div>
        </motion.div>

        <CrafterModal
          isOpen={isCrafterModalOpen}
          onClose={() => setIsCrafterModalOpen(false)}
        />
      </main>
    </div>
  );
};

export default HomePage;
