// src/components/Feedbacks/FeedbackShowcase.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

import useFeedbacks from '../../hooks/useFeedbacks';

const FeedbackShowcase = ({ autoIntervalMs = 5000, showControls = true }) => {
  const { items, loading, error } = useFeedbacks({ autoFetch: true, pageSize: 20 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Usar dados reais ou fallback para exemplos fictícios
  const feedbacks = useMemo(() => {
    if (items && items.length > 0) {
      return items.map(item => ({
        id: item.id,
        text: item.message,
        author: item.author || item.company || 'Anônimo',
        rating: item.rating || 5,
        avatarUrl: item.avatarUrl,
        createdAt: item.createdAt,
        type: item.type
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
        className={`star ${index < rating ? 'filled' : 'empty'}`}
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
      <section className="feedback-showcase">
        <div className="showcase-container">
          <div className="loading-state">
            <p>Carregando feedbacks...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="feedback-showcase">
        <div className="showcase-container">
          <div className="error-state">
            <p>Erro ao carregar feedbacks: {error.message}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="feedback-showcase"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Carrossel de feedbacks"
    >
      <div className="showcase-container">
        <div className="showcase-header">
          <h2 className="showcase-title">O que nossos clientes dizem</h2>
          <p className="showcase-subtitle">
            Experiências reais de quem confia no nosso trabalho
          </p>
        </div>
        
        {feedbacks.length === 0 ? (
          <div className="empty-state">
            <p>
              Nenhum feedback disponível. <Link to="/feedbacks">Seja o primeiro a enviar!</Link>
            </p>
          </div>
        ) : (
          <div className="carousel-wrapper">
            <div 
              className="carousel-container"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div 
                className="carousel-track"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                  transition: prefersReducedMotion ? 'none' : 'transform 0.5s ease-in-out'
                }}
              >
                {feedbacks.map((feedback) => (
                  <div key={feedback.id} className="carousel-slide">
                    <div className="feedback-card">
                      <div className="feedback-content">
                        <p className="feedback-text">"{feedback.text}"</p>
                        <div className="feedback-footer">
                          <div className="feedback-author">
                            <div className="author-avatar">
                              {feedback.avatarUrl ? (
                                <img 
                                  src={feedback.avatarUrl} 
                                  alt={`Avatar de ${feedback.author}`}
                                  className="avatar-image"
                                />
                              ) : (
                                getInitials(feedback.author)
                              )}
                            </div>
                            <div className="author-info">
                              <span className="author-name">{feedback.author}</span>
                              {feedback.createdAt && (
                                <span className="feedback-date">
                                  {new Date(feedback.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="feedback-rating">
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
                  className="carousel-btn carousel-btn-prev"
                  onClick={prevSlide}
                  aria-label="Feedback anterior"
                >
                  ‹
                </button>
                <button 
                  className="carousel-btn carousel-btn-next"
                  onClick={nextSlide}
                  aria-label="Próximo feedback"
                >
                  ›
                </button>
                
                <div className="carousel-indicators">
                  {feedbacks.map((_, index) => (
                    <button
                      key={index}
                      className={`indicator ${index === currentIndex ? 'active' : ''}`}
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

      <style>{`
        /* ===== SEÇÃO PRINCIPAL - CONTINUIDADE COM HERO ===== */
        .feedback-showcase {
          width: 100%;
          padding: 80px 0;
          position: relative;
          overflow: hidden;
          outline: none;
          
          /* Background idêntico ao Hero para continuidade visual */
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          background-image: url('/src/assets/hero-background.svg');
        }

        /* Overlay idêntico ao Hero para manter consistência */
        .feedback-showcase::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(10, 10, 15, 0.85) 0%,
            rgba(26, 26, 46, 0.8) 30%,
            rgba(22, 33, 62, 0.75) 70%,
            rgba(15, 52, 96, 0.7) 100%
          );
          z-index: 1;
        }

        .feedback-showcase::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            ellipse at center,
            rgba(0, 0, 0, 0.1) 0%,
            rgba(0, 0, 0, 0.3) 100%
          );
          z-index: 1;
        }

        /* ===== CONTAINER ===== */
        .showcase-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 var(--espaco-xl);
          position: relative;
          z-index: 3;
        }

        /* ===== CABEÇALHO ===== */
        .showcase-header {
          text-align: center;
          margin-bottom: var(--espaco-3xl);
        }

        .showcase-title {
          font-family: var(--fonte-titulos);
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 700;
          color: var(--texto-branco);
          margin-bottom: var(--espaco-lg);
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          background: linear-gradient(
            135deg,
            var(--cor-primaria) 0%,
            var(--cor-terciaria) 50%,
            var(--texto-branco) 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite alternate;
        }

        /* Animação do gradiente - idêntica ao Hero */
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }

        .showcase-subtitle {
          font-family: var(--fonte-subtitulos);
          font-size: clamp(1rem, 2.5vw, 1.25rem);
          color: var(--texto-gelo);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        /* ===== ESTADOS DE CARREGAMENTO E ERRO ===== */
        .loading-state,
        .error-state,
        .empty-state {
          text-align: center;
          padding: var(--espaco-2xl);
          color: var(--texto-gelo);
          font-family: var(--fonte-subtitulos);
        }

        .empty-state a {
          color: var(--cor-primaria);
          text-decoration: none;
          font-weight: 600;
        }

        .empty-state a:hover {
          text-decoration: underline;
        }

        /* ===== CARROSSEL ===== */
        .carousel-wrapper {
          position: relative;
          margin-top: var(--espaco-2xl);
        }

        .carousel-container {
          overflow: hidden;
          border-radius: var(--raio-lg);
          position: relative;
        }

        .carousel-track {
          display: flex;
          width: 100%;
        }

        .carousel-slide {
          min-width: 100%;
          flex-shrink: 0;
          padding: 0 var(--espaco-md);
        }

        /* ===== CARDS DE FEEDBACK ===== */
        .feedback-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--raio-lg);
          padding: var(--espaco-2xl);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          max-width: 800px;
          margin: 0 auto;
        }

        .feedback-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(
            90deg,
            var(--cor-primaria) 0%,
            var(--cor-terciaria) 100%
          );
        }

        .feedback-card:hover {
          transform: translateY(-5px);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        /* ===== CONTEÚDO DO CARD ===== */
        .feedback-content {
          display: flex;
          flex-direction: column;
          gap: var(--espaco-xl);
          height: 100%;
        }

        .feedback-text {
          font-family: var(--fonte-corpo);
          font-size: clamp(1.125rem, 2.5vw, 1.375rem);
          line-height: 1.7;
          color: var(--texto-branco);
          font-style: italic;
          flex-grow: 1;
          margin: 0;
          text-align: center;
        }

        /* ===== RODAPÉ DO CARD ===== */
        .feedback-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }

        .feedback-author {
          display: flex;
          align-items: center;
          gap: var(--espaco-md);
        }

        .author-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(
            135deg,
            var(--cor-primaria) 0%,
            var(--cor-terciaria) 100%
          );
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--fonte-subtitulos);
          font-weight: 600;
          font-size: 1rem;
          color: var(--texto-branco);
          text-transform: uppercase;
          overflow: hidden;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .author-info {
          display: flex;
          flex-direction: column;
          gap: var(--espaco-xs);
        }

        .author-name {
          font-family: var(--fonte-subtitulos);
          font-size: 1rem;
          font-weight: 600;
          color: var(--texto-branco);
        }

        .feedback-date {
          font-family: var(--fonte-corpo);
          font-size: 0.875rem;
          color: var(--texto-gelo);
          opacity: 0.8;
        }

        /* ===== AVALIAÇÃO ===== */
        .feedback-rating {
          display: flex;
          gap: 4px;
        }

        .star {
          font-size: 1.25rem;
          transition: all 0.2s ease;
        }

        .star.filled {
          color: #ffd700;
        }

        .star.empty {
          color: rgba(255, 255, 255, 0.2);
        }

        /* ===== CONTROLES DO CARROSSEL ===== */
        .carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: var(--texto-branco);
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 10;
        }

        .carousel-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-50%) scale(1.1);
        }

        .carousel-btn:focus {
          outline: 2px solid var(--cor-primaria);
          outline-offset: 2px;
        }

        .carousel-btn-prev {
          left: -25px;
        }

        .carousel-btn-next {
          right: -25px;
        }

        /* ===== INDICADORES ===== */
        .carousel-indicators {
          display: flex;
          justify-content: center;
          gap: var(--espaco-sm);
          margin-top: var(--espaco-xl);
        }

        .indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .indicator:hover {
          background: rgba(255, 255, 255, 0.5);
          transform: scale(1.2);
        }

        .indicator.active {
          background: var(--cor-primaria);
          transform: scale(1.3);
        }

        .indicator:focus {
          outline: 2px solid var(--cor-primaria);
          outline-offset: 2px;
        }

        /* ===== RESPONSIVIDADE ===== */
        @media (max-width: 768px) {
          .feedback-showcase {
            padding: 60px 0;
          }

          .showcase-container {
            padding: 0 var(--espaco-lg);
          }

          .feedback-card {
            padding: var(--espaco-xl);
          }

          .feedback-footer {
            flex-direction: column;
            align-items: center;
            gap: var(--espaco-md);
            text-align: center;
          }

          .carousel-btn {
            width: 40px;
            height: 40px;
            font-size: 1.25rem;
          }

          .carousel-btn-prev {
            left: -20px;
          }

          .carousel-btn-next {
            right: -20px;
          }
        }

        @media (max-width: 480px) {
          .feedback-showcase {
            padding: 40px 0;
          }

          .showcase-container {
            padding: 0 var(--espaco-md);
          }

          .feedback-card {
            padding: var(--espaco-lg);
          }

          .feedback-text {
            font-size: 1rem;
          }

          .carousel-btn {
            display: none;
          }

          .carousel-slide {
            padding: 0;
          }
        }

        /* ===== ACESSIBILIDADE ===== */
        @media (prefers-reduced-motion: reduce) {
          .feedback-card,
          .carousel-btn,
          .indicator {
            transition: none;
          }

          .feedback-card:hover {
            transform: none;
          }

          .carousel-btn:hover {
            transform: translateY(-50%);
          }

          .indicator:hover {
            transform: none;
          }

          .indicator.active {
            transform: none;
          }

          .star {
            transition: none;
          }

          /* Desabilitar animação do título para consistência com Hero */
          .showcase-title {
            animation: none;
          }
        }

        /* ===== MODO DE ALTO CONTRASTE ===== */
        @media (prefers-contrast: high) {
          .feedback-card {
            border-width: 2px;
            border-color: var(--texto-branco);
          }

          .feedback-text {
            color: var(--texto-branco);
          }

          .carousel-btn {
            border-width: 2px;
            border-color: var(--texto-branco);
          }
        }
      `}</style>
    </section>
  );
};

export default FeedbackShowcase;