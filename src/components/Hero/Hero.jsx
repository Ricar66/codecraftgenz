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

import { useAnalytics } from '../../hooks/useAnalytics';
import Button from '../Button/Button';

import styles from './Hero.module.css';

/**
 * Componente Hero - Banner principal da aplicação
 * 
 * @param {Function} onCrafterClick - Callback para abrir o modal do crafter
 * @returns {JSX.Element} Seção hero com slogan, descrição e CTA
 */
const Hero = ({ onCrafterClick }) => {
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

    // Abre o modal de inscrição para Crafter
    if (onCrafterClick) {
      onCrafterClick();
    }
  };

  return (
    <section 
      className={`${styles.heroWrapper} ${isVisible ? styles.visible : ''}`}
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

        {/* Scroll Indicator */}
        <div
          className={styles.scrollIndicator}
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
          <div className={styles.scrollMouse}>
            <div className={styles.scrollWheel}></div>
          </div>
        </div>

      </div>

      {/* Overlay removido para manter um único fundo na Home */}
    </section>
  );
};

export default Hero;
