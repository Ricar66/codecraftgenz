/**
 * Monitor de Performance para Aplicação React
 * Rastreia métricas de carregamento, renderização e interação
 */

import React from 'react';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = true;
    this.startTime = performance.now();
  }

  /**
   * Inicia medição de uma operação
   */
  startMeasure(name, metadata = {}) {
    if (!this.isEnabled) return;

    const startTime = performance.now();
    this.metrics.set(name, {
      name,
      startTime,
      metadata,
      status: 'running'
    });

    // Marca no Performance API do navegador
    if (performance.mark) {
      performance.mark(`${name}-start`);
    }

    return startTime;
  }

  /**
   * Finaliza medição de uma operação
   */
  endMeasure(name, result = {}) {
    if (!this.isEnabled) return;

    const endTime = performance.now();
    const metric = this.metrics.get(name);

    if (!metric) {
      console.warn(`Métrica '${name}' não foi iniciada`);
      return;
    }

    const duration = endTime - metric.startTime;

    // Atualiza métrica
    this.metrics.set(name, {
      ...metric,
      endTime,
      duration,
      result,
      status: 'completed'
    });

    // Marca no Performance API do navegador
    if (performance.mark && performance.measure) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }

    // Log para métricas importantes
    if (duration > 1000) {
      console.warn(`⚠️ Operação lenta detectada: ${name} (${duration.toFixed(2)}ms)`);
    }

    return duration;
  }

  /**
   * Mede uma função assíncrona
   */
  async measureAsync(name, asyncFn, metadata = {}) {
    this.startMeasure(name, metadata);
    
    try {
      const result = await asyncFn();
      this.endMeasure(name, { success: true, result });
      return result;
    } catch (error) {
      this.endMeasure(name, { success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Mede uma função síncrona
   */
  measureSync(name, syncFn, metadata = {}) {
    this.startMeasure(name, metadata);
    
    try {
      const result = syncFn();
      this.endMeasure(name, { success: true, result });
      return result;
    } catch (error) {
      this.endMeasure(name, { success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Observa mudanças no DOM (Intersection Observer)
   */
  observeElement(element, callback, options = {}) {
    if (!element || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const timing = {
          timestamp: performance.now(),
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio
        };
        
        callback(entry, timing);
      });
    }, options);

    observer.observe(element);
    
    const observerId = `observer-${Date.now()}`;
    this.observers.set(observerId, observer);
    
    return observerId;
  }

  /**
   * Para observação de elemento
   */
  stopObserving(observerId) {
    const observer = this.observers.get(observerId);
    if (observer) {
      observer.disconnect();
      this.observers.delete(observerId);
    }
  }

  /**
   * Coleta métricas do navegador
   */
  getBrowserMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      // Métricas de navegação
      navigation: navigation ? {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.navigationStart,
        firstByte: navigation.responseStart - navigation.requestStart
      } : null,
      
      // Métricas de pintura
      paint: paint.reduce((acc, entry) => {
        acc[entry.name] = entry.startTime;
        return acc;
      }, {}),
      
      // Informações de memória (se disponível)
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null,
      
      // Timing atual
      now: performance.now()
    };
  }

  /**
   * Retorna estatísticas das métricas coletadas
   */
  getStats() {
    const metrics = Array.from(this.metrics.values());
    const completed = metrics.filter(m => m.status === 'completed');
    
    if (completed.length === 0) {
      return {
        total: metrics.length,
        completed: 0,
        running: metrics.length,
        averageDuration: 0,
        slowOperations: []
      };
    }

    const durations = completed.map(m => m.duration);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const slowOperations = completed
      .filter(m => m.duration > 1000)
      .sort((a, b) => b.duration - a.duration);

    return {
      total: metrics.length,
      completed: completed.length,
      running: metrics.length - completed.length,
      averageDuration: Math.round(averageDuration * 100) / 100,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      slowOperations: slowOperations.slice(0, 5), // Top 5 mais lentas
      browserMetrics: this.getBrowserMetrics()
    };
  }

  /**
   * Retorna métricas detalhadas
   */
  getDetailedMetrics() {
    return {
      metrics: Array.from(this.metrics.values()),
      stats: this.getStats(),
      uptime: performance.now() - this.startTime
    };
  }

  /**
   * Limpa todas as métricas
   */
  clear() {
    this.metrics.clear();
    
    // Para todos os observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // Limpa marcas do Performance API
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  }

  /**
   * Ativa/desativa monitoramento
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Exporta métricas para análise
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...this.getDetailedMetrics()
    };
  }
}

/**
 * Hook React para monitoramento de performance
 */
export const usePerformanceMonitor = () => {
  const monitor = React.useRef(new PerformanceMonitor()).current;

  React.useEffect(() => {
    return () => {
      monitor.clear();
    };
  }, [monitor]);

  return {
    startMeasure: monitor.startMeasure.bind(monitor),
    endMeasure: monitor.endMeasure.bind(monitor),
    measureAsync: monitor.measureAsync.bind(monitor),
    measureSync: monitor.measureSync.bind(monitor),
    observeElement: monitor.observeElement.bind(monitor),
    stopObserving: monitor.stopObserving.bind(monitor),
    getStats: monitor.getStats.bind(monitor),
    getDetailedMetrics: monitor.getDetailedMetrics.bind(monitor),
    exportMetrics: monitor.exportMetrics.bind(monitor),
    clear: monitor.clear.bind(monitor),
    setEnabled: monitor.setEnabled.bind(monitor)
  };
};

// Instância global
export const globalPerformanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;