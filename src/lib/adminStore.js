// src/lib/adminStore.js
// Storage interno simples em localStorage com seeds e operações básicas

const KEY = 'cc_admin_store';
import { realtime } from './realtime';

function nowIso() {
  return new Date().toISOString();
}

function read() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  // publica mudanças relevantes
  realtime.publish('store_changed', { ts: Date.now() });
}

function ensureStore() {
  const existing = read();
  if (existing) return existing;
  const seed = {
    users: [
      { id: 'u1', name: 'Admin', email: 'admin@codecraft.dev', role: 'admin', status: 'active', password: 'Admin!123' },
    ],
    mentors: [
      { id: 'm1', name: 'Ana Silva', specialty: 'Frontend Performance', phone: '(11) 99999-1111', email: 'ana.silva@codecraft.dev', bio: 'Foco em arquitetura front e web vitals.', visible: true, photo: null, status: 'published' },
      { id: 'm2', name: 'Bruno Costa', specialty: 'Backend & Cloud', phone: '(21) 98888-2222', email: 'bruno.costa@codecraft.dev', bio: 'Serviços escaláveis e APIs.', visible: true, photo: null, status: 'published' },
      { id: 'm3', name: 'Carla Mendes', specialty: 'UX Engineering', phone: '(31) 97777-3333', email: 'carla.mendes@codecraft.dev', bio: 'Design Systems e prototipação.', visible: true, photo: null, status: 'published' },
    ],
    mentors_history: [],
    ranking: {
      top3: [
        { id: 'c1', name: 'Crafter 1', points: 180, reward: 'Badge Ouro' },
        { id: 'c2', name: 'Crafter 2', points: 160, reward: 'Badge Prata' },
        { id: 'c3', name: 'Crafter 3', points: 140, reward: 'Badge Bronze' },
      ],
      all: [
        { id: 'c4', name: 'Crafter 4', points: 120 },
        { id: 'c5', name: 'Crafter 5', points: 100 },
        { id: 'c6', name: 'Crafter 6', points: 90 },
      ],
      history: [],
    },
    projects: [
      { id: 'p1', title: 'Site Gen-Z', owner: 'Time Alpha', status: 'ongoing', price: 1500, tags: ['web'], visible: true },
      { id: 'p2', title: 'App Mobile', owner: 'Crafter 2', status: 'ongoing', price: 2300, tags: ['mobile'], visible: true },
      { id: 'p3', title: 'Design System', owner: 'Time Beta', status: 'draft', price: 0, tags: ['design'], visible: false },
    ],
    desafios: [
      { id: 'd1', name: 'API Resiliente', objetivo: 'Circuit breaker', prazoDias: 10, recompensaPts: 300, status: 'ativo', visible: true },
      { id: 'd2', name: 'Refatoração de Performance', objetivo: 'Otimizar TTI', prazoDias: 14, recompensaPts: 200, status: 'encerrado', visible: false },
    ],
    finance: [
      { id: 'f1', item: 'Curso Front', valor: 399, status: 'paid' },
      { id: 'f2', item: 'Desafio API', valor: 0, status: 'scholarship' },
      { id: 'f3', item: 'Projeto Mobile', valor: 2300, status: 'pending' },
      { id: 'f4', item: 'Projeto Web', valor: 1500, status: 'paid' },
      { id: 'f5', item: 'Cupom DEV', valor: -100, status: 'discount' },
    ],
    logs: [
      { id: 'l1', type: 'seed', at: nowIso(), message: 'Seeds iniciais aplicados' },
    ],
    config: { name: 'CodeCraft Gen-Z', primary: '#D12BF2', accent: '#00E4F2' },
  };
  write(seed);
  return seed;
}

