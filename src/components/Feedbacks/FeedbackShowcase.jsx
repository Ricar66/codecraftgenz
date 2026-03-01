// src/components/Feedbacks/FeedbackShowcase.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

import { useLatestFeedbacks } from '../../hooks/useFeedbacks';
import { useScrollReveal, fadeUp } from '../../hooks/useScrollReveal';

import styles from './FeedbackShowcase.module.css';

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 200 : -200, opacity: 0, scale: 0.92 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir) => ({ x: dir > 0 ? -200 : 200, opacity: 0, scale: 0.92 }),
};

const FeedbackShowcase = ({ autoIntervalMs = 5000, showControls = true }) => {
  const { items, loading } = useLatestFeedbacks();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [direction, setDirection] = useState(1);
  const section = useScrollReveal({ threshold: 0.2 });

  const feedbacks = useMemo(() => {
    if (items && items.length > 0) {
      return items.map(item => {
        let text = item.mensagem;
        let author = item.nome || 'Anônimo';
        if (typeof text === 'string' && text.trim().startsWith('{')) {
          // Tenta JSON.parse primeiro (JSON completo)
          try {
            const parsed = JSON.parse(text);
            if (parsed.mensagem) text = parsed.mensagem;
            if (parsed.nome) author = parsed.nome;
          } catch {
            // JSON truncado pelo banco - extrair via regex
            const nomeMatch = text.match(/"nome"\s*:\s*"([^"]+)"/);
            const msgMatch = text.match(/"mensagem"\s*:\s*"([^"]*)/);
            if (nomeMatch) author = nomeMatch[1];
            if (msgMatch) text = msgMatch[1];
          }
        }
        return { id: item.id, text, author, avatarUrl: null, createdAt: item.data_criacao, type: 'feedback' };
      });
    }
    return [];
  }, [items]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const goToSlide = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % feedbacks.length);
  }, [feedbacks.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + feedbacks.length) % feedbacks.length);
  }, [feedbacks.length]);

  useEffect(() => {
    if (isPaused || prefersReducedMotion || feedbacks.length <= 1) return;
    const interval = setInterval(nextSlide, autoIntervalMs);
    return () => clearInterval(interval);
  }, [isPaused, prefersReducedMotion, feedbacks.length, nextSlide, autoIntervalMs]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nextSlide(); }
  }, [prevSlide, nextSlide]);

  const getInitials = (name) => {
    if (!name) return '😊';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    return (first + last).toUpperCase();
  };

  if (loading) {
    return (
      <section className={styles.feedbackShowcase}>
        <div className={styles.showcaseContainer}>
          <div className={styles.loadingState}><p>Carregando feedbacks...</p></div>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      className={styles.feedbackShowcase}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Carrossel de feedbacks"
      ref={section.ref}
      initial="hidden"
      animate={section.controls}
      variants={fadeUp}
    >
      <div className={styles.showcaseContainer}>
        {feedbacks.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Em breve, depoimentos de nossos clientes aparecerão aqui.</p>
            <p><Link to="/feedbacks">Já usou nossos serviços? Deixe seu feedback!</Link></p>
          </div>
        ) : (
          <div className={styles.carouselWrapper}>
            <div
              className={styles.carouselContainer}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentIndex}
                  className={styles.carouselSlide}
                  custom={direction}
                  variants={prefersReducedMotion ? {} : slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                >
                  <div className={styles.feedbackCard}>
                    <div className={styles.feedbackContent}>
                      <p className={styles.feedbackText}>"{feedbacks[currentIndex].text}"</p>
                      <div className={styles.feedbackFooter}>
                        <div className={styles.feedbackAuthor}>
                          <motion.div
                            className={styles.authorAvatar}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 250, damping: 12, delay: 0.2 }}
                          >
                            {feedbacks[currentIndex].avatarUrl ? (
                              <img
                                src={feedbacks[currentIndex].avatarUrl}
                                alt={`Avatar de ${feedbacks[currentIndex].author}`}
                                className={styles.avatarImage}
                              />
                            ) : (
                              getInitials(feedbacks[currentIndex].author)
                            )}
                          </motion.div>
                          <div className={styles.authorInfo}>
                            <span className={styles.authorName}>{feedbacks[currentIndex].author}</span>
                            {feedbacks[currentIndex].createdAt && (
                              <span className={styles.feedbackDate}>
                                {new Date(feedbacks[currentIndex].createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {showControls && feedbacks.length > 1 && (
              <>
                <motion.button
                  className={`${styles.carouselBtn} ${styles.carouselBtnPrev}`}
                  onClick={prevSlide}
                  aria-label="Feedback anterior"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ‹
                </motion.button>
                <motion.button
                  className={`${styles.carouselBtn} ${styles.carouselBtnNext}`}
                  onClick={nextSlide}
                  aria-label="Próximo feedback"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ›
                </motion.button>

                <div className={styles.carouselIndicators}>
                  {feedbacks.map((_, index) => (
                    <motion.button
                      key={index}
                      className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
                      onClick={() => goToSlide(index)}
                      aria-label={`Ir para feedback ${index + 1}`}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.8 }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default FeedbackShowcase;
