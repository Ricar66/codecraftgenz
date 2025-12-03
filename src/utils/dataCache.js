/**
 * Sistema de Cache para Dados da API
 * Implementa cache em memória com TTL e validação de dados
 */

class DataCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutos por padrão
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * Gera chave de cache baseada em parâmetros
   */
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Armazena dados no cache
   */
  set(key, data, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0
    });

    this.stats.sets++;
    this.cleanup(); // Remove entradas expiradas
  }

  /**
   * Recupera dados do cache
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verifica se expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    // Atualiza estatísticas de acesso
    entry.accessCount++;
    this.stats.hits++;
    
    return entry.data;
  }

  /**
   * Verifica se uma chave existe e não expirou
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.evictions++;
      return false;
    }
    
    return true;
  }

  /**
   * Remove entrada específica do cache
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.evictions++;
    }
    return deleted;
  }

  /**
   * Limpa entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    this.stats.evictions += cleaned;
    return cleaned;
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.evictions += size;
    return size;
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests
    };
  }

  /**
   * Retorna informações detalhadas sobre entradas
   */
  getEntries() {
    const entries = [];
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        size: JSON.stringify(entry.data).length,
        age: now - entry.createdAt,
        ttl: entry.expiresAt - now,
        accessCount: entry.accessCount,
        expired: now > entry.expiresAt
      });
    }
    
    return entries.sort((a, b) => b.accessCount - a.accessCount);
  }
}

/**
 * Validador de Dados de Projetos
 */
export class ProjectDataValidator {
  static requiredFields = ['id', 'title', 'description', 'status'];
  static validStatuses = ['active', 'completed', 'paused', 'cancelled', 'ongoing', 'rascunho', 'finalizado'];
  
  /**
   * Valida um projeto individual
   */
  static validateProject(project) {
    const errors = [];
    
    
    
    // Verifica campos obrigatórios
    for (const field of this.requiredFields) {
      if (!project || project[field] === undefined || project[field] === null) {
        errors.push(`Campo obrigatório ausente: ${field}`);
      }
    }
    
    // Validações específicas
    if (project) {
      // ID deve ser string ou número
      if (project.id && typeof project.id !== 'string' && typeof project.id !== 'number') {
        errors.push('ID deve ser string ou número');
      }
      
      // Título deve ser string não vazia
      if (project.title && (typeof project.title !== 'string' || project.title.trim().length === 0)) {
        errors.push('Título deve ser uma string não vazia');
      }
      
      // Status deve ser válido
      if (project.status && !this.validStatuses.includes(project.status)) {
        errors.push(`Status inválido: ${project.status}. Valores válidos: ${this.validStatuses.join(', ')}`);
      }
      
      // Data de criação deve ser válida se presente
      if (project.createdAt && isNaN(new Date(project.createdAt).getTime())) {
        errors.push('Data de criação inválida');
      }
      
      // Tags devem ser array se presente
      if (project.tags && !Array.isArray(project.tags)) {
        errors.push('Tags devem ser um array');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Valida array de projetos
   */
  static validateProjects(projects) {
    if (!Array.isArray(projects)) {
      return {
        isValid: false,
        errors: ['Dados devem ser um array'],
        validProjects: [],
        invalidProjects: []
      };
    }
    
    const validProjects = [];
    const invalidProjects = [];
    const allErrors = [];
    
    projects.forEach((project, index) => {
      const validation = this.validateProject(project);
      
      if (validation.isValid) {
        validProjects.push(project);
      } else {
        invalidProjects.push({
          index,
          project,
          errors: validation.errors
        });
        allErrors.push(`Projeto ${index}: ${validation.errors.join(', ')}`);
      }
    });
    
    return {
      isValid: invalidProjects.length === 0,
      errors: allErrors,
      validProjects,
      invalidProjects,
      stats: {
        total: projects.length,
        valid: validProjects.length,
        invalid: invalidProjects.length,
        validationRate: projects.length > 0 ? (validProjects.length / projects.length) * 100 : 0
      }
    };
  }
  
  /**
   * Sanitiza dados de projeto
   */
  static sanitizeProject(project) {
    if (!project || typeof project !== 'object') {
      return null;
    }
    
    const sanitized = {
      id: project.id,
      title: typeof project.title === 'string' ? project.title.trim() : '',
      description: typeof project.description === 'string' ? project.description.trim() : '',
      status: this.validStatuses.includes(project.status) ? project.status : 'active',
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: project.updatedAt || new Date().toISOString(),
      tags: Array.isArray(project.tags) ? project.tags : [],
      metadata: project.metadata || {}
    };
    
    // Remove campos undefined
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    
    return sanitized;
  }
}

// Instância global do cache
export const projectsCache = new DataCache(10 * 60 * 1000); // 10 minutos

// Cache dedicado para Apps (lista do usuário, hub público, etc.)
export const appsCache = new DataCache(5 * 60 * 1000); // 5 minutos

export default DataCache;
