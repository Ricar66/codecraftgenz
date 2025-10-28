// src/utils/loopPrevention.js

/**
 * Utilitário para prevenção de loops infinitos em hooks e componentes
 */

/**
 * Cria um debouncer para prevenir múltiplas execuções rápidas
 * @param {Function} func - Função a ser executada
 * @param {number} delay - Delay em ms
 * @returns {Function} Função debounced
 */
export const createDebouncer = (func, delay = 300) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * Cria um throttler para limitar execuções por tempo
 * @param {Function} func - Função a ser executada
 * @param {number} limit - Limite em ms
 * @returns {Function} Função throttled
 */
export const createThrottler = (func, limit = 1000) => {
  let inThrottle;
  
  return (...args) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Cria um controlador de execução única para prevenir múltiplas chamadas simultâneas
 * @param {Function} asyncFunc - Função assíncrona
 * @returns {Function} Função controlada
 */
export const createSingleExecution = (asyncFunc) => {
  let isExecuting = false;
  
  return async (...args) => {
    if (isExecuting) {
      console.warn('⚠️ Tentativa de execução múltipla bloqueada');
      return null;
    }
    
    try {
      isExecuting = true;
      return await asyncFunc.apply(this, args);
    } finally {
      isExecuting = false;
    }
  };
};

/**
 * Cria um contador de chamadas para detectar loops
 * @param {Function} func - Função a ser monitorada
 * @param {number} maxCalls - Máximo de chamadas permitidas
 * @param {number} timeWindow - Janela de tempo em ms
 * @returns {Function} Função monitorada
 */
export const createCallCounter = (func, maxCalls = 10, timeWindow = 1000) => {
  const calls = [];
  
  return (...args) => {
    const now = Date.now();
    
    // Remove chamadas antigas da janela de tempo
    while (calls.length > 0 && calls[0] < now - timeWindow) {
      calls.shift();
    }
    
    // Verifica se excedeu o limite
    if (calls.length >= maxCalls) {
      console.error('🚨 Loop infinito detectado! Máximo de chamadas excedido:', {
        calls: calls.length,
        timeWindow,
        maxCalls
      });
      return null;
    }
    
    calls.push(now);
    return func.apply(this, args);
  };
};

/**
 * Cria um monitor de dependências para useEffect
 * @param {string} hookName - Nome do hook para logs
 * @returns {Function} Função de monitoramento
 */
export const createDependencyMonitor = (hookName) => {
  let previousDeps = null;
  
  return (currentDeps) => {
    if (previousDeps) {
      const changes = currentDeps.map((dep, index) => ({
        index,
        previous: previousDeps[index],
        current: dep,
        changed: previousDeps[index] !== dep
      })).filter(change => change.changed);
      
      if (changes.length > 0) {
        console.log(`🔍 ${hookName} - Dependências alteradas:`, changes);
      }
    }
    
    previousDeps = [...currentDeps];
  };
};

/**
 * Wrapper para useCallback que previne recriações desnecessárias
 * @param {Function} callback - Callback function
 * @param {Array} deps - Dependências
 * @param {string} name - Nome para debug
 * @returns {Function} Callback otimizado
 */
export const createStableCallback = (callback, deps, name = 'callback') => {
  const monitor = createDependencyMonitor(`useCallback(${name})`);
  monitor(deps);
  
  return callback;
};

export default {
  createDebouncer,
  createThrottler,
  createSingleExecution,
  createCallCounter,
  createDependencyMonitor,
  createStableCallback
};