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
    // Executa apenas no mount para evitar loops quando getterFn muda por recriação
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    try {
      const res = getterFn();
      setData(res || []);
      setError('');
    } catch {
      setError('Falha ao carregar');
    }
  };

  return { data, loading, error, refresh };
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
    } catch {
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
    } catch {
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
    } catch {
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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/projetos?all=1`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json?.projects) ? json.projects : []);
      setData(list);
    } catch {
      try {
        setData(adminStore.listProjects());
      } catch {
        setError('Falha ao carregar projetos');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const unsub = realtime.subscribe('projects_changed', () => fetchAll());
    return () => unsub();
  }, []);

  return { data, loading, error, refresh: fetchAll };
}
export const ProjectsRepo = {
  async upsert(p) {
    try {
      if (p.id) {
        const r = await fetch(`/api/projetos/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        if (!r.ok) throw new Error('PUT falhou');
        const json = await r.json();
        realtime.publish('projects_changed', {});
        return { ok: true, project: json.project };
      }
      const r = await fetch(`/api/projetos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      if (!r.ok) throw new Error('POST falhou');
      const json = await r.json();
      realtime.publish('projects_changed', {});
      return { ok: true, project: json.project };
    } catch {
      const res = adminStore.upsertProject(p);
      realtime.publish('projects_changed', {});
      return res;
    }
  },
  async publish(id, visible) {
    return this.upsert({ id, visible });
  },
};

// Desafios
export function useDesafios() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/desafios');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setData(list);
    } catch {
      try {
        const all = adminStore.listDesafios();
        const visiveis = all.filter(d => d.visible && (d.status === 'ativo' || d.status === 'encerrado'));
        // Normaliza para formato público
        setData(visiveis.map(d => ({
          id: d.id,
          name: d.name,
          objective: d.objetivo,
          description: d.descricao || d.objetivo,
          deadline: new Date(Date.now() + (d.prazoDias||0)*24*60*60*1000).toISOString(),
          base_points: d.recompensaPts || 0,
          reward: d.recompensaPts ? `+${d.recompensaPts} pts` : '',
          status: d.status === 'ativo' ? 'active' : (d.status === 'encerrado' ? 'closed' : 'archived'),
          criteria: [],
          delivery_type: 'link',
          visible: !!d.visible,
          difficulty: 'starter',
          tags: [],
          updated_at: new Date().toISOString(),
        })));
      } catch {
        setError('Falha ao carregar desafios');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const unsub = realtime.subscribe('desafios_changed', () => fetchAll());
    return () => unsub();
  }, []);

  return { data, loading, error, refresh: fetchAll };
}
export const DesafiosRepo = {
  async upsert(d) {
    try {
      if (d.id) {
        const r = await fetch(`/api/desafios/${d.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
        if (!r.ok) throw new Error('PUT falhou');
        const json = await r.json();
        realtime.publish('desafios_changed', {});
        return { ok: true, challenge: json.challenge };
      }
      const r = await fetch('/api/desafios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      if (!r.ok) throw new Error('POST falhou');
      const json = await r.json();
      realtime.publish('desafios_changed', {});
      return { ok: true, challenge: json.challenge };
    } catch {
      const res = adminStore.upsertDesafio(d);
      realtime.publish('desafios_changed', {});
      return res;
    }
  },
  async setStatus(id, status) {
    try {
      const r = await fetch(`/api/desafios/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!r.ok) throw new Error('PUT status falhou');
      realtime.publish('desafios_changed', {});
      return { ok: true };
    } catch {
      const res = adminStore.upsertDesafio({ id, status });
      realtime.publish('desafios_changed', {});
      return res;
    }
  },
  async enroll(id, crafter_id) {
    try {
      const r = await fetch(`/api/desafios/${id}/inscrever`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ crafter_id }) });
      const ok = r.ok;
      const json = await r.json().catch(()=>({}));
      if (!ok) throw new Error(json?.error || 'Inscrição falhou');
      realtime.publish('desafios_changed', {});
      return { ok: true, registration: json.registration };
    } catch (e) {
      return { ok: false, error: e.message || 'Falha ao inscrever' };
    }
  },
  async deliver(id, payload) {
    try {
      const r = await fetch(`/api/desafios/${id}/entregar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const ok = r.ok;
      const json = await r.json().catch(()=>({}));
      if (!ok) throw new Error(json?.error || 'Entrega falhou');
      realtime.publish('desafios_changed', {});
      return { ok: true, submission: json.submission };
    } catch (e) {
      return { ok: false, error: e.message || 'Falha ao entregar' };
    }
  },
  async reviewSubmission(id, review) {
    try {
      const r = await fetch(`/api/submissions/${id}/review`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(review) });
      const ok = r.ok;
      const json = await r.json().catch(()=>({}));
      if (!ok) throw new Error(json?.error || 'Review falhou');
      realtime.publish('desafios_changed', {});
      if (json?.submission?.status === 'approved') realtime.publish('ranking_changed', {});
      return { ok: true, submission: json.submission };
    } catch (e) {
      return { ok: false, error: e.message || 'Falha ao revisar' };
    }
  },
};

