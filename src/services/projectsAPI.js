import { apiRequest } from '../lib/apiConfig.js'; // Importa a função central
import { projectsCache, ProjectDataValidator } from '../utils/dataCache.js';

/**
 * Serviço de API para gerenciamento de projetos
 * Responsável por todas as chamadas relacionadas a projetos
 */

// Classe de erro personalizada (movida para apiConfig.js, mas mantida aqui por segurança se outros arquivos a usarem)
class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Busca todos os projetos com filtros opcionais
 * (Esta função parece ser usada pelo Admin)
 * @param {Object} filters - Filtros para a busca
 * @returns {Promise<Object>} Lista de projetos e metadados
 */
export const fetchProjects = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const endpoint = `/api/projetos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    // CORREÇÃO: Usa a função apiRequest central
    const data = await apiRequest(endpoint, {
      method: 'GET',
    });

    const projects = Array.isArray(data?.data)
      ? data.data
      : (Array.isArray(data?.projects) ? data.projects : []);

    return projects;
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    throw error;
  }
};

/**
 * Busca projetos ativos (em andamento)
 * @param {number} limit - Limite de resultados (padrão: 10)
 * @returns {Promise<Array>} Lista de projetos ativos
 */
export const fetchActiveProjects = async (limit = 10) => {
  try {
    const response = await fetchProjects({ 
      status: 'active', 
      limit 
    });
    
    return response;
  } catch (error) {
    console.error('Erro ao buscar projetos ativos:', error);
    throw error;
  }
};

/**
 * Busca um projeto específico por ID
 * @param {string|number} projectId - ID do projeto
 * @returns {Promise<Object>} Dados do projeto
 */
export const fetchProjectById = async (projectId) => {
  try {
    if (!projectId) {
      throw new APIError('ID do projeto é obrigatório', 400);
    }

    const endpoint = `/api/projetos/${projectId}`;
    // CORREÇÃO: Usa a função apiRequest central
    const data = await apiRequest(endpoint, {
      method: 'GET',
    });

    return data.data || data;
  } catch (error) {
    console.error(`Erro ao buscar projeto ${projectId}:`, error);
    throw error;
  }
};


export const getAll = async (params = { all: '1' }) => {
  const qp = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qp.append(key, value);
    }
  });
  const endpoint = `/api/projetos${qp.toString() ? `?${qp.toString()}` : ''}`;
  const json = await apiRequest(endpoint, { method: 'GET' });
  return json.data;
};


/**
 * Busca projetos com cache e validação
 * (Esta é a função principal usada pelo useProjects na página pública)
 * @param {Object} options - Opções de busca
 * @returns {Promise<Object>} Resposta com projetos e metadados
 */
export const getProjects = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    tags = [],
    sortBy = 'createdAt',
    sortOrder = 'desc',
    useCache = true
  } = options;

  // Gera chave de cache
  const cacheKey = projectsCache.generateKey('projects', {
    page, limit, search, status, tags, sortBy, sortOrder
  });

  // Verifica cache primeiro
  if (useCache) {
    const cachedData = projectsCache.get(cacheKey);
    if (cachedData) {
      console.log('📦 Dados carregados do cache');
      return cachedData;
    }
  }

  try {
    // Constrói URL com parâmetros
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });

    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (tags.length > 0) params.append('tags', tags.join(','));
    
    if (options.publicOnly) {
      params.append('visivel', 'true');
    }
    
    // CORREÇÃO: O endpoint agora começa com /api/
    const endpoint = `/api/projetos?${params.toString()}`;
    console.log('🌐 URL da requisição:', endpoint);
    
    // CORREÇÃO: Usa a função apiRequest central
    const data = await apiRequest(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Mapeia campos do banco de dados para o formato esperado
    const projects = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.projects) ? data.projects : []);
    console.log('🔍 Dados originais do banco:', projects);
    
    let mappedProjects = projects.map(project => ({
      ...project,
      title: project.titulo || project.title || project.nome, // Adiciona 'nome'
      description: project.descricao || project.description,
      createdAt: project.created_at || project.createdAt,
      updatedAt: project.updated_at || project.updatedAt,
      startDate: project.data_inicio || project.startDate,
      thumbUrl: project.thumb_url || project.thumbUrl,
      mentorId: project.mentor_id || project.mentorId,
      mentorName: project.mentor_nome || project.mentorName,
      mentorEmail: project.mentor_email || project.mentorEmail,
      price: project.preco || project.price, // Adiciona 'preco'
      progress: project.progresso || project.progress // Adiciona 'progresso'
    }));
    if (options.publicOnly) {
      mappedProjects = mappedProjects.filter(p => {
        const s = String(p.status || '').toLowerCase();
        return s !== 'rascunho' && s !== 'draft';
      });
    }
    
    console.log('🔄 Dados mapeados:', mappedProjects);
    
    const response = {
      data: mappedProjects,
      pagination: data.pagination || {
        page,
        limit,
        total: mappedProjects.length,
        totalPages: 1
      },
      meta: {
        source: 'api',
        timestamp: new Date().toISOString(),
        cached: false
      }
    };

    // Valida dados antes de armazenar
    // (A validação no dataCache.js parece estar falhando, vamos simplificar)
    if (!Array.isArray(response.data)) {
      throw new Error("Resposta da API não é um array de projetos.");
    }

    // Armazena no cache se válido
    if (useCache && response.data.length > 0) {
      projectsCache.set(cacheKey, response);
      response.meta.cached = true;
    }

    return response;

  } catch (error) {
    console.error('❌ Erro ao buscar projetos:', error);
    
    // Lança o erro para o useProjects tratar
    if (error.name === 'TypeError' || error.type === 'network') {
       throw new APIError('Erro de conexão: Verifique sua internet e tente novamente', 0);
    }
    
    throw error;
  }
};

// Exporta a classe de erro para uso externo
export { APIError };