// src/hooks/useAdminRepo.js
import { useEffect, useState, useCallback } from 'react';

import { apiConfig, apiRequest } from '../lib/apiConfig.js';
import { realtime } from '../lib/realtime';
import * as mentorAPI from '../services/mentorAPI';
import * as projectsAPI from '../services/projectsAPI';
import * as rankingAPI from '../services/rankingAPI';
import * as userAPI from '../services/userAPI';
import { toBoolFlag } from '../utils/hooks';

function useAsyncList(asyncFn, deps = []) {
  const isDebug = (
    import.meta.env.DEV ||
    toBoolFlag(import.meta.env.VITE_DEBUG_ADMIN || '') ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('cc_debug') === '1')
  );
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    if (isDebug) {
      console.log('[AdminRepo:fetch:start]');
    }

    // Em desenvolvimento, permitir carregar usando base local (http://localhost:8080)
    // Sem bloquear quando VITE_API_URL não está definido, desde que exista baseURL
    if (import.meta.env.DEV && !apiConfig.baseURL) {
      setError("Backend não configurado: defina VITE_API_URL ou ajuste a base do servidor.");
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const result = await asyncFn();
      setData(result || []);
      if (isDebug) {
        console.log('[AdminRepo:fetch:ok]', Array.isArray(result) ? result.length : 0);
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados');
      setData([]);
      if (isDebug) {
        console.error('[AdminRepo:fetch:err]', err?.status || 0, err?.message || err);
      }
    } finally {
      setLoading(false);
      if (isDebug) {
        console.log('[AdminRepo:fetch:end]');
      }
    }
  };

  // Chama o carregamento apenas via useEffect para evitar condições de corrida
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh: fetchData };
}

// Users
export function useUsers() {
  const result = useAsyncList(() => userAPI.getUsers());
  const isDebug = (
    import.meta.env.DEV ||
    toBoolFlag(import.meta.env.VITE_DEBUG_ADMIN || '') ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('cc_debug') === '1')
  );
  if (isDebug) {
    console.log('[Admin:Users:init]');
  }
  useEffect(() => {
    const unsub = realtime.subscribe('users_changed', () => {
      if (isDebug) console.log('[Admin:Users:realtime]');
      result.refresh();
    });
    return () => unsub();
  }, [result.refresh]); // eslint-disable-line react-hooks/exhaustive-deps
  return result;
}

export const UsersRepo = {
  async create(u) {
    const res = await userAPI.createUser(u);
    if (res.ok) realtime.publish('users_changed', { users: null });
    return res;
  },
  async update(id, patch) {
    const res = await userAPI.updateUser(id, patch);
    if (res.ok) realtime.publish('users_changed', { users: null });
    return res;
  },
  async toggleStatus(id) {
    const res = await userAPI.toggleUserStatus(id);
    if (res.ok) realtime.publish('users_changed', { users: null });
    return res;
  },
};

