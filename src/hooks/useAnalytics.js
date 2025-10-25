/**
 * CUSTOM HOOK - ANALYTICS
 * 
 * Hook personalizado para gerenciar eventos de analytics na aplicação.
 * Centraliza o tracking de interações do usuário para análise de comportamento.
 * 
 * Funcionalidades:
 * - Tracking de cliques em botões
 * - Registro de tempo de permanência
 * - Eventos personalizados
 * - Integração com serviços de analytics (Google Analytics, Mixpanel, etc.)
 * 
 * @author CodeCraft Team
 * @version 1.0.0
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Hook para gerenciar eventos de analytics
 * 
 * @returns {Object} Objeto com funções e dados de analytics
 */
export const useAnalytics = () => {
  // Estado para armazenar eventos localmente
  const [events, setEvents] = useState([]);
  const [sessionStartTime] = useState(Date.now());

  /**
   * Registra um evento de analytics
   * 
   * @param {string} eventName - Nome do evento
   * @param {Object} properties - Propriedades adicionais do evento
   * @param {string} category - Categoria do evento (ex: 'button', 'navigation')
   */
  const trackEvent = useCallback((eventName, properties = {}, category = 'general') => {
    const event = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: eventName,
      category,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        sessionTime: Date.now() - sessionStartTime,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      }
    };

    // Adiciona evento ao estado local
    setEvents(prevEvents => [...prevEvents, event]);

    // Log para desenvolvimento
    console.log('📊 Analytics Event:', event);

    // TODO: Integrar com serviço de analytics real
    // Exemplos de integração:
    
    // Google Analytics 4
    // if (typeof gtag !== 'undefined') {
    //   gtag('event', eventName, {
    //     event_category: category,
    //     ...properties
    //   });
    // }

    // Mixpanel
    // if (typeof mixpanel !== 'undefined') {
    //   mixpanel.track(eventName, {
    //     category,
    //     ...properties
    //   });
    // }

    // Facebook Pixel
    // if (typeof fbq !== 'undefined') {
    //   fbq('track', eventName, properties);
    // }

    return event.id;
  }, [sessionStartTime]);

  /**
   * Registra clique em botão
   * 
   * @param {string} buttonName - Nome/ID do botão
   * @param {string} location - Localização do botão na página
   * @param {Object} additionalData - Dados adicionais
   */
  const trackButtonClick = useCallback((buttonName, location, additionalData = {}) => {
    return trackEvent('button_click', {
      button_name: buttonName,
      location,
      ...additionalData
    }, 'interaction');
  }, [trackEvent]);

  /**
   * Registra navegação entre páginas
   * 
   * @param {string} fromPage - Página de origem
   * @param {string} toPage - Página de destino
   */
  const trackPageNavigation = useCallback((fromPage, toPage) => {
    return trackEvent('page_navigation', {
      from_page: fromPage,
      to_page: toPage
    }, 'navigation');
  }, [trackEvent]);

  /**
   * Registra tempo de permanência em uma seção
   * 
   * @param {string} sectionName - Nome da seção
   * @param {number} timeSpent - Tempo gasto em milissegundos
   */
  const trackTimeSpent = useCallback((sectionName, timeSpent) => {
    return trackEvent('time_spent', {
      section: sectionName,
      duration_ms: timeSpent,
      duration_seconds: Math.round(timeSpent / 1000)
    }, 'engagement');
  }, [trackEvent]);

  /**
   * Registra erro ou exceção
   * 
   * @param {string} errorMessage - Mensagem do erro
   * @param {string} errorLocation - Local onde ocorreu o erro
   * @param {Object} errorDetails - Detalhes adicionais do erro
   */
  const trackError = useCallback((errorMessage, errorLocation, errorDetails = {}) => {
    return trackEvent('error_occurred', {
      error_message: errorMessage,
      error_location: errorLocation,
      ...errorDetails
    }, 'error');
  }, [trackEvent]);

  /**
   * Obtém estatísticas da sessão atual
   */
  const getSessionStats = useCallback(() => {
    const currentTime = Date.now();
    const sessionDuration = currentTime - sessionStartTime;
    
    return {
      sessionDuration,
      sessionDurationMinutes: Math.round(sessionDuration / 60000),
      totalEvents: events.length,
      eventsByCategory: events.reduce((acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      }, {}),
      lastEventTime: events.length > 0 ? events[events.length - 1].properties.timestamp : null
    };
  }, [events, sessionStartTime]);

  /**
   * Limpa eventos armazenados localmente
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Effect para registrar início da sessão
  useEffect(() => {
    // Registra início da sessão apenas uma vez
    const sessionEvent = {
      name: 'session_start',
      category: 'session',
      properties: {
        platform: 'web',
        device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        timestamp: new Date().toISOString(),
        sessionTime: 0,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      }
    };

    setEvents(prevEvents => [...prevEvents, sessionEvent]);
    console.log('📊 Analytics Event:', sessionEvent);

    // Registra fim da sessão ao sair da página
    const handleBeforeUnload = () => {
      const stats = getSessionStats();
      console.log('📊 Session End:', stats);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vazio para executar apenas uma vez - evita loop infinito

  // Retorna API do hook
  return {
    // Funções de tracking
    trackEvent,
    trackButtonClick,
    trackPageNavigation,
    trackTimeSpent,
    trackError,
    
    // Dados e estatísticas
    events,
    getSessionStats,
    clearEvents,
    
    // Informações da sessão
    sessionStartTime,
    sessionDuration: Date.now() - sessionStartTime
  };
};