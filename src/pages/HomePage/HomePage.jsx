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

      {/* Testimonials Section */}
      <div className="testimonials-section">
        <div className="testimonials-container">
          <div className="section-header">
            <h2>💬 O que nossos clientes dizem</h2>
            <p>Depoimentos reais de empresas que transformaram seus negócios conosco</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <div className="quote-icon">❝</div>
                <p>"O CodeCraft revolucionou nossa abordagem de desenvolvimento. Em 3 meses, nossa produtividade aumentou 300% e a qualidade dos projetos superou todas as expectativas."</p>
                <div className="testimonial-author">
                  <div className="author-info">
                    <h4>Maria Silva</h4>
                    <span>CTO - TechCorp Brasil</span>
                  </div>
                  <div className="company-logo">🏢</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <div className="quote-icon">❝</div>
                <p>"Encontramos talentos excepcionais através do CodeCraft. Nossa startup conseguiu desenvolver um MVP em tempo recorde com uma equipe de crafters altamente qualificados."</p>
                <div className="testimonial-author">
                  <div className="author-info">
                    <h4>João Santos</h4>
                    <span>CEO - InnovaTech</span>
                  </div>
                  <div className="company-logo">🚀</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <div className="quote-icon">❝</div>
                <p>"A mentoria especializada do CodeCraft foi fundamental para o sucesso do nosso projeto. Economizamos meses de desenvolvimento e evitamos erros custosos."</p>
                <div className="testimonial-author">
                  <div className="author-info">
                    <h4>Ana Costa</h4>
                    <span>Diretora de Produto - FinTech Pro</span>
                  </div>
                  <div className="company-logo">💳</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Cases Section */}
      <div className="success-cases-section">
        <div className="success-cases-container">
          <div className="section-header">
            <h2>🏆 Cases de Sucesso</h2>
            <p>Projetos que transformaram negócios e geraram resultados extraordinários</p>
          </div>
          <div className="cases-grid">
            <div className="case-card">
              <div className="case-image">📱</div>
              <div className="case-content">
                <h3>App de Delivery Revolucionário</h3>
                <p>Desenvolvemos um aplicativo de delivery que aumentou as vendas do cliente em 450% no primeiro trimestre.</p>
                <div className="case-metrics">
                  <div className="metric">
                    <span className="metric-number">450%</span>
                    <span className="metric-label">Aumento nas vendas</span>
                  </div>
                  <div className="metric">
                    <span className="metric-number">30 dias</span>
                    <span className="metric-label">Tempo de desenvolvimento</span>
                  </div>
                </div>
                <div className="case-tech">
                  <span className="tech-tag">React Native</span>
                  <span className="tech-tag">Node.js</span>
                  <span className="tech-tag">MongoDB</span>
                </div>
              </div>
            </div>
            <div className="case-card">
              <div className="case-image">🏦</div>
              <div className="case-content">
                <h3>Sistema Bancário Digital</h3>
                <p>Criamos uma plataforma bancária completa que processa mais de 10 mil transações por minuto com segurança máxima.</p>
                <div className="case-metrics">
                  <div className="metric">
                    <span className="metric-number">10k+</span>
                    <span className="metric-label">Transações/min</span>
                  </div>
                  <div className="metric">
                    <span className="metric-number">99.9%</span>
                    <span className="metric-label">Uptime</span>
                  </div>
                </div>
                <div className="case-tech">
                  <span className="tech-tag">Java</span>
                  <span className="tech-tag">Spring Boot</span>
                  <span className="tech-tag">PostgreSQL</span>
                </div>
              </div>
            </div>
            <div className="case-card">
              <div className="case-image">🛒</div>
              <div className="case-content">
                <h3>E-commerce Inteligente</h3>
                <p>Plataforma de e-commerce com IA que aumentou a conversão em 280% através de recomendações personalizadas.</p>
                <div className="case-metrics">
                  <div className="metric">
                    <span className="metric-number">280%</span>
                    <span className="metric-label">Aumento conversão</span>
                  </div>
                  <div className="metric">
                    <span className="metric-number">2M+</span>
                    <span className="metric-label">Usuários ativos</span>
                  </div>
                </div>
                <div className="case-tech">
                  <span className="tech-tag">Vue.js</span>
                  <span className="tech-tag">Python</span>
                  <span className="tech-tag">TensorFlow</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="benefits-section">
        <div className="benefits-container">
          <div className="section-header">
            <h2>🎯 Por que escolher o CodeCraft?</h2>
            <p>Benefícios exclusivos que fazem a diferença no seu negócio</p>
          </div>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">⚡</div>
              <h3>Entrega Rápida</h3>
              <p>Projetos entregues em até 50% menos tempo que a média do mercado, sem comprometer a qualidade.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">💰</div>
              <h3>Custo-Benefício</h3>
              <p>Economia de até 40% nos custos de desenvolvimento comparado a equipes tradicionais.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🔒</div>
              <h3>Segurança Garantida</h3>
              <p>Código auditado, testes automatizados e práticas de segurança de nível enterprise.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📈</div>
              <h3>Escalabilidade</h3>
              <p>Soluções preparadas para crescer com seu negócio, suportando milhões de usuários.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🎓</div>
              <h3>Expertise Comprovada</h3>
              <p>Mentores com experiência em grandes empresas como Google, Microsoft e Amazon.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🔄</div>
              <h3>Suporte Contínuo</h3>
              <p>Acompanhamento pós-entrega com suporte técnico 24/7 e atualizações regulares.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="enhanced-cta-section">
        <div className="enhanced-cta-container">
          <div className="cta-content">
            <div className="cta-badge">🚀 OFERTA LIMITADA</div>
            <h2>Transforme sua ideia em realidade</h2>
            <p>Junte-se a mais de 500+ empresas que já revolucionaram seus negócios conosco. Primeira consultoria GRATUITA!</p>
            <div className="cta-features">
              <div className="cta-feature">
                <span className="feature-check">✅</span>
                <span>Análise gratuita do seu projeto</span>
              </div>
              <div className="cta-feature">
                <span className="feature-check">✅</span>
                <span>Proposta personalizada em 24h</span>
              </div>
              <div className="cta-feature">
                <span className="feature-check">✅</span>
                <span>Garantia de satisfação 100%</span>
              </div>
            </div>
            <div className="cta-buttons">
              <button className="cta-primary" onClick={() => setIsCrafterModalOpen(true)}>
                🚀 Começar Agora - GRÁTIS
              </button>
              <button className="cta-secondary">
                📞 Falar com Especialista
              </button>
            </div>
            <div className="cta-urgency">
              <span>⏰ Apenas 10 vagas disponíveis este mês!</span>
            </div>
          </div>
          <div className="cta-visual">
            <div className="floating-card">
              <div className="card-header">💼 Seu Projeto</div>
              <div className="card-content">
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
                <span>Desenvolvimento em andamento...</span>
              </div>
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

        /* ===== TESTIMONIALS SECTION ===== */
        .testimonials-section {
          padding: 100px 0;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          position: relative;
          z-index: 1;
        }

        .testimonials-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 30px;
          margin-top: 60px;
        }

        .testimonial-card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .testimonial-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #007bff, #d12bf2, #00e4f2);
        }

        .testimonial-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .quote-icon {
          font-size: 3rem;
          color: #007bff;
          margin-bottom: 20px;
          opacity: 0.3;
        }

        .testimonial-content p {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #333;
          margin-bottom: 30px;
          font-style: italic;
        }

        .testimonial-author {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .author-info h4 {
          margin: 0;
          color: #007bff;
          font-size: 1.1rem;
        }

        .author-info span {
          color: #666;
          font-size: 0.9rem;
        }

        .company-logo {
          font-size: 2rem;
        }

        /* ===== SUCCESS CASES SECTION ===== */
        .success-cases-section {
          padding: 100px 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          position: relative;
          z-index: 1;
        }

        .success-cases-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .cases-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 40px;
          margin-top: 60px;
        }

        .case-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 40px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .case-card:hover {
          transform: translateY(-10px);
          background: rgba(255, 255, 255, 0.1);
        }

        .case-image {
          font-size: 4rem;
          text-align: center;
          margin-bottom: 30px;
        }

        .case-content h3 {
          color: #00e4f2;
          margin-bottom: 15px;
          font-size: 1.3rem;
        }

        .case-content p {
          line-height: 1.6;
          margin-bottom: 30px;
          color: #ccc;
        }

        .case-metrics {
          display: flex;
          gap: 30px;
          margin-bottom: 30px;
        }

        .metric {
          text-align: center;
        }

        .metric-number {
          display: block;
          font-size: 2rem;
          font-weight: bold;
          color: #d12bf2;
          margin-bottom: 5px;
        }

        .metric-label {
          font-size: 0.9rem;
          color: #aaa;
        }

        .case-tech {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .tech-tag {
          background: linear-gradient(45deg, #007bff, #00e4f2);
          color: white;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        /* ===== BENEFITS SECTION ===== */
        .benefits-section {
          padding: 100px 0;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          position: relative;
          z-index: 1;
        }

        .benefits-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          margin-top: 60px;
        }

        .benefit-card {
          background: white;
          border-radius: 15px;
          padding: 40px 30px;
          text-align: center;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .benefit-card:hover {
          transform: translateY(-5px);
          border-color: #007bff;
          box-shadow: 0 15px 40px rgba(0, 123, 255, 0.15);
        }

        .benefit-icon {
          font-size: 3rem;
          margin-bottom: 20px;
        }

        .benefit-card h3 {
          color: #333;
          margin-bottom: 15px;
          font-size: 1.2rem;
        }

        .benefit-card p {
          color: #666;
          line-height: 1.6;
        }

        /* ===== ENHANCED CTA SECTION ===== */
        .enhanced-cta-section {
          padding: 100px 0;
          background: linear-gradient(135deg, #007bff 0%, #d12bf2 50%, #00e4f2 100%);
          color: white;
          position: relative;
          z-index: 1;
          overflow: hidden;
        }

        .enhanced-cta-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.3;
        }

        .enhanced-cta-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 60px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .cta-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 20px;
          border-radius: 25px;
          font-size: 0.9rem;
          font-weight: bold;
          margin-bottom: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .cta-content h2 {
          font-size: 3rem;
          margin-bottom: 20px;
          font-weight: bold;
        }

        .cta-content > p {
          font-size: 1.2rem;
          margin-bottom: 40px;
          opacity: 0.9;
        }

        .cta-features {
          margin-bottom: 40px;
        }

        .cta-feature {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
          font-size: 1.1rem;
        }

        .feature-check {
          font-size: 1.2rem;
        }

        .cta-buttons {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
        }

        .cta-primary {
          background: white;
          color: #007bff;
          border: none;
          padding: 18px 40px;
          border-radius: 50px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        }

        .cta-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .cta-secondary {
          background: transparent;
          color: white;
          border: 2px solid white;
          padding: 16px 35px;
          border-radius: 50px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cta-secondary:hover {
          background: white;
          color: #007bff;
        }

        .cta-urgency {
          font-size: 1rem;
          opacity: 0.9;
          animation: pulse 2s infinite;
        }

        .cta-visual {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .floating-card {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 30px;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: float 3s ease-in-out infinite;
          width: 100%;
          max-width: 300px;
        }

        .card-header {
          font-size: 1.2rem;
          font-weight: bold;
          margin-bottom: 20px;
          text-align: center;
        }

        .progress-bar {
          background: rgba(255, 255, 255, 0.2);
          height: 8px;
          border-radius: 4px;
          margin-bottom: 15px;
          overflow: hidden;
        }

        .progress-fill {
          background: linear-gradient(90deg, #00e4f2, #d12bf2);
          height: 100%;
          width: 75%;
          border-radius: 4px;
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes progress {
          0% { width: 0%; }
          100% { width: 75%; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.6; }
        }

        /* ===== RESPONSIVE DESIGN ===== */
        @media (max-width: 768px) {
          .testimonials-grid,
          .cases-grid,
          .benefits-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .enhanced-cta-container {
            grid-template-columns: 1fr;
            gap: 40px;
            text-align: center;
          }

          .cta-content h2 {
            font-size: 2rem;
          }

          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }

          .case-metrics {
            justify-content: center;
          }

          .testimonial-card,
          .case-card,
          .benefit-card {
            padding: 30px 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;