export const adminStore = {
  initSeeds() {
    ensureStore();
  },
  get() { return ensureStore(); },
  set(data) { write(data); },
  addLog(type, message) {
    const store = ensureStore();
    store.logs.push({ id: `l${store.logs.length + 1}`, type, at: nowIso(), message });
    write(store);
  },

  // Users
  getUserByEmail(email) {
    const s = ensureStore();
    return s.users.find(u => u.email === email) || null;
  },
  getUserById(id) {
    const s = ensureStore();
    return s.users.find(u => u.id === id) || null;
  },
  verifyCredentials(email, password) {
    const u = this.getUserByEmail(email);
    if (!u) return { ok: false, error: 'Credenciais inválidas' };
    if (u.status !== 'active') return { ok: false, error: 'Usuário inativo' };
    // MOCK: comparação direta por enquanto (fase banco interno)
    if (u.password === password) return { ok: true, user: u };
    return { ok: false, error: 'Credenciais inválidas' };
  },
  listUsers() { return ensureStore().users; },
  exportUsersCsv() {
    const s = ensureStore();
    const cols = ['id','name','email','role','status'];
    const header = cols.join(',');
    const rows = s.users.map(u => cols.map(c => `${String(u[c]).replaceAll(',', '.')}`).join(','));
    return [header, ...rows].join('\n');
  },
  createUser(user) {
    const s = ensureStore();
    if (s.users.some(u => u.email === user.email)) return { ok: false, error: 'E-mail já cadastrado' };
    const newUser = { id: `u${s.users.length + 1}`, status: 'active', role: user.role || 'viewer', ...user };
    s.users.push(newUser);
    this.addLog('create_user', `Usuário criado: ${newUser.email}`);
    write(s);
    return { ok: true, user: newUser };
  },
  updateUser(id, patch) {
    const s = ensureStore();
    const idx = s.users.findIndex(u => u.id === id);
    if (idx === -1) return { ok: false, error: 'Usuário não encontrado' };
    s.users[idx] = { ...s.users[idx], ...patch };
    this.addLog('update_user', `Usuário atualizado: ${s.users[idx].email}`);
    write(s);
    return { ok: true, user: s.users[idx] };
  },

  // Mentores
  listMentors() { return ensureStore().mentors; },
  createMentor(m) {
    const s = ensureStore();
    const required = ['name','specialty','bio'];
    for (const k of required) { if (!m[k] || String(m[k]).trim() === '') return { ok: false, error: `Campo obrigatório: ${k}` }; }
    const nm = { id: `m${s.mentors.length + 1}`, visible: false, status: 'draft', photo: null, phone: '', email: '', ...m };
    s.mentors.push(nm);
    s.mentors_history.push({ id: `mh${s.mentors_history.length + 1}`, type: 'create', at: nowIso(), mentorId: nm.id, after: nm });
    write(s);
    realtime.publish('mentors_changed', { mentors: s.mentors });
    this.addLog('mentor_create', 'Mentor criado');
    return { ok: true, mentor: nm };
  },
  updateMentor(id, patch) {
    const s = ensureStore();
    const idx = s.mentors.findIndex(x => x.id === id);
    if (idx === -1) return { ok: false, error: 'Mentor não encontrado' };
    const before = s.mentors[idx];
    const after = { ...before, ...patch };
    if (!after.name || !after.specialty || !after.bio) return { ok: false, error: 'Campos obrigatórios ausentes' };
    s.mentors[idx] = after;
    s.mentors_history.push({ id: `mh${s.mentors_history.length + 1}`, type: 'update', at: nowIso(), mentorId: id, before, after });
    write(s);
    realtime.publish('mentors_changed', { mentors: s.mentors });
    this.addLog('mentor_update', 'Mentor atualizado');
    return { ok: true, mentor: after };
  },
  deleteMentor(id) {
    const s = ensureStore();
    const idx = s.mentors.findIndex(x => x.id === id);
    if (idx === -1) return { ok: false, error: 'Mentor não encontrado' };
    const before = s.mentors[idx];
    s.mentors.splice(idx,1);
    s.mentors_history.push({ id: `mh${s.mentors_history.length + 1}`, type: 'delete', at: nowIso(), mentorId: id, before });
    write(s);
    realtime.publish('mentors_changed', { mentors: s.mentors });
    this.addLog('mentor_delete', 'Mentor removido');
    return { ok: true };
  },
  undoLastMentorChange(id) {
    const s = ensureStore();
    const entries = s.mentors_history.filter(h => h.mentorId === id);
    const last = entries[entries.length - 1];
    if (!last) return { ok: false, error: 'Sem histórico' };
    if (last.type === 'create') {
      // remove
      s.mentors = s.mentors.filter(m => m.id !== id);
    } else if (last.type === 'update') {
      const idx = s.mentors.findIndex(m => m.id === id);
      if (idx !== -1) s.mentors[idx] = last.before;
    } else if (last.type === 'delete') {
      s.mentors.push(last.before);
    }
    s.mentors_history.push({ id: `mh${s.mentors_history.length + 1}`, type: 'undo', at: nowIso(), mentorId: id });
    write(s);
    realtime.publish('mentors_changed', { mentors: s.mentors });
    this.addLog('mentor_undo', 'Alteração revertida');
    return { ok: true };
  },
  // compatível com chamadas existentes
  upsertMentor(m) {
    if (m.id) return this.updateMentor(m.id, m);
    return this.createMentor(m);
  },

  // Ranking
  getRanking() { return ensureStore().ranking; },
  setTop3(top3) {
    const s = ensureStore();
    if (top3.length !== 3) return { ok: false, error: 'Top 3 deve ter 3 posições' };
    s.ranking.top3 = top3;
    s.ranking.history.push({ at: nowIso(), change: 'top3_update' });
    this.addLog('ranking_update', 'Top 3 atualizado');
    write(s);
    return { ok: true };
  },
  updatePoints(crafterId, delta) {
    const s = ensureStore();
    const list = [...s.ranking.top3, ...s.ranking.all];
    const c = list.find(x => x.id === crafterId);
    if (!c) return { ok: false, error: 'Crafter não encontrado' };
    const before = c.points;
    c.points = Math.max(0, before + delta);
    s.ranking.history.push({ at: nowIso(), crafterId, before, after: c.points, delta });
    this.addLog('score_change', `Pontuação alterada: ${crafterId} ${before}→${c.points}`);
    write(s);
    return { ok: true };
  },

  // Projetos
  listProjects() { return ensureStore().projects; },
  exportProjectsCsv() {
    const s = ensureStore();
    const cols = ['id','title','owner','status','price','visible'];
    const header = cols.join(',');
    const rows = s.projects.map(p => cols.map(c => `${String(p[c]).replaceAll(',', '.')}`).join(','));
    return [header, ...rows].join('\n');
  },
  upsertProject(project) {
    const s = ensureStore();
    const idx = s.projects.findIndex(p => p.id === project.id);
    if (idx === -1) {
      const np = { id: `p${s.projects.length + 1}`, status: 'draft', price: 0, visible: false, ...project };
      s.projects.push(np);
      this.addLog('project_create', `Projeto criado: ${np.title}`);
    } else {
      const before = s.projects[idx];
      s.projects[idx] = { ...before, ...project };
      this.addLog('project_update', `Projeto atualizado: ${s.projects[idx].title}`);
    }
    write(s);
    return { ok: true };
  },
  listDesafios() { return ensureStore().desafios; },
  exportDesafiosCsv() {
    const s = ensureStore();
    const cols = ['id','name','objetivo','prazoDias','recompensaPts','status','visible'];
    const header = cols.join(',');
    const rows = s.desafios.map(d => cols.map(c => `${String(d[c]).replaceAll(',', '.')}`).join(','));
    return [header, ...rows].join('\n');
  },
  upsertDesafio(desafio) {
    const s = ensureStore();
    const idx = s.desafios.findIndex(d => d.id === desafio.id);
    if (idx === -1) {
      const nd = { id: `d${s.desafios.length + 1}`, status: 'ativo', visible: true, recompensaPts: 0, ...desafio };
      s.desafios.push(nd);
      this.addLog('desafio_create', `Desafio criado: ${nd.name}`);
    } else {
      const before = s.desafios[idx];
      s.desafios[idx] = { ...before, ...desafio };
      this.addLog('desafio_update', `Desafio atualizado: ${s.desafios[idx].name}`);
    }
    write(s);
    return { ok: true };
  },
  listFinance() { return ensureStore().finance; },
  updateFinance(id, patch) {
    const s = ensureStore();
    const idx = s.finance.findIndex(f => f.id === id);
    if (idx === -1) return { ok: false, error: 'Registro financeiro não encontrado' };
    s.finance[idx] = { ...s.finance[idx], ...patch };
    this.addLog('finance_update', `Finance atualizado: ${s.finance[idx].item}`);
    write(s);
    return { ok: true };
  },
  exportFinanceCsv() {
    const s = ensureStore();
    const cols = ['id','item','valor','status'];
    const header = cols.join(',');
    const rows = s.finance.map(f => cols.map(c => `${String(f[c]).replaceAll(',', '.')}`).join(','));
    const csv = [header, ...rows].join('\n');
    return csv;
  },
  listLogs() { return ensureStore().logs.slice().reverse(); },
};