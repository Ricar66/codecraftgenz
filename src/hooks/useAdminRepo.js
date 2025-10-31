// src/hooks/useAdminRepo.js
import { useEffect, useState } from 'react';

import { realtime } from '../lib/realtime';
import * as mentorAPI from '../services/mentorAPI';
import { getProjects } from '../services/projectsAPI';
import * as rankingAPI from '../services/rankingAPI';
import * as userAPI from '../services/userAPI';

function useAsyncList(asyncFn, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
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
  const result = useAsyncList(() => mentorAPI.getMentors({ all: true }));

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
      let mentor;
      if (m.id) {
        mentor = await mentorAPI.updateMentor(m.id, m);
      } else {
        mentor = await mentorAPI.createMentor(m);
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
};

// Projetos
export function useProjects() {
  const result = useAsyncList(() => getProjects({ 
    useMockData: false, 
    useCache: false,
    publicOnly: false // Admin vê todos os projetos
  }).then(response => response.data || []));

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
      const response = await fetch('/api/projetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: data.project };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async update(id, updates) {
    try {
      const response = await fetch(`/api/projetos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: data.project };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async delete(id) {
    try {
      const response = await fetch(`/api/projetos/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: data.project };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async toggleVisibility(id) {
    try {
      // A API de projetos já tem endpoint específico para visibilidade
      const response = await fetch(`/api/projetos/${id}/visibilidade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: data.project };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
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
export function useCrafters() {
  return useAsyncList(() => rankingAPI.getCrafters());
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
};

// Desafios
export function useDesafios() {
  return useAsyncList(async () => {
    const response = await fetch('/api/desafios?all=1');
    if (!response.ok) {
      throw new Error(`Erro ao buscar desafios: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
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
};

// Finanças
export function useFinance() {
  return useAsyncList(async () => {
    const response = await fetch('/api/financas');
    if (!response.ok) {
      throw new Error(`Erro ao buscar finanças: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
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