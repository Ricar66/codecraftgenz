import { projectsCache, ProjectDataValidator } from '../utils/dataCache.js';

/**
 * Serviço de API para gerenciamento de projetos
 * Responsável por todas as chamadas relacionadas a projetos
 */

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_TIMEOUT = 5000; // 5 segundos - reduzido para evitar timeouts longos

/**
 * Classe de erro personalizada para erros da API
 */
class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Função utilitária para fazer requisições HTTP com tratamento de erro
 * @param {string} url - URL da requisição
 * @param {Object} options - Opções da requisição (método, headers, body, etc.)
 * @returns {Promise<Object>} Resposta da API
 */
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new APIError(
        errorData?.message || `HTTP Error: ${response.status}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new APIError('Timeout: A requisição demorou muito para responder', 408);
    }
    
    if (error instanceof APIError) {
      throw error;
    }
    
    // Erro de rede ou outro erro não tratado
    throw new APIError(
      'Erro de conexão: Verifique sua internet e tente novamente',
      0,
      { originalError: error.message }
    );
  }
};

/**
 * Busca todos os projetos com filtros opcionais
 * @param {Object} filters - Filtros para a busca
 * @param {string} filters.status - Status dos projetos (ex: 'active', 'completed', 'paused')
 * @param {number} filters.limit - Limite de resultados
 * @param {number} filters.offset - Offset para paginação
 * @returns {Promise<Object>} Lista de projetos e metadados
 */
export const fetchProjects = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Adiciona filtros à query string
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const url = `${API_BASE_URL}/api/projetos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const data = await fetchWithTimeout(url, {
      method: 'GET',
    });

    return {
      projects: data.data || [],
      total: data.total || 0,
      hasMore: data.hasMore || false,
      ...data
    };
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
    
    return response.projects;
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

    const url = `${API_BASE_URL}/api/projetos/${projectId}`;
    const data = await fetchWithTimeout(url, {
      method: 'GET',
    });

    return data.data || data;
  } catch (error) {
    console.error(`Erro ao buscar projeto ${projectId}:`, error);
    throw error;
  }
};

/**
 * Mock de projetos para desenvolvimento
 * Simula dados reais com informações "Em breve"
 */
export const getMockProjects = () => {
  return [
    {
      id: 1,
      title: 'OverlayCraft',
      status: 'active',
      startDate: '2025-05-26',
      description: 'Um utilitário em C# Windows Forms que exibe, em tempo real, uma sobreposição flutuante (overlay) com informações do sistema — CPU, GPU, RAM, IP, sistema operacional e usuário — funcionando como uma marca d\'água transparente, sempre visível e arrastável pela tela, podendo ser minimizado para a bandeja.',
      progress: 80,
      technology: 'C# Windows Forms',
      category: 'Sistema'
    },
    {
      id: 2,
      title: 'CleanCraft',
      status: 'active',
      startDate: '2025-10-26',
      description: 'CleanCraft é uma aplicação desenvolvida para auxiliar o usuário na organização automática de arquivos presentes em sua área de trabalho, nas pastas pessoais (como Documentos, Imagens, Vídeos e Downloads) ou em qualquer outra pasta escolhida. O sistema identifica e agrupa os arquivos por tipo ou extensão, movendo-os para pastas correspondentes.',
      progress: 0,
      technology: 'C#',
      category: 'Utilitário'
    },
    {
      id: 3,
      title: 'Em breve',
      status: 'active',
      startDate: null,
      description: 'Novo projeto em desenvolvimento. Mais informações serão divulgadas em breve.',
      progress: 0
    },
    {
      id: 4,
      title: 'Em breve',
      status: 'active',
      startDate: null,
      description: 'Novo projeto em desenvolvimento. Mais informações serão divulgadas em breve.',
      progress: 0
    },
    {
      id: 5,
      title: 'Em breve',
      status: 'active',
      startDate: null,
      description: 'Novo projeto em desenvolvimento. Mais informações serão divulgadas em breve.',
      progress: 0
    },
    {
      id: 6,
      title: 'Em breve',
      status: 'active',
      startDate: null,
      description: 'Novo projeto em desenvolvimento. Mais informações serão divulgadas em breve.',
      progress: 0
    }
  ];
};

/**
 * Busca projetos com cache e validação
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
    useCache = true,
    useMockData = false
  } = options;

  // Gera chave de cache
  const cacheKey = projectsCache.generateKey('projects', {
    page, limit, search, status, tags, sortBy, sortOrder, useMockData
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
    let response;
    
    if (useMockData) {
      // Simula delay da rede
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
      
      // Dados mock melhorados
      const mockProjects = getMockProjects();
      
      response = {
        data: mockProjects,
        pagination: {
          page,
          limit,
          total: mockProjects.length,
          totalPages: Math.ceil(mockProjects.length / limit)
        },
        meta: {
          source: 'mock',
          timestamp: new Date().toISOString(),
          cached: false
        }
      };
    } else {
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

      const url = `${API_BASE_URL}/api/projetos`;
      
      // Adiciona filtro de visibilidade se necessário
      if (options.publicOnly) {
        params.append('visivel', 'true');
      }
      
      const finalUrl = `${url}?${params.toString()}`;
      console.log('🌐 URL da requisição:', finalUrl);
      
      const data = await fetchWithTimeout(finalUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // Mapeia campos do SQLite para o formato esperado
      const projects = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.projects) ? data.projects : []);
      console.log('🔍 Dados originais do SQLite:', projects);
      
      const mappedProjects = projects.map(project => ({
        ...project,
        title: project.titulo || project.title,
        description: project.descricao || project.description,
        createdAt: project.created_at || project.createdAt,
        updatedAt: project.updated_at || project.updatedAt,
        startDate: project.data_inicio || project.startDate,
        thumbUrl: project.thumb_url || project.thumbUrl,
        mentorId: project.mentor_id || project.mentorId,
        mentorName: project.mentor_nome || project.mentorName,
        mentorEmail: project.mentor_email || project.mentorEmail
      }));
      
      console.log('🔄 Dados mapeados:', mappedProjects);
      
      response = {
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
    }

    // Valida dados antes de armazenar
    const validation = ProjectDataValidator.validateProjects(response.data);
    
    if (!validation.isValid) {
      console.warn('⚠️ Dados inválidos detectados:', validation.errors);
      
      // Usa apenas projetos válidos se houver alguns
      if (validation.validProjects.length > 0) {
        response.data = validation.validProjects;
        response.meta.validation = {
          hasIssues: true,
          validCount: validation.validProjects.length,
          invalidCount: validation.invalidProjects.length,
          errors: validation.errors
        };
      } else {
        throw new Error('Todos os dados recebidos são inválidos');
      }
    } else {
      response.meta.validation = {
        hasIssues: false,
        validCount: validation.validProjects.length
      };
    }

    // Armazena no cache se válido
    if (useCache && response.data.length > 0) {
      projectsCache.set(cacheKey, response);
      response.meta.cached = true;
    }

    return response;

  } catch (error) {
    console.error('❌ Erro ao buscar projetos:', error);
    
    // Tenta recuperar do cache em caso de erro
    if (useCache) {
      const staleData = projectsCache.get(cacheKey);
      if (staleData) {
        console.log('📦 Usando dados em cache devido ao erro');
        return {
          ...staleData,
          meta: {
            ...staleData.meta,
            stale: true,
            error: error.message
          }
        };
      }
    }
    
    throw error;
  }
};

// Exporta a classe de erro para uso externo
export { APIError };