// src/components/Feedbacks/FeedbackShowcase.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useLatestFeedbacks } from '../../hooks/useFeedbacks';

import styles from './FeedbackShowcase.module.css';

// Sem dados de fallback - exibimos mensagem quando não há feedbacks reais

const FeedbackShowcase = ({ autoIntervalMs = 5000, showControls = true }) => {
  const { items, loading } = useLatestFeedbacks();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Usar apenas dados reais da API
  const feedbacks = useMemo(() => {
    if (items && items.length > 0) {
      return items.map(item => ({
        id: item.id,
        text: item.mensagem,
        author: item.nome || 'Anônimo',
        rating: item.rating || 5,
        avatarUrl: null,
        createdAt: item.data_criacao,
        type: 'feedback'
      }));
    }
    return []; // Retorna array vazio se não houver feedbacks reais
  }, [items]);

  // Detectar preferência de movimento reduzido
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Navegação do carrossel
  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % feedbacks.length);
  }, [feedbacks.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + feedbacks.length) % feedbacks.length);
  }, [feedbacks.length]);

  // Auto-scroll
  useEffect(() => {
    if (isPaused || prefersReducedMotion || feedbacks.length <= 1) return;
    
    const interval = setInterval(nextSlide, autoIntervalMs);
    return () => clearInterval(interval);
  }, [isPaused, prefersReducedMotion, feedbacks.length, nextSlide, autoIntervalMs]);

  // Navegação por teclado
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
    }
  }, [prevSlide, nextSlide]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <span 
        key={index} 
        className={`${styles.star} ${index < rating ? styles.filled : styles.empty}`}
      >
        ★
      </span>
    ));
  };

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
          <div className={styles.loadingState}>
            <p>Carregando feedbacks...</p>
          </div>
        </div>
      </section>
    );
  }

  // Em caso de erro na API, mantemos a experiência com dados de fallback
  // (não exibimos estado de erro visível para não quebrar o layout da Home)

  return (
    <section 
      className={styles.feedbackShowcase}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Carrossel de feedbacks"
    >
      <div className={styles.showcaseContainer}>
        
        {feedbacks.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              Em breve, depoimentos de nossos clientes aparecerão aqui.
            </p>
            <p>
              <Link to="/feedbacks">Já usou nossos serviços? Deixe seu feedback!</Link>
            </p>
          </div>
        ) : (
          <div className={styles.carouselWrapper}>
            <div 
              className={styles.carouselContainer}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div 
                className={`${styles.carouselTrack} ${prefersReducedMotion ? styles.carouselTrackReducedMotion : ''}`}
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                  transition: prefersReducedMotion ? 'none' : 'transform 0.5s ease-in-out'
                }}
              >
                {feedbacks.map((feedback) => (
                  <div key={feedback.id} className={styles.carouselSlide}>
                    <div className={styles.feedbackCard}>
                      <div className={styles.feedbackContent}>
                        <p className={styles.feedbackText}>"{feedback.text}"</p>
                        <div className={styles.feedbackFooter}>
                          <div className={styles.feedbackAuthor}>
                            <div className={styles.authorAvatar}>
                              {feedback.avatarUrl ? (
                                <img 
                                  src={feedback.avatarUrl} 
                                  alt={`Avatar de ${feedback.author}`}
                                  className={styles.avatarImage}
                                />
                              ) : (
                                getInitials(feedback.author)
                              )}
                            </div>
                            <div className={styles.authorInfo}>
                              <span className={styles.authorName}>{feedback.author}</span>
                              {feedback.createdAt && (
                                <span className={styles.feedbackDate}>
                                  {new Date(feedback.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={styles.feedbackRating}>
                            {renderStars(feedback.rating)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showControls && feedbacks.length > 1 && (
              <>
                <button 
                  className={`${styles.carouselBtn} ${styles.carouselBtnPrev}`}
                  onClick={prevSlide}
                  aria-label="Feedback anterior"
                >
                  ‹
                </button>
                <button 
                  className={`${styles.carouselBtn} ${styles.carouselBtnNext}`}
                  onClick={nextSlide}
                  aria-label="Próximo feedback"
                >
                  ›
                </button>
                
                <div className={styles.carouselIndicators}>
                   {feedbacks.map((_, index) => (
                     <button
                       key={index}
                       className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
                       onClick={() => goToSlide(index)}
                       aria-label={`Ir para feedback ${index + 1}`}
                     />
                   ))}
                 </div>
              </>
            )}
          </div>
        )}
      </div>
     </section>
   );
 };
 
 export default FeedbackShowcase;