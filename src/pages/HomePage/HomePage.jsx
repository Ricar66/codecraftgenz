// src/pages/HomePage/HomePage.jsx
import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Zap, Palette, Rocket, Smartphone, RefreshCw, Shield,
  Handshake, Settings, Phone, Building2, ArrowRight, MessageSquareHeart,
} from 'lucide-react';

import appsBanner from '../../assets/apps-banner.png';
import companiesBanner from '../../assets/companies-banner.png';
import hero3dImg from '../../assets/hero-3d.png';
import logoCodecraft from '../../assets/logo-principal.png';
import CompanySection from '../../components/CompanySection/CompanySection';
import FeaturesSection from '../../components/FeaturesSection/FeaturesSection';
import FeedbackShowcase from '../../components/Feedbacks/FeedbackShowcase';
import Hero from '../../components/Hero/Hero';
import Navbar from '../../components/Navbar/Navbar';
import NewsSection from '../../components/NewsSection/NewsSection';
import ShowcaseBlock from '../../components/ShowcaseBlock/ShowcaseBlock.jsx';
import LojaShowcase from '../../components/LojaShowcase/LojaShowcase.jsx';
import TargetAudience from '../../components/TargetAudience/TargetAudience.jsx';
import ProcessSteps from '../../components/ProcessSteps/ProcessSteps.jsx';
import FAQ from '../../components/FAQ/FAQ.jsx';

import styles from './HomePage.module.css';

const sectionReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

// Layout zig-zag dos blocos: 1º esquerda · 2º direita · 3º esquerda
const showcaseData = [
  {
    badge: 'Sobre a empresa',
    title: 'Software de verdade, feito com critério',
    description:
      'A CodeCraft Gen-Z é uma empresa brasileira de desenvolvimento de software. Construímos apps próprios e soluções sob medida para empresas que precisam de tecnologia confiável — sem complicações.',
    image: hero3dImg,
    imageAlt: 'Equipe CodeCraft Gen-Z desenvolvendo software',
    reverse: false,
    features: [
      { icon: <Zap size={18} />, text: 'Desenvolvimento ágil e profissional' },
      { icon: <Palette size={18} />, text: 'Design e UX bem cuidados' },
      { icon: <Rocket size={18} />, text: 'Entrega rápida e escalável' },
    ],
  },
  {
    badge: 'Aplicativos',
    title: 'Apps prontos para uso, com suporte de verdade',
    description:
      'Nosso catálogo cresce a cada mês — produtos próprios desenvolvidos com as melhores práticas de engenharia. Plataformas web, apps desktop e mobile com atualizações contínuas e atendimento direto.',
    image: appsBanner,
    imageAlt: 'Catálogo de aplicativos CodeCraft Gen-Z',
    reverse: true,
    features: [
      { icon: <Smartphone size={18} />, text: 'Apps web, desktop e mobile' },
      { icon: <RefreshCw size={18} />, text: 'Atualizações automáticas contínuas' },
      { icon: <Shield size={18} />, text: 'Suporte dedicado por WhatsApp e e-mail' },
    ],
  },
  {
    badge: 'Para Empresas',
    title: 'Desenvolvimento sob medida, sem fornecedor que some',
    description:
      'Você tem uma ideia ou um problema. A gente tem o time completo: desenvolvimento, design, infraestrutura e suporte pós-entrega. Briefing direto, prazo cumprido, código que envelhece bem.',
    image: companiesBanner,
    imageAlt: 'Soluções empresariais sob medida da CodeCraft Gen-Z',
    reverse: false,
    features: [
      { icon: <Handshake size={18} />, text: 'Primeiro contato em até 24h' },
      { icon: <Settings size={18} />, text: 'Time full-stack, design e infra' },
      { icon: <Phone size={18} />, text: 'Acompanhamento ativo pós-entrega' },
    ],
  },
];

