// src/components/Feedbacks/FeedbackShowcase.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

import heroBackground from '../../assets/hero-background.svg';
import useFeedbacks from '../../hooks/useFeedbacks';

import styles from './FeedbackShowcase.module.css';

const FeedbackShowcase = ({ autoIntervalMs = 5000, showControls = true }) => {
  const { items, loading, error } = useFeedbacks({ autoFetch: true, pageSize: 20 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Usar dados reais ou fallback para exemplos fictícios
  const feedbacks = useMemo(() => {
    if (items && items.length > 0) {
      return items.map(item => ({
        id: item.ID || item.id,
        text: item.Message || item.message,
        author: item.Author || item.Company || item.author || item.company || 'Anônimo',
        rating: item.Rating || item.rating || 5,
        avatarUrl: item.AvatarUrl || item.avatarUrl,
        createdAt: item.CreatedAt || item.createdAt,
        type: item.Type || item.type
      }));
    }
    
    // Fallback para dados fictícios quando não há feedbacks reais
    return [
      {
        id: 1,
        text: "Ótimo produto, superou minhas expectativas!",
        author: "Ana Silva",
        rating: 5
      },
      {
        id: 2,
        text: "Atendimento rápido e eficiente, recomendo.",
        author: "Carlos Santos",
        rating: 5
      },
      {
        id: 3,
        text: "Qualidade excelente, vale cada centavo.",
        author: "Maria Oliveira",
        rating: 5
      },
      {
        id: 4,
        text: "Poderia melhorar no prazo de entrega.",
        author: "João Costa",
        rating: 4
      },
      {
        id: 5,
        text: "Interface intuitiva e fácil de usar.",
        author: "Lucia Ferreira",
        rating: 5
      }
    ];
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

  if (error) {
    return (
      <section className={styles.feedbackShowcase}>
        <div className={styles.showcaseContainer}>
          <div className={styles.errorState}>
            <p>Erro ao carregar feedbacks: {error.message}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className={styles.feedbackShowcase}
      style={{ backgroundImage: `url(${heroBackground})` }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Carrossel de feedbacks"
    >
      <div className={styles.showcaseContainer}>
        <div className={styles.showcaseHeader}>
          <h2 className={styles.showcaseTitle}>O que nossos clientes dizem</h2>
          <p className={styles.showcaseSubtitle}>
            Experiências reais de quem confia no nosso trabalho
          </p>
        </div>
        
        {feedbacks.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              Nenhum feedback disponível. <Link to="/feedbacks">Seja o primeiro a enviar!</Link>
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