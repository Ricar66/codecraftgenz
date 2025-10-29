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
  const listHook = useList(() => adminStore.listMentors());
  // Atualização em tempo real
  useEffect(() => {
    const unsub = realtime.subscribe('mentors_changed', () => {
      listHook.refresh();
    });
    return () => unsub();
  }, []);
  return listHook;
}
export const MentorsRepo = {
  upsert: (m) => adminStore.upsertMentor(m),
  toggleVisible: (m) => adminStore.upsertMentor({ ...m, visible: !m.visible }),
  delete: (id) => adminStore.deleteMentor(id),
  undo: (id) => adminStore.undoLastMentorChange(id),
  getHistory: (id) => adminStore.listMentorHistory(id),
  revertHistory: (historyId) => adminStore.revertMentorHistory(historyId),
  bulkSetStatus: (ids, status) => adminStore.bulkUpdateMentors(ids, { status }),
  bulkSetVisibility: (ids, visible) => adminStore.bulkUpdateMentors(ids, { visible }),
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