const HomePage = () => {
  const { canonical, ogUrl, ogImageUrl, twitterHandle } = useMemo(() => {
    const BASE_URL = 'https://codecraftgenz.com.br';
    const url = typeof window !== 'undefined' ? window.location.href : BASE_URL;
    const imageAbs = typeof window !== 'undefined'
      ? new URL(logoCodecraft, window.location.href).toString()
      : `${BASE_URL}${logoCodecraft}`;
    const handle = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TWITTER_HANDLE)
      ? String(import.meta.env.VITE_TWITTER_HANDLE)
      : '';
    return { canonical: url, ogUrl: url, ogImageUrl: imageAbs, twitterHandle: handle };
  }, []);

  return (
    <div className={`${styles.homePage} starfield-bg`}>
      <Helmet>
        <title>CodeCraft Gen-Z | Software sob medida para empresas</title>
        <meta name="description" content="Desenvolvemos apps, plataformas e integrações para empresas. Apps prontos para uso e soluções sob medida — código limpo, design sólido e suporte dedicado." />
        <meta property="og:title" content="CodeCraft Gen-Z | Software sob medida para empresas" />
        <meta property="og:description" content="Apps prontos para empresas e soluções sob medida. Do briefing ao deploy, com suporte dedicado." />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={ogUrl} />
        <link rel="canonical" href={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CodeCraft Gen-Z | Software sob medida para empresas" />
        <meta name="twitter:description" content="Apps prontos para empresas e soluções sob medida. Do briefing ao deploy, com suporte dedicado." />
        <meta name="twitter:image" content={ogImageUrl} />
        {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
      </Helmet>

      <Navbar />

      <main>
        {/* 1. Hero */}
        <div className={styles.sectionBlock}>
          <Hero />
        </div>

        {/* 2. Loja em destaque */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <LojaShowcase />
        </motion.div>

        {/* 3. Para quem é (segmentos atendidos) */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <TargetAudience />
        </motion.div>

        {/* 4. Como funciona em 3 etapas */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <ProcessSteps />
        </motion.div>

        {/* 5. Showcase blocks (Sobre / Aplicativos / Para Empresas) */}
        {showcaseData.map((item, i) => (
          <div key={i} className={styles.sectionBlock}>
            <ShowcaseBlock {...item} />
          </div>
        ))}

        {/* 6. CraftCard Banner (produto próprio em destaque) */}
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
              <span className={styles.cardcraftBadge}>Produto CodeCraft Gen-Z</span>
              <h2 className={styles.cardcraftHeadline}>
                Apresentação não é detalhe.<br />
                <span className={styles.cardcraftAccent}>É posicionamento.</span>
              </h2>
              <p className={styles.cardcraftDesc}>
                CraftCard é o cartão digital profissional da CodeCraft Gen-Z — feito para quem leva carreira a sério.
                QR Code, portfólio, agendamento e analytics em um único link.
              </p>
              <div className={styles.cardcraftCta}>
                <span className={styles.cardcraftCtaText}>Conhecer CraftCard</span>
                <span className={styles.cardcraftArrow}>&#8594;</span>
              </div>
            </div>
            <div className={styles.cardcraftVisual}>
              <div className={styles.cardcraftCard}>
                <div className={styles.cardcraftCardInner}>
                  <span className={styles.cardcraftLogo}>CraftCard</span>
                  <span className={styles.cardcraftTagline}>Seu cartão virtual profissional</span>
                </div>
              </div>
            </div>
          </a>
        </motion.div>

        {/* 7. Features (o que oferecemos) */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionCard}>
            <FeaturesSection />
          </div>
        </div>

        {/* 8. Sobre a empresa */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionCard}>
            <CompanySection />
          </div>
        </div>

        {/* 9. Notícias do mercado tech */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionCard}>
            <NewsSection />
          </div>
        </div>

        {/* 10. Depoimentos */}
        <motion.div
          className={styles.feedbackFullWidth}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <FeedbackShowcase />
        </motion.div>

        {/* 11. FAQ */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <FAQ />
        </motion.div>

        {/* 12. Banner de avaliação */}
        <motion.div
          className={styles.avaliacaoSection}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={sectionReveal}
        >
          <div className={styles.avaliacaoInner}>
            <div className={styles.avaliacaoIcon}>
              <MessageSquareHeart size={36} />
            </div>
            <div className={styles.avaliacaoText}>
              <h2 className={styles.avaliacaoTitle}>O que você achou do nosso site?</h2>
              <p className={styles.avaliacaoDesc}>Sua opinião nos ajuda a melhorar — elogio, sugestão ou crítica, leva 1 minuto.</p>
            </div>
            <Link to="/avaliacao" className={styles.avaliacaoBtn}>
              Deixar avaliação <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>

        {/* 13. CTA Final (B2B) */}
        <motion.div
          className={styles.ctaFinalSection}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={sectionReveal}
        >
          <div className={styles.ctaFinalInner}>
            <h2 className={styles.ctaFinalTitle}>Vamos transformar sua ideia em software?</h2>
            <p className={styles.ctaFinalDesc}>
              Apps prontos para uso ou desenvolvimento sob medida — escolha o caminho que faz sentido para a sua empresa.
            </p>
            <div className={styles.ctaFinalBtns}>
              <Link to="/para-empresas" className={styles.ctaFinalBtnEmpresa}>
                <Building2 size={18} /> Quero contratar a CodeCraft
              </Link>
              <Link to="/aplicativos" className={styles.ctaFinalBtnCrafter}>
                <Rocket size={18} /> Ver nossos apps →
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default HomePage;
