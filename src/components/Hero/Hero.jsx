/**
 * COMPONENTE HERO - SEÇÃO PRINCIPAL DA PÁGINA
 *
 * Este componente representa a seção hero (banner principal) da aplicação CodeCraft.
 * Contém o slogan principal, descrição da plataforma e call-to-action (CTA).
 *
 * @author CodeCraft Team
 * @version 2.0.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAnalytics } from '../../hooks/useAnalytics';
import Button from '../Button/Button';

import styles from './Hero.module.css';

const sloganText = 'Programe seu futuro, craftando o agora.';
const TYPING_SPEED = 60;
const ERASING_SPEED = 30;
const PAUSE_AFTER_TYPE = 2500;
const PAUSE_AFTER_ERASE = 800;
const START_DELAY = 400;

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
});

const hashtagVariant = {
  hidden: { opacity: 0, scale: 0.7, y: 15 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: 0.3 + i * 0.12,
      type: 'spring',
      stiffness: 150,
      damping: 12,
    },
  }),
};

const ctaVariant = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: 0.6,
      type: 'spring',
      stiffness: 120,
      damping: 14,
    },
  },
};

const hashtags = ['#DevGenZ', '#CraftandoSonhos', '#TechOpportunities'];

const Hero = ({ onCrafterClick }) => {
  const [buttonClicks, setButtonClicks] = useState(0);
  const [typedCount, setTypedCount] = useState(0);
  const [firstCycleDone, setFirstCycleDone] = useState(false);
  const { trackButtonClick } = useAnalytics();
  const cancelRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedCount(sloganText.length);
      setFirstCycleDone(true);
      return;
    }

    cancelRef.current = false;
    let timeout;

    const runCycle = () => {
      let i = 0;
      // Phase 1: Type
      const typeInterval = setInterval(() => {
        if (cancelRef.current) { clearInterval(typeInterval); return; }
        i++;
        setTypedCount(i);
        if (i >= sloganText.length) {
          clearInterval(typeInterval);
          setFirstCycleDone(true);
          // Phase 2: Pause then erase
          timeout = setTimeout(() => {
            if (cancelRef.current) return;
            let j = sloganText.length;
            const eraseInterval = setInterval(() => {
              if (cancelRef.current) { clearInterval(eraseInterval); return; }
              j--;
              setTypedCount(j);
              if (j <= 0) {
                clearInterval(eraseInterval);
                // Phase 3: Pause then restart
                timeout = setTimeout(() => {
                  if (!cancelRef.current) runCycle();
                }, PAUSE_AFTER_ERASE);
              }
            }, ERASING_SPEED);
          }, PAUSE_AFTER_TYPE);
        }
      }, TYPING_SPEED);
    };

    timeout = setTimeout(runCycle, START_DELAY);

    return () => {
      cancelRef.current = true;
      clearTimeout(timeout);
    };
  }, []);

  const handleCtaClick = useCallback(() => {
    const newClickCount = buttonClicks + 1;
    setButtonClicks(newClickCount);
    trackButtonClick('cta_quero_ser_crafter', 'hero_section', {
      click_count: newClickCount,
      user_engagement: newClickCount > 1 ? 'high' : 'normal',
      cta_text: 'Quero ser um Crafter',
    });
    if (onCrafterClick) onCrafterClick();
  }, [buttonClicks, trackButtonClick, onCrafterClick]);

  const typedText = sloganText.slice(0, typedCount);

  return (
    <section
      className={styles.heroWrapper}
      aria-label="Seção principal - Banner CodeCraft"
    >
      <div className={`${styles.heroContent} container`}>
        <div className={styles.textArea}>
          {/* Slogan - typewriter effect */}
          <h1 className={styles.slogan} aria-label={sloganText}>
            <span className={styles.sloganText}>{typedText}</span>
            <span className={styles.cursor}>|</span>
          </h1>

          {/* Subtitle - aparece quando digitação termina */}
          <motion.p
            className={styles.subtitle}
            initial="hidden"
            animate={firstCycleDone ? 'visible' : 'hidden'}
            variants={fadeUp(0.2)}
          >
            Conectamos talentos Gen-Z como você às melhores
            oportunidades e desafios do mundo tech.
          </motion.p>

          {/* Hashtags - aparecem após subtitle */}
          <div className={styles.hashtags}>
            {hashtags.map((tag, i) => (
              <motion.span
                key={tag}
                className={styles.hashtagItem}
                custom={i}
                initial="hidden"
                animate={firstCycleDone ? 'visible' : 'hidden'}
                variants={hashtagVariant}
              >
                {tag}
              </motion.span>
            ))}
          </div>
        </div>

        {/* CTA Area */}
        <motion.div
          className={styles.actionArea}
          initial="hidden"
          animate={firstCycleDone ? 'visible' : 'hidden'}
          variants={ctaVariant}
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Button
              onClick={handleCtaClick}
              variant="secondary"
              className={styles.ctaButton}
              aria-label="Cadastrar-se na plataforma CodeCraft"
            >
              🚀 Quero ser um Crafter
            </Button>
          </motion.div>

          <AnimatePresence>
            {buttonClicks > 0 && (
              <motion.span
                className={styles.clickCounter}
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: -10 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                Interesse demonstrado: {buttonClicks}x
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className={styles.scrollIndicator}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.0, duration: 0.6 }}
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
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className={styles.scrollWheel}></div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
