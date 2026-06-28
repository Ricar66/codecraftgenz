// src/hooks/useAdminRepo.js
import { useEffect, useState } from 'react';

import { apiConfig } from '../lib/apiConfig.js';
import { realtime } from '../lib/realtime';
import { denormalizeProject } from '../utils/normalizers.js';
import * as projectsAPI from '../services/projectsAPI';
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
    if (isDebug) console.log('[AdminRepo:fetch:start]');

    if (import.meta.env.DEV && !apiConfig.baseURL) {
      setError('Backend não configurado: defina VITE_API_URL ou ajuste a base do servidor.');
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const result = await asyncFn();
      setData(result || []);
      if (isDebug) console.log('[AdminRepo:fetch:ok]', Array.isArray(result) ? result.length : 0);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados');
      setData([]);
      if (isDebug) console.error('[AdminRepo:fetch:err]', err?.status || 0, err?.message || err);
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
  const result = useAsyncList(() => userAPI.getUsers());
  useEffect(() => {
    const unsub = realtime.subscribe('users_changed', () => {
      result.refresh();
    });
    return () => unsub();
  }, [result.refresh]); // eslint-disable-line react-hooks/exhaustive-deps
  return result;
}

export const UsersRepo = {
  async create(u) {
    try {
      const user = await userAPI.createUser(u);
      realtime.publish('users_changed', { users: null });
      return { ok: true, data: user };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  async update(id, patch) {
    try {
      const user = await userAPI.updateUser(id, patch);
      realtime.publish('users_changed', { users: null });
      return { ok: true, data: user };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  async toggleStatus(id) {
    try {
      const user = await userAPI.toggleUserStatus(id);
      realtime.publish('users_changed', { users: null });
      return { ok: true, data: user };
    } catch (err) {
      return { ok: false, error: err.message };
    }
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
    try {
      if (isDebug) console.log('[Admin:Projects:load] as admin');
      const adminData = await projectsAPI.getAll({ all: '1' });
      const arr = Array.isArray(adminData) ? adminData : [];
      if (isDebug) console.log('[Admin:Projects:adminData]', arr.length);
      if (arr.length === 0) {
        if (isDebug) console.log('[Admin:Projects:fallback] admin empty → public');
        const publicData = await projectsAPI.getAll({ visivel: 'true' });
        const pubArr = Array.isArray(publicData) ? publicData : [];
        if (isDebug) console.log('[Admin:Projects:publicData]', pubArr.length);
        return pubArr;
      }
      return arr;
    } catch (err) {
      if (isDebug) console.log('[Admin:Projects:fallback] public', err?.status || 0, err?.message || err);
      const publicData = await projectsAPI.getAll({ visivel: 'true' });
      const arr = Array.isArray(publicData) ? publicData : [];
      if (isDebug) console.log('[Admin:Projects:publicData]', arr.length);
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
      const saved = await projectsAPI.createProject(denormalizeProject(project));
      realtime.publish('projects_changed', { projects: null });
      return { ok: true, project: saved };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async update(id, updates) {
    try {
      const updated = await projectsAPI.updateProject(id, denormalizeProject(updates));
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

  async upsert(project) {
    try {
      const isUpdate = !!project.id;
      const result = isUpdate
        ? await projectsAPI.updateProject(project.id, denormalizeProject(project))
        : await projectsAPI.createProject(denormalizeProject(project));
      realtime.publish('projects_changed', { projects: null });
      return result;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

};

// Finanças
export function useFinance() {
  const result = useAsyncList(async () => {
    const { apiRequest } = await import('../lib/apiConfig.js');
    const data = await apiRequest('/api/financas', { method: 'GET' });
    return data?.data || (Array.isArray(data) ? data : []);
  });

  useEffect(() => {
    const unsub = realtime.subscribe('finance_changed', () => {
      result.refresh();
    });
    return () => unsub();
  }, [result.refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}

export const FinanceRepo = {
  async update(id, updates) {
    try {
      const { apiRequest } = await import('../lib/apiConfig.js');
      const data = await apiRequest(`/api/financas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      realtime.publish('finance_changed', { finance: null });
      return { ok: true, item: data?.item || data?.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

// Logs (audit log Crafter removido junto com a vertical de comunidade —
// mantém o hook retornando lista vazia para não quebrar AdminConfig)
export function useLogs() {
  return useAsyncList(async () => []);
}
