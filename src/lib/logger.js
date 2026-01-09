// src/lib/logger.js
// Sistema de logging centralizado para CodeCraft Gen-Z
// Substitui console.log com controle de ambiente e niveis

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Determina nivel de log baseado no ambiente
const getLogLevel = () => {
  if (import.meta.env.PROD && !import.meta.env.VITE_DEBUG) {
    return LOG_LEVELS.ERROR; // Em producao, so erros
  }
  if (import.meta.env.VITE_DEBUG === 'true') {
    return LOG_LEVELS.DEBUG; // Debug explicitamente habilitado
  }
  return LOG_LEVELS.INFO; // Desenvolvimento padrao
};

const currentLevel = getLogLevel();
const isDev = import.meta.env.DEV;

// Formatador de timestamp
const timestamp = () => new Date().toISOString().slice(11, 23);

// Prefixos coloridos para cada nivel (funciona no DevTools)
const styles = {
  debug: 'color: #6B7280; font-weight: normal',
  info: 'color: #3B82F6; font-weight: normal',
  warn: 'color: #F59E0B; font-weight: bold',
  error: 'color: #EF4444; font-weight: bold',
  success: 'color: #10B981; font-weight: normal',
  api: 'color: #8B5CF6; font-weight: normal'
};

/**
 * Logger centralizado para a aplicacao
 *
 * @example
 * import { logger } from '@/lib/logger';
 *
 * logger.info('Usuario logado', { userId: 123 });
 * logger.error('Falha na requisicao', error);
 * logger.api('GET', '/api/projetos', { status: 200 });
 */
export const logger = {
  /**
   * Log de debug - apenas em desenvolvimento
   */
  debug: (message, ...args) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(`%c[DEBUG ${timestamp()}]`, styles.debug, message, ...args);
    }
  },

  /**
   * Log informativo
   */
  info: (message, ...args) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(`%c[INFO ${timestamp()}]`, styles.info, message, ...args);
    }
  },

  /**
   * Log de aviso
   */
  warn: (message, ...args) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(`%c[WARN ${timestamp()}]`, styles.warn, message, ...args);
    }
  },

  /**
   * Log de erro - sempre exibido exceto em NONE
   */
  error: (message, error = null, ...args) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(`%c[ERROR ${timestamp()}]`, styles.error, message, error, ...args);

      // Em producao, poderia enviar para Sentry/LogRocket aqui
      // if (import.meta.env.PROD) {
      //   sendToErrorTracking(message, error);
      // }
    }
  },

  /**
   * Log de sucesso
   */
  success: (message, ...args) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(`%c[OK ${timestamp()}]`, styles.success, message, ...args);
    }
  },

  /**
   * Log especifico para chamadas de API
   */
  api: (method, endpoint, details = {}) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      const status = details.status || '';
      const duration = details.duration ? `${details.duration}ms` : '';
      const info = [status, duration].filter(Boolean).join(' ');
      console.log(
        `%c[API ${timestamp()}]`,
        styles.api,
        `${method} ${endpoint}`,
        info ? `(${info})` : '',
        details.data ? details.data : ''
      );
    }
  },

  /**
   * Agrupa logs relacionados
   */
  group: (label, fn) => {
    if (isDev) {
      console.group(label);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  },

  /**
   * Agrupa logs colapsados
   */
  groupCollapsed: (label, fn) => {
    if (isDev) {
      console.groupCollapsed(label);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  },

  /**
   * Tabela de dados (util para debugging)
   */
  table: (data, columns) => {
    if (isDev && currentLevel <= LOG_LEVELS.DEBUG) {
      console.table(data, columns);
    }
  },

  /**
   * Medicao de performance
   */
  time: (label) => {
    if (isDev) {
      console.time(label);
    }
  },

  timeEnd: (label) => {
    if (isDev) {
      console.timeEnd(label);
    }
  }
};

// Alias para compatibilidade
export const log = logger;

// Export default
export default logger;
