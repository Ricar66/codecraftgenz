// src/pages/HomePage/HomePage.jsx
import React, { useState, useEffect } from 'react';
 
import heroBackground from '../../assets/hero-background.svg';
import CrafterModal from '../../components/CrafterModal/CrafterModal';
import FeaturesSection from '../../components/FeaturesSection/FeaturesSection';
import Hero from '../../components/Hero/Hero';
import Navbar from '../../components/Navbar/Navbar';

/**
 * Página Inicial Redesenhada
 * Design profissional e impactante com elementos visuais dinâmicos
 */
const HomePage = () => {
  const [isCrafterModalOpen, setIsCrafterModalOpen] = useState(false);
  const [stats, setStats] = useState({
    projetos: 0,
    mentores: 0,
    crafters: 0,
    equipes: 0
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar estatísticas do sistema
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/dashboard/resumo');
        if (response.ok) {
          const data = await response.json();
          setStats({
            projetos: data.totais?.projetos_total || 0,
            mentores: data.totais?.mentores_total || 0,
            crafters: data.totais?.crafters_total || 0,
            equipes: data.totais?.equipes_total || 0
          });
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadStats();
  }, []);

  // Animação de contadores
  const [animatedStats, setAnimatedStats] = useState({
    projetos: 0,
    mentores: 0,
    crafters: 0,
    equipes: 0
  });

  useEffect(() => {
    if (isLoaded) {
      const duration = 2000; // 2 segundos
      const steps = 60;
      const stepDuration = duration / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        
        setAnimatedStats({
          projetos: Math.floor(stats.projetos * progress),
          mentores: Math.floor(stats.mentores * progress),
          crafters: Math.floor(stats.crafters * progress),
          equipes: Math.floor(stats.equipes * progress)
        });

        if (currentStep >= steps) {
          clearInterval(interval);
          setAnimatedStats(stats);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [isLoaded, stats]);

  return (
    <div className="home-page">
      <Navbar />
      
      {/* Hero Section */}
      <div className="hero-section">
        <Hero onCrafterClick={() => setIsCrafterModalOpen(true)} />
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stats-container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-number">{animatedStats.projetos}</div>
              <div className="stat-label">Projetos Ativos</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👨‍🏫</div>
              <div className="stat-number">{animatedStats.mentores}</div>
              <div className="stat-label">Mentores Especialistas</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-number">{animatedStats.crafters}</div>
              <div className="stat-label">Crafters Ativos</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🚀</div>
              <div className="stat-number">{animatedStats.equipes}</div>
              <div className="stat-label">Equipes Formadas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="features-container">
          <FeaturesSection />
        </div>
      </div>

      {/* Innovation Section */}
      <div className="innovation-section">
        <div className="innovation-container">
          <div className="innovation-content">
            <h2>🚀 Inovação em Movimento</h2>
            <p>
              Conectamos talentos emergentes com mentores experientes para criar 
              soluções tecnológicas que transformam o futuro. Cada projeto é uma 
              oportunidade de crescimento e impacto real.
            </p>
            <div className="innovation-features">
              <div className="innovation-feature">
                <div className="feature-icon">⚡</div>
                <div className="feature-content">
                  <h3>Desenvolvimento Ágil</h3>
                  <p>Metodologias modernas para resultados rápidos e eficientes</p>
                </div>
              </div>
              <div className="innovation-feature">
                <div className="feature-icon">🎓</div>
                <div className="feature-content">
                  <h3>Mentoria Especializada</h3>
                  <p>Orientação de profissionais experientes do mercado</p>
                </div>
              </div>
              <div className="innovation-feature">
                <div className="feature-icon">🌟</div>
                <div className="feature-content">
                  <h3>Projetos Reais</h3>
                  <p>Experiência prática com impacto no mundo real</p>
                </div>
              </div>
            </div>
          </div>
          <div className="innovation-visual">
            <div className="floating-elements">
              <div className="floating-element element-1">💡</div>
              <div className="floating-element element-2">⚙️</div>
              <div className="floating-element element-3">🔧</div>
              <div className="floating-element element-4">📱</div>
              <div className="floating-element element-5">💻</div>
              <div className="floating-element element-6">🎨</div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2>Pronto para Transformar Ideias em Realidade?</h2>
            <p>
              Junte-se à nossa comunidade de inovadores e faça parte da próxima 
              geração de desenvolvedores que estão moldando o futuro da tecnologia.
            </p>
            <div className="cta-buttons">
              <button 
                className="cta-button primary"
                onClick={() => setIsCrafterModalOpen(true)}
              >
                🚀 Começar Agora
              </button>
              <button 
                className="cta-button secondary"
                onClick={() => window.location.href = '/projetos'}
              >
                📋 Ver Projetos
              </button>
            </div>
          </div>
        </div>
      </div>

      <CrafterModal 
        isOpen={isCrafterModalOpen} 
        onClose={() => setIsCrafterModalOpen(false)} 
      />

      <style>{`
        /* ===== CONTAINER PRINCIPAL ===== */
        .home-page {
          min-height: 100vh;
          width: 100%;
          background-image: url(${heroBackground});
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          position: relative;
        }

        .home-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            rgba(0, 123, 255, 0.1) 0%, 
            rgba(209, 43, 242, 0.1) 50%, 
            rgba(0, 228, 242, 0.1) 100%
          );
          pointer-events: none;
          z-index: 0;
        }

        /* ===== SEÇÕES ===== */
        .hero-section,
        .stats-section,
        .features-section,
        .innovation-section,
        .cta-section {
          position: relative;
          z-index: 1;
        }

        .hero-section {
          padding: 40px 0;
        }

        /* ===== SEÇÃO DE ESTATÍSTICAS ===== */
        .stats-section {
          padding: 80px 0;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stats-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 40px 30px;
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.1), 
            transparent
          );
          transition: left 0.5s ease;
        }

        .stat-card:hover::before {
          left: 100%;
        }

        .stat-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .stat-icon {
          font-size: 3rem;
          margin-bottom: 20px;
          display: block;
        }

        .stat-number {
          font-size: 3.5rem;
          font-weight: bold;
          color: #fff;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .stat-label {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
        }

        /* ===== SEÇÃO DE FEATURES ===== */
        .features-section {
          padding: 80px 0;
        }

        .features-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(15px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        /* ===== SEÇÃO DE INOVAÇÃO ===== */
        .innovation-section {
          padding: 100px 0;
          background: rgba(0, 0, 0, 0.1);
        }

        .innovation-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .innovation-content h2 {
          font-size: 2.5rem;
          color: #fff;
          margin-bottom: 20px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .innovation-content p {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .innovation-features {
          display: flex;
          flex-direction: column;
          gap: 25px;
        }

        .innovation-feature {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .innovation-feature:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateX(10px);
        }

        .feature-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          flex-shrink: 0;
        }

        .feature-content h3 {
          color: #fff;
          margin: 0 0 8px 0;
          font-size: 1.2rem;
        }

        .feature-content p {
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          font-size: 0.95rem;
          line-height: 1.4;
        }

        /* ===== ELEMENTOS FLUTUANTES ===== */
        .innovation-visual {
          position: relative;
          height: 400px;
        }

        .floating-elements {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .floating-element {
          position: absolute;
          font-size: 2rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: float 6s ease-in-out infinite;
        }

        .element-1 { top: 10%; left: 20%; animation-delay: 0s; }
        .element-2 { top: 30%; right: 10%; animation-delay: 1s; }
        .element-3 { top: 60%; left: 10%; animation-delay: 2s; }
        .element-4 { bottom: 20%; right: 30%; animation-delay: 3s; }
        .element-5 { top: 50%; left: 50%; animation-delay: 4s; }
        .element-6 { top: 20%; left: 60%; animation-delay: 5s; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        /* ===== SEÇÃO CALL TO ACTION ===== */
        .cta-section {
          padding: 100px 0;
          background: linear-gradient(135deg, 
            rgba(0, 123, 255, 0.2) 0%, 
            rgba(209, 43, 242, 0.2) 100%
          );
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cta-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 24px;
          text-align: center;
        }

        .cta-content h2 {
          font-size: 2.8rem;
          color: #fff;
          margin-bottom: 20px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .cta-content p {
          font-size: 1.3rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .cta-buttons {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .cta-button {
          padding: 16px 32px;
          border: none;
          border-radius: 50px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 180px;
          justify-content: center;
        }

        .cta-button.primary {
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
        }

        .cta-button.primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 123, 255, 0.4);
        }

        .cta-button.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .cta-button.secondary:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-3px);
        }

        /* ===== RESPONSIVIDADE ===== */
        @media (max-width: 768px) {
          .home-page { background-attachment: scroll; }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          
          .stat-card {
            padding: 30px 20px;
          }
          
          .stat-number {
            font-size: 2.5rem;
          }
          
          .innovation-container {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          
          .innovation-content h2 {
            font-size: 2rem;
          }
          
          .cta-content h2 {
            font-size: 2.2rem;
          }
          
          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }
          
          .floating-elements {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .stat-card {
            padding: 25px 15px;
          }
          
          .innovation-content h2 {
            font-size: 1.8rem;
          }
          
          .cta-content h2 {
            font-size: 1.9rem;
          }
          
          .cta-content p {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;