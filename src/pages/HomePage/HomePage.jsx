// src/pages/HomePage/HomePage.jsx
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Zap, Palette, Rocket, Target, BarChart3, MessageSquare,
  Smartphone, RefreshCw, Shield, Handshake, Settings, Phone
} from 'lucide-react';

import appsBanner from '../../assets/apps-banner.jpg';
import companiesBanner from '../../assets/companies-banner.jpg';
import desafiosBanner from '../../assets/desafios-banner.jpg';
import hero3dImg from '../../assets/hero-3d.jpg';
import logoCodecraft from '../../assets/logo-principal.png';
import CompanySection from '../../components/CompanySection/CompanySection';
import CrafterModal from '../../components/CrafterModal/CrafterModal';
import PartnerModal from '../../components/PartnerModal/PartnerModal';
import FeaturesSection from '../../components/FeaturesSection/FeaturesSection';
import FeedbackShowcase from '../../components/Feedbacks/FeedbackShowcase';
import Hero from '../../components/Hero/Hero';
import MetricsSection from '../../components/MetricsSection/MetricsSection';
import Navbar from '../../components/Navbar/Navbar';
// OSSPSection removida — não somos open source ainda
import ShowcaseBlock from '../../components/ShowcaseBlock/ShowcaseBlock.jsx';

import styles from './HomePage.module.css';

const sectionReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const showcaseData = [
  {
    badge: 'Sobre nós',
    title: 'Criando o futuro, linha por linha',
    description: 'Somos uma equipe Gen-Z apaixonada por tecnologia. Desenvolvemos soluções de software modernas, escaláveis e com design que faz a diferença.',
    image: hero3dImg,
    imageAlt: 'Equipe CodeCraft desenvolvendo soluções',
    reverse: false,
    features: [
      { icon: <Zap size={18} />, text: 'Desenvolvimento ágil e moderno' },
      { icon: <Palette size={18} />, text: 'Design UI/UX premium' },
      { icon: <Rocket size={18} />, text: 'Deploy contínuo e escalável' },
    ],
  },
  {
    badge: 'Desafios',
    title: 'Supere seus limites',
    description: 'Desafios reais que testam suas habilidades e aceleram seu crescimento. Problemas do mercado, prazos reais e feedback de profissionais.',
    image: desafiosBanner,
    imageAlt: 'Desafios de programação CodeCraft',
    reverse: true,
    features: [
      { icon: <Target size={18} />, text: 'Desafios com problemas reais' },
      { icon: <BarChart3 size={18} />, text: 'Ranking e reconhecimento' },
      { icon: <MessageSquare size={18} />, text: 'Feedback de mentores' },
    ],
  },
  {
    badge: 'Aplicativos',
    title: 'Nosso ecossistema de apps',
    description: 'Aplicativos desenvolvidos com as melhores práticas de engenharia. Soluções robustas, interfaces intuitivas e performance de alto nível.',
    image: appsBanner,
    imageAlt: 'Hub de aplicativos CodeCraft',
    reverse: false,
    features: [
      { icon: <Smartphone size={18} />, text: 'Apps desktop e mobile' },
      { icon: <RefreshCw size={18} />, text: 'Atualizações automáticas' },
      { icon: <Shield size={18} />, text: 'Suporte técnico dedicado' },
    ],
  },
  {
    badge: 'Para Empresas',
    title: 'Soluções sob medida',
    description: 'Da ideação ao deploy, construímos soluções que combinam tecnologia de ponta com design intuitivo para entregar resultados reais.',
    image: companiesBanner,
    imageAlt: 'Soluções empresariais CodeCraft',
    reverse: true,
    features: [
      { icon: <Handshake size={18} />, text: 'Consultoria personalizada' },
      { icon: <Settings size={18} />, text: 'Desenvolvimento full-stack' },
      { icon: <Phone size={18} />, text: 'Suporte 24/7' },
    ],
  },
];

const HomePage = () => {
  const [isCrafterModalOpen, setIsCrafterModalOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const { canonical, ogUrl, ogImageUrl, twitterHandle } = useMemo(() => {
    const BASE_URL = 'https://codecraftgenz.com.br';
    const url = typeof window !== 'undefined' ? window.location.href : BASE_URL;
    const imageAbs = typeof window !== 'undefined' ? new URL(logoCodecraft, window.location.href).toString() : `${BASE_URL}${logoCodecraft}`;
    const handle = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TWITTER_HANDLE) ? String(import.meta.env.VITE_TWITTER_HANDLE) : '';
    return { canonical: url, ogUrl: url, ogImageUrl: imageAbs, twitterHandle: handle };
  }, []);

  return (
    <div className={`${styles.homePage} starfield-bg`}>
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
          <Hero onCrafterClick={() => setIsCrafterModalOpen(true)} onPartnerClick={() => setIsPartnerModalOpen(true)} />
        </div>

        {showcaseData.map((item, i) => (
          <div key={i} className={styles.sectionBlock}>
            <ShowcaseBlock {...item} />
          </div>
        ))}

        {/* CardCraft Banner */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={sectionReveal}
        >
          <a
            href="https://craftcardgenz.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cardcraftBanner}
          >
            <div className={styles.cardcraftGlow} />
            <div className={styles.cardcraftContent}>
              <span className={styles.cardcraftBadge}>Novo Produto</span>
              <h2 className={styles.cardcraftHeadline}>
                Apresentação não é detalhe.<br />
                <span className={styles.cardcraftAccent}>É posicionamento.</span>
              </h2>
              <p className={styles.cardcraftDesc}>
                CardCraft é o cartão virtual profissional feito para quem leva carreira e mercado a sério.
                Compartilhe seus dados, portfólio e presença digital em um formato atual, rápido e alinhado ao mercado.
              </p>
              <div className={styles.cardcraftCta}>
                <span className={styles.cardcraftCtaText}>Conhecer CardCraft</span>
                <span className={styles.cardcraftArrow}>&#8594;</span>
              </div>
            </div>
            <div className={styles.cardcraftVisual}>
              <div className={styles.cardcraftCard}>
                <div className={styles.cardcraftCardInner}>
                  <span className={styles.cardcraftLogo}>CardCraft</span>
                  <span className={styles.cardcraftTagline}>Seu cartão virtual profissional</span>
                </div>
              </div>
            </div>
          </a>
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
            <MetricsSection />
          </div>
        </div>

        <motion.div
          className={styles.feedbackFullWidth}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <h2 className={styles.sectionTitle}>O que dizem sobre nós</h2>
          <p className={styles.sectionSubtitle}>Feedbacks reais de quem já usou nossos serviços</p>
          <FeedbackShowcase autoIntervalMs={5000} showControls={true} />
        </motion.div>

        <CrafterModal
          isOpen={isCrafterModalOpen}
          onClose={() => setIsCrafterModalOpen(false)}
        />
        <PartnerModal
          isOpen={isPartnerModalOpen}
          onClose={() => setIsPartnerModalOpen(false)}
        />
      </main>
    </div>
  );
};

export default HomePage;
