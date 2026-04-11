// src/components/Hero/Hero.jsx
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Building2 } from 'lucide-react';

import { useAnalytics } from '../../hooks/useAnalytics';
import { trackFunnelStep } from '../../services/analyticsAPI.js';
import Button from '../Button/Button';

import styles from './Hero.module.css';

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
});

const hashtagVariant = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: 0.4 + i * 0.1,
      type: 'spring',
      stiffness: 150,
      damping: 14,
    },
  }),
};

const hashtags = ['Comunidade Dev', 'Inovação Tech', 'Oportunidades Reais'];

const Hero = () => {
  const { trackButtonClick } = useAnalytics();
  const navigate = useNavigate();

  const handleCtaClick = useCallback(() => {
    trackButtonClick('cta_quero_ser_crafter', 'hero_section', {
      cta_text: 'Quero ser um Crafter',
    });
    trackFunnelStep('crafter_funnel', 'crafter_cta_clicked', { location: 'hero_section' });
    navigate('/register');
  }, [trackButtonClick, navigate]);

  const handlePartnerClick = useCallback(() => {
    trackButtonClick('cta_sou_empresa', 'hero_section', {
      cta_text: 'Sou uma Empresa',
    });
    trackFunnelStep('company_funnel', 'company_cta_clicked', { location: 'hero_section' });
    navigate('/para-empresas');
  }, [trackButtonClick, navigate]);

  return (
    <section
      className={styles.heroWrapper}
      aria-label="Seção principal - Banner CodeCraft"
    >
      <div className={`${styles.heroContent} container`}>
        <div className={styles.textArea}>
          <motion.h1
            className={styles.slogan}
            initial="hidden"
            animate="visible"
            variants={fadeUp(0.1)}
          >
            Programe seu futuro,{' '}
            <span className={styles.sloganAccent}>craftando o agora.</span>
          </motion.h1>

          <motion.p
            className={styles.subtitle}
            initial="hidden"
            animate="visible"
            variants={fadeUp(0.25)}
          >
            Complete desafios reais, entre em projetos e seja descoberto.{' '}
            <span className={styles.subtitleAccent}>Empresas encontram talentos. Crafters encontram oportunidades.</span>
          </motion.p>

          <div className={styles.hashtags}>
            {hashtags.map((tag, i) => (
              <motion.span
                key={tag}
                className={styles.hashtagItem}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={hashtagVariant}
              >
                {tag}
              </motion.span>
            ))}
          </div>
        </div>

        <motion.div
          className={styles.actionArea}
          initial="hidden"
          animate="visible"
          variants={fadeUp(0.5)}
        >
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Button
              onClick={handleCtaClick}
              variant="secondary"
              className={styles.ctaButton}
              aria-label="Cadastrar-se na plataforma CodeCraft"
            >
              <Rocket size={18} /> Quero ser um Crafter
            </Button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Button
              onClick={handlePartnerClick}
              variant="outline"
              className={styles.partnerButton}
              aria-label="Conhecer soluções para empresas"
            >
              <Building2 size={18} /> Sou uma Empresa →
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className={styles.scrollIndicator}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        onClick={() => {
          const nextSection = document.querySelector('[data-section="features"]');
          if (nextSection) {
            nextSection.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Rolar para baixo"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
          }
        }}
      >
        <span className={styles.scrollText}>Descubra mais</span>
        <motion.div
          className={styles.scrollMouse}
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className={styles.scrollWheel} />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
