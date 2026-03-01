import { useState, useCallback, useEffect } from 'react';

export const useAnalytics = () => {
  const [events, setEvents] = useState([]);
  const [sessionStartTime] = useState(Date.now());

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

    setEvents(prevEvents => [...prevEvents, event]);

    // Log para desenvolvimento
    console.log('📊 Analytics Event:', event);

    // Google Analytics 4
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        event_category: category,
        ...properties
      });
    }

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

  const trackButtonClick = useCallback((buttonName, location, additionalData = {}) => {
    return trackEvent('button_click', {
      button_name: buttonName,
      location,
      ...additionalData
    }, 'interaction');
  }, [trackEvent]);

  const trackPageNavigation = useCallback((fromPage, toPage) => {
    return trackEvent('page_navigation', {
      from_page: fromPage,
      to_page: toPage
    }, 'navigation');
  }, [trackEvent]);

  const trackTimeSpent = useCallback((sectionName, timeSpent) => {
    return trackEvent('time_spent', {
      section: sectionName,
      duration_ms: timeSpent,
      duration_seconds: Math.round(timeSpent / 1000)
    }, 'engagement');
  }, [trackEvent]);

  const trackError = useCallback((errorMessage, errorLocation, errorDetails = {}) => {
    return trackEvent('error_occurred', {
      error_message: errorMessage,
      error_location: errorLocation,
      ...errorDetails
    }, 'error');
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
      lastEventTime: events.length > 0 ? events[events.length - 1].properties.timestamp : null
    };
  }, [events, sessionStartTime]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Registra inicio da sessao
  useEffect(() => {
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

    const handleBeforeUnload = () => {
      const stats = getSessionStats();
      console.log('📊 Session End:', stats);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    trackEvent,
    trackButtonClick,
    trackPageNavigation,
    trackTimeSpent,
    trackError,
    events,
    getSessionStats,
    clearEvents,
    sessionStartTime,
    sessionDuration: Date.now() - sessionStartTime
  };
};