// Finanças
export function useFinance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/financas`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setData(list);
    } catch {
      try {
        setData(adminStore.listFinance());
      } catch {
        setError('Falha ao carregar finanças');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const unsub = realtime.subscribe('finance_changed', () => fetchAll());
    return () => unsub();
  }, []);

  return { data, loading, error, refresh: fetchAll };
}
export const FinanceRepo = {
  async update(id, patch) {
    try {
      const r = await fetch(`/api/financas/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      if (!r.ok) throw new Error('PUT falhou');
      realtime.publish('finance_changed', { id });
      return { ok: true };
    } catch {
      const res = adminStore.updateFinance(id, patch);
      realtime.publish('finance_changed', { id });
      return res;
    }
  },
  async exportCsv() {
    try {
      const r = await fetch(`/api/financas/export`);
      if (!r.ok) throw new Error('Export falhou');
      const csv = await r.text();
      return csv;
    } catch {
      return adminStore.exportFinanceCsv();
    }
  },
};

// Ranking
export function useRanking() {
  const [data, setData] = useState({ top3: [], all: [], week_ref: '', updated_at: '', updated_by: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRanking = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/ranking', { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const table = Array.isArray(json?.table) ? json.table : [];
      const byId = new Map(table.map(r => [r.crafter_id, r]));
      const top3Src = Array.isArray(json?.top3) ? json.top3 : [];
      const top3 = top3Src
        .slice()
        .sort((a,b)=>a.position-b.position)
        .map(t => ({ id: t.crafter_id, name: byId.get(t.crafter_id)?.name || t.name || 'N/A', points: byId.get(t.crafter_id)?.points || 0, reward: t.reward || '' }));
      const topIds = new Set(top3.map(t=>t.id));
      const all = table
        .slice()
        .sort((a,b)=>b.points-a.points)
        .filter(r => !topIds.has(r.crafter_id))
        .map(r => ({ id: r.crafter_id, name: r.name, points: r.points }));
      setData({ top3, all, week_ref: json.week_ref || '', updated_at: json.updated_at || '', updated_by: json.updated_by || '' });
    } catch {
      // Fallback local
      const rk = adminStore.getRanking();
      setData({ top3: rk.top3, all: rk.all, week_ref: '', updated_at: new Date().toISOString(), updated_by: 'local-fallback' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
    const unsub = realtime.subscribe('ranking_changed', () => { fetchRanking(); });
    return () => unsub();
  }, []);

  return { data, loading, error, refresh: fetchRanking };
}
export const RankingRepo = {
  async updatePoints(id, deltaOrSet) {
    const body = typeof deltaOrSet === 'object' ? deltaOrSet : { delta: deltaOrSet };
    try {
      const r = await fetch(`/api/ranking/points/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('PUT points falhou');
      realtime.publish('ranking_changed', { id });
      return { ok: true };
    } catch {
      // Fallback local
      const res = adminStore.updatePoints(id, body?.delta ?? 0);
      realtime.publish('ranking_changed', { id });
      return res;
    }
  },
  async setTop3(top3) {
    try {
      // Mapear para forma esperada pelo endpoint
      const payload = { top3: top3.map((t, i) => ({ crafter_id: t.id, position: i+1, reward: t.reward || '' })) };
      const r = await fetch('/api/ranking/top3', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('PUT top3 falhou');
      realtime.publish('ranking_changed', {});
      return { ok: true };
    } catch {
      const res = adminStore.setTop3(top3);
      realtime.publish('ranking_changed', {});
      return res;
    }
  },
};

// Logs
export function useLogs() {
  return useList(() => adminStore.listLogs());
}