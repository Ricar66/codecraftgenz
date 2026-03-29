import { useState, useCallback, useEffect, useRef } from 'react';
import * as analyticsAPI from '../services/analyticsAPI.js';

export const useAnalytics = () => {
  const [events, setEvents] = useState([]);
  const [sessionStartTime] = useState(Date.now());
  const initializedRef = useRef(false);

  const trackEvent = useCallback((eventName, properties = {}, category = 'general') => {
    const event = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: eventName,
      category,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        sessionTime: Date.now() - sessionStartTime,
        url: window.location.href,
        referrer: document.referrer,
      },
    };

    setEvents(prev => [...prev, event]);

    // Envia para o backend via analyticsAPI (com buffer)
    analyticsAPI.trackEvent(eventName, properties, category);

    // Google Analytics 4
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        event_category: category,
        ...properties,
      });
    }

    return event.id;
  }, [sessionStartTime]);

  const trackButtonClick = useCallback((buttonName, location, additionalData = {}) => {
    return trackEvent('button_click', {
      button_name: buttonName,
      location,
      ...additionalData,
    }, 'interaction');
  }, [trackEvent]);

  const trackPageNavigation = useCallback((fromPage, toPage) => {
    return trackEvent('page_navigation', {
      from_page: fromPage,
      to_page: toPage,
    }, 'navigation');
  }, [trackEvent]);

  const trackTimeSpent = useCallback((sectionName, timeSpent) => {
    return trackEvent('time_spent', {
      section: sectionName,
      duration_ms: timeSpent,
      duration_seconds: Math.round(timeSpent / 1000),
    }, 'engagement');
  }, [trackEvent]);

  const trackError = useCallback((errorMessage, errorLocation, errorDetails = {}) => {
    return trackEvent('error_occurred', {
      error_message: errorMessage,
      error_location: errorLocation,
      ...errorDetails,
    }, 'error');
  }, [trackEvent]);

  // ── Novos métodos ─────────────────────────────────────────

  /** Rastreia um passo de funil (compra, crafter, feedback) */
  const trackFunnelStep = useCallback((funnelName, stepName, properties = {}) => {
    return trackEvent(stepName, { funnel: funnelName, ...properties }, funnelName);
  }, [trackEvent]);

  /** Rastreia page view */
  const trackPageView = useCallback((pageName, properties = {}) => {
    return trackEvent('page_view', { page_name: pageName, ...properties }, 'navigation');
  }, [trackEvent]);

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
      lastEventTime: events.length > 0 ? events[events.length - 1].properties.timestamp : null,
    };
  }, [events, sessionStartTime]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Registra inicio da sessao
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    analyticsAPI.trackEvent('session_start', {
      platform: 'web',
      device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
    }, 'session');
  }, []);

  return {
    trackEvent,
    trackButtonClick,
    trackPageNavigation,
    trackTimeSpent,
    trackError,
    trackFunnelStep,
    trackPageView,
    events,
    getSessionStats,
    clearEvents,
    sessionStartTime,
    sessionDuration: Date.now() - sessionStartTime,
  };
};
