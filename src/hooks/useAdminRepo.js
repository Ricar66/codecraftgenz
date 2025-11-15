// src/hooks/useAdminRepo.js
import { useEffect, useState, useCallback } from 'react';

import { apiConfig, apiRequest } from '../lib/apiConfig';
import { realtime } from '../lib/realtime';
import * as mentorAPI from '../services/mentorAPI';
import * as rankingAPI from '../services/rankingAPI';
import * as userAPI from '../services/userAPI';

function useAsyncList(asyncFn, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');

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
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh: fetchData };
}

// Users
export function useUsers() {
  return useAsyncList(() => userAPI.getUsers());
}

export const UsersRepo = {
  create: (u) => userAPI.createUser(u),
  update: (id, patch) => userAPI.updateUser(id, patch),
  toggleStatus: (id) => userAPI.toggleUserStatus(id),
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
  const result = useAsyncList(async () => {
    const fbEnabled = !['off','false','0'].includes(String(import.meta.env.VITE_ADMIN_PUBLIC_FALLBACK || 'off').toLowerCase());
    // Primeiro tenta como admin (inclui Authorization via apiRequest)
    try {
      const adminData = await apiRequest(`/api/projetos?all=1`, { method: 'GET' });
      return Array.isArray(adminData?.data) ? adminData.data : (Array.isArray(adminData) ? adminData : []);
    } catch (err) {
      // Se não autenticado, faz fallback para listagem pública
      const isUnauthorized = err && (err.status === 401 || String(err.message || '').includes('401'));
      if (isUnauthorized && fbEnabled) {
        const publicData = await apiRequest(`/api/projetos?visivel=true`, { method: 'GET' });
        return Array.isArray(publicData?.data) ? publicData.data : (Array.isArray(publicData) ? publicData : []);
      }
      throw err;
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
      // Mapear para campos pt-BR esperados pelo backend
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

      const data = await apiRequest(`/api/projetos`, {
        method: 'POST',
        body: JSON.stringify(apiProject)
      });
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: data.project };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async update(id, updates) {
    try {
      // Mapear para campos pt-BR esperados pelo backend
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

      const data = await apiRequest(`/api/projetos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(apiUpdates)
      });
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: data.project };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async delete(id) {
    try {
      const data = await apiRequest(`/api/projetos/${id}`, {
        method: 'DELETE'
      });
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: data.project };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // Removido: visibilidade baseada em coluna não existente

  async upsert(project) {
    try {
      const isUpdate = !!project.id;
      
      // Mapear para campos pt-BR esperados pelo backend
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

      const endpoint = isUpdate ? `/api/projetos/${project.id}` : `/api/projetos`;
      const method = isUpdate ? 'PUT' : 'POST';
      const data = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(apiProject)
      });
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: data.project };
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
      const fbEnabled = !['off','false','0'].includes(String(import.meta.env.VITE_ADMIN_PUBLIC_FALLBACK || 'off').toLowerCase());
      const data = await apiRequest('/api/desafios?all=1', { method: 'GET' });
      return data?.data || (Array.isArray(data) ? data : []);
    } catch (err) {
      const isUnauthorized = err && (err.status === 401 || String(err.message || '').includes('401'));
      if (isUnauthorized && fbEnabled) {
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
      const response = await fetch('/api/desafios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(desafio),
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true, desafio: data.challenge };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async update(id, updates) {
    try {
      const response = await fetch(`/api/desafios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true, desafio: data.challenge };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async toggleVisibility(id) {
    try {
      const response = await fetch(`/api/desafios/${id}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true, desafio: data.challenge };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async upsert(desafio) {
    try {
      const isUpdate = desafio.id;
      const url = isUpdate ? `/api/desafios/${desafio.id}` : '/api/desafios';
      const method = isUpdate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(desafio),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true, desafio: data.challenge };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async reviewSubmission(submissionId, review) {
    try {
      const response = await fetch(`/api/submissions/${submissionId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      realtime.publish('desafios_changed', { desafios: null });
      return { ok: true, submission: data.submission };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async setStatus(id, status) {
    try {
      const response = await fetch(`/api/desafios/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

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