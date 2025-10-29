/**
 * COMPONENTE HERO - SEÇÃO PRINCIPAL DA PÁGINA
 * 
 * Este componente representa a seção hero (banner principal) da aplicação CodeCraft.
 * Contém o slogan principal, descrição da plataforma e call-to-action (CTA).
 * 
 * Funcionalidades:
 * - Exibe slogan motivacional para desenvolvedores Gen-Z
 * - Apresenta proposta de valor da plataforma
 * - Botão de conversão para cadastro/login
 * - Background animado com rede de conexões
 * 
 * @author CodeCraft Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import heroBackground from '../../assets/hero-background.svg';
import { useAnalytics } from '../../hooks/useAnalytics';
import Button from '../Button/Button';

import styles from './Hero.module.css';

/**
 * Componente Hero - Banner principal da aplicação
 * 
 * @returns {JSX.Element} Seção hero com slogan, descrição e CTA
 */
const Hero = () => {
  // Estado para controlar animações e interações
  const [isVisible, setIsVisible] = useState(false);
  const [buttonClicks, setButtonClicks] = useState(0);
  
  // Hook personalizado para analytics
  const { trackButtonClick } = useAnalytics();

  /**
   * Effect para animar a entrada do componente
   * Ativa a animação após o componente ser montado
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Manipulador de clique do botão CTA
   * Registra interação do usuário e pode redirecionar para cadastro
   */
  const handleCtaClick = () => {
    const newClickCount = buttonClicks + 1;
    setButtonClicks(newClickCount);
    
    // Registra evento no analytics
    trackButtonClick('cta_quero_ser_crafter', 'hero_section', {
      click_count: newClickCount,
      user_engagement: newClickCount > 1 ? 'high' : 'normal',
      cta_text: 'Quero ser um Crafter'
    });

    // TODO: Implementar redirecionamento para página de cadastro
    // window.location.href = '/cadastro';
    alert(`🚀 Interesse registrado! Clique ${newClickCount}x - Em breve teremos o cadastro!`);
  };

  return (
    <section 
      className={`${styles.heroWrapper} ${isVisible ? styles.visible : ''}`}
      style={{ backgroundImage: `url(${heroBackground})` }}
      aria-label="Seção principal - Banner CodeCraft"
    >
      {/* Container principal do conteúdo */}
      <div className={`${styles.heroContent} container`}>
        
        {/* Área de texto principal */}
        <div className={styles.textArea}>
          {/* Slogan principal - Tom jovem e motivacional */}
          <h1 className={`${styles.slogan} animacao-fade-in`}>
            Programe seu futuro, craftando o agora.
          </h1>
          
          {/* Subtítulo explicativo - Proposta de valor */}
          <p className={`${styles.subtitle} animacao-fade-in`}>
            Conectamos talentos Gen-Z como você às melhores
            oportunidades e desafios do mundo tech.
          </p>
          
          {/* Texto adicional com hashtags Gen-Z */}
          <p className={`${styles.hashtags} animacao-fade-in`}>
            #DevGenZ #CraftandoSonhos #TechOpportunities
          </p>
        </div>
        
        {/* Área de ação */}
        <div className={`${styles.actionArea} animacao-fade-in`}>
          {/* Botão de Call-to-Action principal */}
          <Button 
            onClick={handleCtaClick} 
            variant="secondary"
            className={`${styles.ctaButton} animacao-pulse`}
            aria-label="Cadastrar-se na plataforma CodeCraft"
          >
            🚀 Quero ser um Crafter
          </Button>
          
          {/* Indicador de cliques (apenas para demonstração) */}
          {buttonClicks > 0 && (
            <span className={styles.clickCounter}>
              Interesse demonstrado: {buttonClicks}x
            </span>
          )}
        </div>
        
      </div>
      
      {/* Overlay para melhorar legibilidade do texto */}
      <div className={styles.overlay} aria-hidden="true"></div>
    </section>
  );
};

export default Hero;