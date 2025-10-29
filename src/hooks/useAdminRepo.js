// src/hooks/useAdminRepo.js
import { useEffect, useState } from 'react';

import { adminStore } from '../lib/adminStore';
import { realtime } from '../lib/realtime';

function useList(getterFn) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setLoading(true);
      const res = getterFn();
      setData(res || []);
      setError('');
    } catch {
      setError('Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, [getterFn]);

  return { data, loading, error, refresh: () => setData(getterFn()) };
}

// Users
export function useUsers() {
  return useList(() => adminStore.listUsers());
}
export const UsersRepo = {
  create: (u) => adminStore.createUser(u),
  update: (id, patch) => adminStore.updateUser(id, patch),
  toggleStatus: (id) => {
    const u = adminStore.getUserById(id);
    if (!u) return { ok: false, error: 'Usuário não encontrado' };
    return adminStore.updateUser(id, { status: u.status === 'active' ? 'inactive' : 'active' });
  },
};

// Mentores
export function useMentors() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/mentores?all=1');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      const normalized = list.map(m => ({ ...m, photo: m.foto_url || m.photo || null }));
      setData(normalized);
    } catch (e) {
      // Fallback: usa adminStore local
      try {
        setData(adminStore.listMentors());
      } catch {
        setError('Falha ao carregar mentores');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const unsub = realtime.subscribe('mentors_changed', () => {
      fetchAll();
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, refresh: fetchAll };
}
export const MentorsRepo = {
  async upsert(m) {
    try {
      if (m.id) {
        const r = await fetch(`/api/mentores/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) });
        if (!r.ok) throw new Error('PUT falhou');
        const json = await r.json();
        realtime.publish('mentors_changed', { mentors: null }); // força refetch
        return { ok: true, mentor: json.mentor };
      }
      const r = await fetch('/api/mentores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) });
      if (!r.ok) throw new Error('POST falhou');
      const json = await r.json();
      realtime.publish('mentors_changed', { mentors: null });
      return { ok: true, mentor: json.mentor };
    } catch (e) {
      // Fallback local
      const res = adminStore.upsertMentor(m);
      return res;
    }
  },
  async toggleVisible(m) {
    return this.upsert({ ...m, visible: !m.visible });
  },
  async delete(id) {
    try {
      const r = await fetch(`/api/mentores/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('DELETE falhou');
      realtime.publish('mentors_changed', { mentors: null });
      return { ok: true };
    } catch (e) {
      const res = adminStore.deleteMentor(id);
      return res;
    }
  },
  // Recursos de histórico permanecem locais por enquanto
  undo: (id) => adminStore.undoLastMentorChange(id),
  getHistory: (id) => adminStore.listMentorHistory(id),
  revertHistory: (historyId) => adminStore.revertMentorHistory(historyId),
  async bulkSetStatus(ids, status) {
    try {
      await Promise.all(ids.map(id => fetch(`/api/mentores/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })));
      realtime.publish('mentors_changed', { mentors: null });
      return { ok: true };
    } catch {
      return adminStore.bulkUpdateMentors(ids, { status });
    }
  },
  async bulkSetVisibility(ids, visible) {
    try {
      await Promise.all(ids.map(id => fetch(`/api/mentores/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visible }) })));
      realtime.publish('mentors_changed', { mentors: null });
      return { ok: true };
    } catch {
      return adminStore.bulkUpdateMentors(ids, { visible });
    }
  },
};

// Projetos
export function useProjects() {
  return useList(() => adminStore.listProjects());
}
export const ProjectsRepo = {
  upsert: (p) => adminStore.upsertProject(p),
  publish: (id, visible) => adminStore.upsertProject({ id, visible }),
};

// Desafios
export function useDesafios() {
  return useList(() => adminStore.listDesafios());
}
export const DesafiosRepo = {
  upsert: (d) => adminStore.upsertDesafio(d),
  setStatus: (id, status) => adminStore.upsertDesafio({ id, status }),
};

// Finanças
export function useFinance() {
  return useList(() => adminStore.listFinance());
}
export const FinanceRepo = {
  update: (id, patch) => adminStore.updateFinance(id, patch),
  exportCsv: () => adminStore.exportFinanceCsv(),
};

// Ranking
export function useRanking() {
  const [data, setData] = useState(adminStore.getRanking());
  const refresh = () => setData(adminStore.getRanking());
  return { data, loading: false, error: '', refresh };
}
export const RankingRepo = {
  updatePoints: (id, delta) => adminStore.updatePoints(id, delta),
  setTop3: (top3) => adminStore.setTop3(top3),
};

// Logs
export function useLogs() {
  return useList(() => adminStore.listLogs());
}