// Mentores
export function useMentors() {
  // Normaliza campos do backend (pt-BR) para o frontend (en-US)
  const normalize = (m) => ({
    id: m.id,
    name: m.name ?? m.nome ?? '',
    specialty: m.specialty ?? m.especialidade ?? '',
    bio: m.bio ?? m.descricao ?? '',
    email: m.email ?? '',
    phone: m.phone ?? m.telefone ?? '',
    avatar_url: m.avatar_url ?? m.foto_url ?? m.photo ?? '',
    photo: m.photo ?? '',
    status: m.status ?? 'published',
    visible: m.visible !== false,
    created_at: m.created_at,
    updated_at: m.updated_at,
  });

  const result = useAsyncList(async () => {
    const list = await mentorAPI.getMentors({ all: true });
    return Array.isArray(list) ? list.map(normalize) : [];
  });

  useEffect(() => {
    const unsub = realtime.subscribe('mentors_changed', () => {
      result.refresh();
    });
    return () => unsub();
  }, [result.refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}

export const MentorsRepo = {
  async upsert(m) {
    try {
      // Mapeia campos do formulário para o backend (pt-BR)
      const payload = {
        nome: m.nome ?? m.name,
        especialidade: m.especialidade ?? m.specialty,
        bio: m.bio ?? m.descricao,
        email: m.email,
        telefone: m.telefone ?? m.phone,
        avatar_url: m.avatar_url ?? m.photo ?? '',
        status: m.status ?? 'published',
        visible: m.visible !== false,
      };
      let mentor;
      if (m.id) {
        mentor = await mentorAPI.updateMentor(m.id, payload);
      } else {
        mentor = await mentorAPI.createMentor(payload);
      }
      realtime.publish('mentors_changed', { mentors: null });
      return { ok: true, mentor };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async delete(id) {
    try {
      const removed = await mentorAPI.deleteMentor(id);
      realtime.publish('mentors_changed', { mentors: null });
      return { ok: true, removed };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async toggleVisibility(id) {
    try {
      // Busca o mentor atual para alternar visibilidade
      const mentors = await mentorAPI.getMentors({ all: true });
      const mentor = mentors.find(m => m.id === id);
      if (!mentor) {
        return { ok: false, error: 'Mentor não encontrado' };
      }
      
      const updated = await mentorAPI.updateMentor(id, { visible: !mentor.visible });
      realtime.publish('mentors_changed', { mentors: null });
      return { ok: true, mentor: updated };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // Compatibilidade com chamada existente na UI (recebe objeto inteiro)
  async toggleVisible(m) {
    if (!m || !m.id) return { ok: false, error: 'Mentor inválido' };
    return await this.toggleVisibility(m.id);
  },
};

// Projetos
export function useProjects() {
  const isDebug = (
    import.meta.env.DEV ||
    toBoolFlag(import.meta.env.VITE_DEBUG_ADMIN || '') ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('cc_debug') === '1')
  );
  const result = useAsyncList(async () => {
    // Primeiro tenta como admin (inclui Authorization via apiRequest)
    try {
      if (isDebug) {
        console.log('[Admin:Projects:load] as admin');
      }
      const adminData = await projectsAPI.getAll({ all: '1' });
      const arr = Array.isArray(adminData) ? adminData : [];
      if (isDebug) {
        console.log('[Admin:Projects:adminData]', arr.length);
      }
      // Fallback público se lista vier vazia, para evitar tela em branco
      if (arr.length === 0) {
        if (isDebug) console.log('[Admin:Projects:fallback] admin empty → public');
        const publicData = await projectsAPI.getAll({ visivel: 'true' });
        const pubArr = Array.isArray(publicData) ? publicData : [];
        if (isDebug) console.log('[Admin:Projects:publicData]', pubArr.length);
        return pubArr;
      }
      return arr;
    } catch (err) {
      if (isDebug) {
        console.log('[Admin:Projects:fallback] public', err?.status || 0, err?.message || err);
      }
      const publicData = await projectsAPI.getAll({ visivel: 'true' });
      const arr = Array.isArray(publicData) ? publicData : [];
      if (isDebug) {
        console.log('[Admin:Projects:publicData]', arr.length);
      }
      return arr;
    }
  });

  useEffect(() => {
    const unsub = realtime.subscribe('projects_changed', () => {
      result.refresh();
    });
    return () => unsub();
  }, [result.refresh]); // eslint-disable-line react-hooks/exhaustive-deps


  return result;
}

export const ProjectsRepo = {
  async create(project) {
    try {
      const apiProject = {
        titulo: project.titulo || project.title,
        owner: project.owner,
        descricao: project.descricao || project.description,
        data_inicio: project.data_inicio || project.startDate,
        status: project.status,
        preco: project.preco || project.price,
        progresso: project.progresso || project.progress,
        thumb_url: project.thumb_url,
        tecnologias: project.tags || []
      };

      const saved = await projectsAPI.createProject(apiProject);
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: saved };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async update(id, updates) {
    try {
      const apiUpdates = {
        titulo: updates.titulo || updates.title,
        owner: updates.owner,
        descricao: updates.descricao || updates.description,
        data_inicio: updates.data_inicio || updates.startDate,
        status: updates.status,
        preco: updates.preco || updates.price,
        progresso: updates.progresso || updates.progress,
        thumb_url: updates.thumb_url,
        tecnologias: updates.tags || []
      };

      const updated = await projectsAPI.updateProject(id, apiUpdates);
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: updated };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async delete(id) {
    try {
      const deleted = await projectsAPI.deleteProject(id);
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: deleted };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // Removido: visibilidade baseada em coluna não existente

  async upsert(project) {
    try {
      const isUpdate = !!project.id;
      const apiProject = {
        titulo: project.titulo || project.title,
        owner: project.owner,
        descricao: project.descricao || project.description,
        data_inicio: project.data_inicio || project.startDate,
        status: project.status,
        preco: project.preco || project.price,
        progresso: project.progresso || project.progress,
        thumb_url: project.thumb_url,
        tecnologias: project.tags || []
      };

      const result = isUpdate ? await projectsAPI.updateProject(project.id, apiProject) : await projectsAPI.createProject(apiProject);
      realtime.publish('projects_changed', { projects: null });
      return result;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async toggleVisible(project) {
    try {
      if (!project || !project.id) return { ok: false, error: 'Projeto inválido' };
      const curr = String(project.status || '').toLowerCase();
      const next = (curr === 'rascunho' || curr === 'draft') ? 'ongoing' : 'rascunho';
      const res = await this.update(project.id, { status: next });
      realtime.publish('projects_changed', { projects: null });
      return res;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  
  // Removido: publish baseado em coluna de visibilidade
};

// Ranking
export function useRanking() {
  const result = useAsyncList(() => rankingAPI.getRanking());

  useEffect(() => {
    const unsub = realtime.subscribe('ranking_changed', () => {
      result.refresh();
    });
    return () => unsub();
  }, [result.refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}

export const RankingRepo = {
  async updatePoints(crafterId, options) {
    try {
      const result = await rankingAPI.updateCrafterPoints(crafterId, options);
      realtime.publish('ranking_changed', { ranking: null });
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async updateTop3(top3) {
    try {
      const result = await rankingAPI.updateTop3(top3);
      realtime.publish('ranking_changed', { ranking: null });
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async updateFilters(filters) {
    try {
      const result = await rankingAPI.updateRankingFilters(filters);
      realtime.publish('ranking_changed', { ranking: null });
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

// Crafters
export function useCrafters(options = {}) {
  const [crafters, setCrafters] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  
  const loadCrafters = useCallback(async (searchOptions = {}) => {
    setLoading(true);
    setError(null);

    if (!import.meta.env.VITE_API_URL && import.meta.env.DEV) {
      setError("O backend não está configurado. Defina VITE_API_URL no seu arquivo .env.development para carregar os dados.");
      setCrafters([]);
      setLoading(false);
      return;
    }

    try {
      const finalOptions = { ...options, ...searchOptions };
      const response = await rankingAPI.getCrafters(finalOptions);
      
      if (response.success) {
        setCrafters(response.data || []);
        setPagination(response.pagination || {
          total: 0,
          page: 1,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        });
      } else {
        throw new Error(response.error || 'Erro ao carregar crafters');
      }
    } catch (err) {
      console.error('Erro ao carregar crafters:', err);
      setError(err.message);
      setCrafters([]);
    } finally {
      setLoading(false);
    }
  }, [options]);

  useEffect(() => {
    loadCrafters();
  }, [loadCrafters]);

  useEffect(() => {
    const handleRankingChange = () => {
      loadCrafters();
    };

    realtime.subscribe('ranking_changed', handleRankingChange);
    return () => realtime.unsubscribe('ranking_changed', handleRankingChange);
  }, [loadCrafters]);

  return { 
    crafters, 
    pagination, 
    loading, 
    error, 
    reload: loadCrafters,
    loadPage: (page) => loadCrafters({ page }),
    search: (searchTerm) => loadCrafters({ search: searchTerm, page: 1 })
  };
}

export const CraftersRepo = {
  async create(crafter) {
    try {
      const created = await rankingAPI.createCrafter(crafter);
      realtime.publish('ranking_changed', { ranking: null });
      return { ok: true, crafter: created };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async update(id, updates) {
    try {
      const updated = await rankingAPI.updateCrafter(id, updates);
      realtime.publish('ranking_changed', { ranking: null });
      return { ok: true, crafter: updated };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async delete(id) {
    try {
      const deleted = await rankingAPI.deleteCrafter(id);
      realtime.publish('ranking_changed', { ranking: null });
      return { ok: true, deleted };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

// Desafios
export function useDesafios() {
  return useAsyncList(async () => {
    try {
      const data = await apiRequest('/api/desafios?all=1', { method: 'GET' });
      return data?.data || (Array.isArray(data) ? data : []);
    } catch (err) {
      const isUnauthorized = err && (err.status === 401 || String(err.message || '').includes('401'));
      if (isUnauthorized && !['off','false','0'].includes(String(import.meta.env.VITE_ADMIN_PUBLIC_FALLBACK || 'off').toLowerCase())) {
        // Fallback para visíveis publicamente (param nome pode variar; manter "visible=true" por compatibilidade)
        const pub = await apiRequest('/api/desafios?visible=true', { method: 'GET' });
        return pub?.data || (Array.isArray(pub) ? pub : []);
      }
      throw err;
    }
  });
}

export const DesafiosRepo = {
  async create(desafio) {
    try {
      const data = await apiRequest('/api/desafios', { method: 'POST', body: JSON.stringify(desafio) });
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true, desafio: data.challenge || data.data || data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async update(id, updates) {
    try {
      const data = await apiRequest(`/api/desafios/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true, desafio: data.challenge || data.data || data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async toggleVisibility(id) {
    try {
      const data = await apiRequest(`/api/desafios/${id}/visibility`, { method: 'PUT' });
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true, desafio: data.challenge || data.data || data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async upsert(desafio) {
    try {
      const isUpdate = !!desafio.id;
      const url = isUpdate ? `/api/desafios/${desafio.id}` : '/api/desafios';
      const data = await apiRequest(url, { method: isUpdate ? 'PUT' : 'POST', body: JSON.stringify(desafio) });
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true, desafio: data.challenge || data.data || data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async reviewSubmission(submissionId, review) {
    try {
      const data = await apiRequest(`/api/submissions/${submissionId}/review`, { method:'PUT', body: JSON.stringify(review) });
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true, submission: data.submission || data.data || data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async setStatus(id, status) {
    try {
      await apiRequest(`/api/desafios/${id}/status`, { method:'PUT', body: JSON.stringify({ status }) });
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

// Finanças
export function useFinance() {
  return useAsyncList(async () => {
    const data = await apiRequest('/api/financas', { method: 'GET' });
    return data?.data || (Array.isArray(data) ? data : []);
  });
}

export const FinanceRepo = {
  async update(id, updates) {
    try {
      const response = await fetch(`/api/financas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      realtime.publish('finance_changed', { finance: null });
      return { ok: true, item: data.item };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

// Logs
export function useLogs() {
  return useAsyncList(() => rankingAPI.getRankingAudit());
}
