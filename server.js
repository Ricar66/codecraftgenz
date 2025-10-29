import path from 'path';
import process from 'process'; // Mantido do seu código
import { fileURLToPath } from 'url';

import compression from 'compression'; // Adicionado de volta para performance
import dotenv from 'dotenv'; // Mantido do seu código
import express from 'express'; // Framework web
import helmet from 'helmet'; // Para segurança básica (headers HTTP)
import sql from 'mssql'; // Biblioteca para conectar ao SQL Server / Azure SQL

// Carregar variáveis de ambiente de um arquivo .env (apenas para desenvolvimento local)
// No Azure, as variáveis são lidas das "Configurações de Aplicativo"
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração da Ligação ao Banco de Dados ---
// CORRIGIDO: Lê os *nomes* das variáveis de ambiente
const dbConfig = {
    server: process.env.DB_SERVER,     // Ex: codecraftgenz.database.windows.net
    database: process.env.DB_DATABASE, // Ex: codecraftgenz
    user: process.env.DB_USER,         // Ex: CloudSA12565d7a
    password: process.env.DB_PASSWORD, // A senha que você definiu no Azure
    options: {
        // Usa a variável NODE_ENV para decidir a encriptação (boa prática!)
        // Lembre-se de definir NODE_ENV = production nas Configurações de Aplicativo do Azure
        encrypt: process.env.NODE_ENV === 'production',
        trustServerCertificate: process.env.NODE_ENV !== 'production' // true para dev local, false para Azure
    },
    pool: { // Configurações do pool de ligações
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Cria uma promessa para o pool de ligações
let poolPromise = sql.connect(dbConfig)
    .then(pool => {
        console.log('✅ Ligado ao Banco de Dados SQL do Azure com sucesso!');
        return pool;
    })
    .catch(err => {
        console.error('### ERRO ao ligar ao Banco de Dados:', err.message);
        console.log('⚠️ Servidor continuará funcionando sem conexão com BD');
        return null;
    });

// --- Configuração do Servidor Express ---
const app = express();
app.set('trust proxy', true); // Necessário para confiar nos headers do proxy do Azure
const PORT = process.env.PORT || 8080;

// --- Middlewares Essenciais ---
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression()); // Compressão para melhor performance
app.use(express.json({ limit: '10mb' })); // Para parsing de JSON com limite

// Middleware para logs de requisições (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// --- ROTAS DA API ---

// --- Mentores (Mock/Local) ---
// Armazenamento em memória com seeds básicos
const mentorsStore = {
  mentors: [
    { id: 'm1', name: 'Ana Silva', specialty: 'Frontend Performance', cargo: 'Senior Frontend Engineer', phone: '(11) 99999-1111', email: 'ana.silva@codecraft.dev', bio: 'Foco em arquitetura front e web vitals.', visible: true, photo: null, status: 'published' },
    { id: 'm2', name: 'Bruno Costa', specialty: 'Backend & Cloud', cargo: 'Principal Backend Engineer', phone: '(21) 98888-2222', email: 'bruno.costa@codecraft.dev', bio: 'Serviços escaláveis e APIs.', visible: true, photo: null, status: 'published' },
    { id: 'm3', name: 'Carla Mendes', specialty: 'UX Engineering', cargo: 'UX Engineer', phone: '(31) 97777-3333', email: 'carla.mendes@codecraft.dev', bio: 'Design Systems e prototipação.', visible: true, photo: null, status: 'published' },
  ]
};

function normalizeMentorInput(body) {
  const m = { ...body };
  // compat: aceitar foto_url e mapear para photo
  if (m.foto_url && !m.photo) m.photo = m.foto_url;
  // defaults
  return {
    id: body.id || null,
    name: String(m.name || '').trim(),
    cargo: m.cargo ? String(m.cargo).trim() : '',
    specialty: String(m.specialty || '').trim(),
    phone: m.phone ? String(m.phone).trim() : '',
    email: m.email ? String(m.email).trim() : '',
    bio: String(m.bio || '').trim(),
    photo: m.photo || null,
    visible: Boolean(m.visible),
    status: m.status || 'draft'
  };
}

function publicMentorView(m) {
  // Ao expor, incluir foto_url para compatibilidade com clientes
  return {
    id: m.id,
    name: m.name,
    cargo: m.cargo || '',
    specialty: m.specialty,
    phone: m.phone || '',
    email: m.email || '',
    bio: m.bio,
    foto_url: m.photo || null,
    visible: !!m.visible,
    status: m.status || 'draft'
  };
}

// GET /api/mentores → retorna mentores; por padrão apenas visíveis. Use ?all=1 para todos
app.get('/api/mentores', (req, res) => {
  const { all } = req.query;
  const list = all === '1' ? mentorsStore.mentors : mentorsStore.mentors.filter(m => !!m.visible);
  const payload = list.map(publicMentorView);
  res.status(200).json({ success: true, data: payload, total: payload.length, timestamp: new Date().toISOString() });
});

// POST /api/mentores → cria novo mentor
app.post('/api/mentores', (req, res) => {
  const input = normalizeMentorInput(req.body || {});
  if (!input.name || !input.specialty || !input.bio) {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios: name, specialty, bio' });
  }
  const id = `m${mentorsStore.mentors.length + 1}`;
  const mentor = { ...input, id };
  mentorsStore.mentors.push(mentor);
  res.status(201).json({ success: true, mentor: publicMentorView(mentor) });
});

// PUT /api/mentores/:id → atualiza mentor
app.put('/api/mentores/:id', (req, res) => {
  const { id } = req.params;
  const idx = mentorsStore.mentors.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Mentor não encontrado' });
  const merged = { ...mentorsStore.mentors[idx], ...normalizeMentorInput(req.body || {}) };
  if (!merged.name || !merged.specialty || !merged.bio) {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios: name, specialty, bio' });
  }
  mentorsStore.mentors[idx] = merged;
  res.status(200).json({ success: true, mentor: publicMentorView(merged) });
});

// DELETE /api/mentores/:id → remove mentor
app.delete('/api/mentores/:id', (req, res) => {
  const { id } = req.params;
  const idx = mentorsStore.mentors.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Mentor não encontrado' });
  const [removed] = mentorsStore.mentors.splice(idx, 1);
  res.status(200).json({ success: true, removed: publicMentorView(removed) });
});

// --- Projetos (Admin/Public, Mock/Local) ---
const projetosStore = {
  projetos: [
    { id: 'p1', title: 'Site Gen-Z', owner: 'Time Alpha', status: 'ongoing', price: 1500, tags: ['web'], visible: true, progress: 65, startDate: new Date(Date.now() - 15*24*60*60*1000).toISOString(), description: 'Site institucional com design system e landing pages.' },
    { id: 'p2', title: 'App Mobile', owner: 'Crafter 2', status: 'ongoing', price: 2300, tags: ['mobile'], visible: true, progress: 30, startDate: new Date(Date.now() - 5*24*60*60*1000).toISOString(), description: 'Aplicativo móvel para gestão de tarefas.' },
    { id: 'p3', title: 'Design System', owner: 'Time Beta', status: 'draft', price: 0, tags: ['design'], visible: false, progress: 0, startDate: null, description: 'Biblioteca de componentes e tokens.' },
  ],
};

function normalizeProjetoInput(body) {
  const b = { ...body };
  return {
    id: b.id || null,
    title: String(b.title || '').trim(),
    owner: String(b.owner || '').trim(),
    status: b.status || 'draft', // valores: draft | ongoing | concluído | pausado
    price: Number(b.price || 0),
    tags: Array.isArray(b.tags) ? b.tags : [],
    visible: Boolean(b.visible),
    progress: typeof b.progress === 'number' ? Math.max(0, Math.min(100, b.progress)) : 0,
    startDate: b.startDate || null,
    description: String(b.description || '').trim(),
  };
}

function publicProjetoView(p) {
  // Mapeia status para rótulos amigáveis do card público
  const statusLabel = (() => {
    const s = String(p.status || '').toLowerCase();
    if (s === 'ongoing' || s === 'andamento') return 'Em andamento';
    if (s === 'concluído' || s === 'concluido' || s === 'completed') return 'Concluído';
    if (s === 'pausado' || s === 'paused') return 'Pausado';
    return '—';
  })();
  return {
    id: p.id,
    title: p.title,
    status: statusLabel,
    startDate: p.startDate,
    description: p.description || `${p.title} por ${p.owner}`,
    progress: typeof p.progress === 'number' ? p.progress : 0,
  };
}

// GET /api/projetos → lista de projetos; por padrão públicos (visíveis e não draft). Use ?all=1 para admin.
app.get('/api/projetos', (req, res) => {
  const { all, status, visivel, periodo } = req.query;
  let list = projetosStore.projetos.slice();
  // filtros opcionais
  if (status) {
    const s = String(status).toLowerCase();
    list = list.filter(p => {
      const ps = String(p.status || '').toLowerCase();
      if (s === 'ongoing' || s === 'andamento') return ps === 'ongoing' || ps === 'andamento';
      if (s === 'finalizado' || s === 'concluído' || s === 'concluido' || s === 'completed') return ps === 'concluído' || ps === 'concluido' || ps === 'completed';
      if (s === 'rascunho' || s === 'draft') return ps === 'draft' || ps === 'rascunho';
      return true;
    });
  }
  if (visivel !== undefined) {
    const v = visivel === 'true';
    list = list.filter(p => !!p.visible === v);
  }
  if (periodo) {
    const days = String(periodo).endsWith('d') ? Number(String(periodo).replace('d','')) : null;
    if (days) {
      const now = new Date();
      const from = new Date(now.getTime() - days*24*60*60*1000);
      list = list.filter(p => p.startDate && new Date(p.startDate) >= from && new Date(p.startDate) <= now);
    }
  }
  if (all === '1') {
    return res.status(200).json({ success: true, data: list, total: list.length, timestamp: new Date().toISOString() });
  }
  const visiveis = list.filter(p => !!p.visible && String(p.status).toLowerCase() !== 'draft');
  const payload = visiveis.map(publicProjetoView);
  res.status(200).json({ success: true, data: payload, total: payload.length, timestamp: new Date().toISOString() });
});

// POST /api/projetos → cria projeto (admin)
app.post('/api/projetos', (req, res) => {
  const input = normalizeProjetoInput(req.body || {});
  if (!input.title) return res.status(400).json({ success: false, error: 'Campo obrigatório: title' });
  const id = `p${projetosStore.projetos.length + 1}`;
  const novo = { ...input, id };
  // default startDate
  if (!novo.startDate && novo.status !== 'draft') novo.startDate = new Date().toISOString();
  projetosStore.projetos.push(novo);
  // cria registro financeiro vinculado
  const fid = `f${financasStore.itens.length + 1}`;
  const fin = {
    id: fid,
    item: `Projeto ${novo.title}`,
    valor: Number(novo.price || 0),
    status: 'pending',
    type: 'project',
    progress: Number(novo.progress || 0),
    project_id: id,
    date: new Date().toISOString(),
  };
  financasStore.itens.push(fin);
  res.status(201).json({ success: true, project: novo, finance: fin });
});

// PUT /api/projetos/:id → atualiza projeto (admin)
app.put('/api/projetos/:id', (req, res) => {
  const { id } = req.params;
  const idx = projetosStore.projetos.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
  const merged = { ...projetosStore.projetos[idx], ...normalizeProjetoInput(req.body || {}) };
  if (!merged.title) return res.status(400).json({ success: false, error: 'Campo obrigatório: title' });
  // normaliza progresso e aplica regra de finalização automática
  merged.progress = Math.max(0, Math.min(100, Number(merged.progress || 0)));
  if (merged.progress === 100) merged.status = 'concluído';
  projetosStore.projetos[idx] = merged;
  // sincroniza finanças vinculadas
  const fidx = financasStore.itens.findIndex(f => f.project_id === id);
  if (fidx !== -1) {
    financasStore.itens[fidx] = {
      ...financasStore.itens[fidx],
      valor: Number(merged.price || financasStore.itens[fidx].valor || 0),
      progress: Number(merged.progress || 0),
      item: `Projeto ${merged.title}`,
      date: new Date().toISOString(),
    };
  } else {
    const fid = `f${financasStore.itens.length + 1}`;
    financasStore.itens.push({ id: fid, item: `Projeto ${merged.title}`, valor: Number(merged.price || 0), status: 'pending', type: 'project', progress: Number(merged.progress || 0), project_id: id, date: new Date().toISOString() });
  }
  res.status(200).json({ success: true, project: merged });
});

// GET /api/projetos/:id → detalhes
app.get('/api/projetos/:id', (req, res) => {
  const { id } = req.params;
  const p = projetosStore.projetos.find(x => x.id === id);
  if (!p) return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
  res.status(200).json({ success: true, project: p });
});

// --- Finanças (Admin, Mock/Local) ---
const financasStore = {
  itens: [
    { id: 'f1', item: 'Curso Front', valor: 399, status: 'paid', date: new Date('2025-06-10').toISOString(), type: 'course' },
    { id: 'f2', item: 'Desafio API', valor: 0, status: 'scholarship', date: new Date('2025-06-20').toISOString(), type: 'challenge' },
    { id: 'f3', item: 'Projeto Mobile', valor: 2300, status: 'pending', date: new Date('2025-09-05').toISOString(), type: 'project', project_id: 'p2', progress: 30 },
    { id: 'f4', item: 'Projeto Web', valor: 1500, status: 'paid', date: new Date('2025-08-15').toISOString(), type: 'project', project_id: 'p1', progress: 65 },
    { id: 'f5', item: 'Cupom DEV', valor: -100, status: 'discount', date: new Date('2025-07-01').toISOString(), type: 'discount' },
  ],
};

app.get('/api/financas', (req, res) => {
  const list = financasStore.itens.slice();
  res.status(200).json({ success: true, data: list, total: list.length, timestamp: new Date().toISOString() });
});

app.put('/api/financas/:id', (req, res) => {
  const { id } = req.params;
  const idx = financasStore.itens.findIndex(f => f.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Registro financeiro não encontrado' });
  const patch = req.body || {};
  const next = { ...financasStore.itens[idx], ...patch };
  next.valor = Number(next.valor || 0);
  next.progress = Math.max(0, Math.min(100, Number(next.progress || 0)));
  next.date = new Date().toISOString();
  financasStore.itens[idx] = next;
  // sincroniza com projeto vinculado (bidirecional)
  if (next.type === 'project' && next.project_id) {
    const pidx = projetosStore.projetos.findIndex(p => p.id === next.project_id);
    if (pidx !== -1) {
      const proj = { ...projetosStore.projetos[pidx] };
      if (patch.valor !== undefined) proj.price = Number(next.valor);
      if (patch.progress !== undefined) proj.progress = Number(next.progress);
      if (proj.progress === 100) proj.status = 'concluído';
      projetosStore.projetos[pidx] = proj;
    }
  }
  res.status(200).json({ success: true, item: financasStore.itens[idx] });
});

app.get('/api/financas/export', (req, res) => {
  const cols = ['id','item','valor','status'];
  const header = cols.join(',');
  const rows = financasStore.itens.map(f => cols.map(c => String(f[c]).replaceAll(',', '.')).join(','));
  const csv = [header, ...rows].join('\n');
  res.header('Content-Type', 'text/csv');
  res.status(200).send(csv);
});

// --- Dashboard resumo ---
app.get('/api/dashboard/resumo', (req, res) => {
  const { periodo = '30d' } = req.query;

  // Calcula janela de tempo
  const now = new Date();
  const days = String(periodo).endsWith('d') ? Number(String(periodo).replace('d','')) : 30;
  const from = new Date(now.getTime() - days*24*60*60*1000);

  // Filtra projetos por período (usa startDate)
  const projetosPeriodo = projetosStore.projetos.filter(p => {
    if (!p.startDate) return false;
    const dt = new Date(p.startDate);
    return dt >= from && dt <= now;
  });

  // Contagens de status
  const toLower = (s) => String(s || '').toLowerCase();
  const countByStatus = (status) => projetosPeriodo.filter(p => toLower(p.status) === status || (status==='ongoing' && toLower(p.status)==='andamento') || (status==='completed' && (toLower(p.status)==='concluído' || toLower(p.status)==='concluido')) || (status==='draft' && toLower(p.status)==='rascunho')).length;
  const ativos = countByStatus('ongoing');
  const finalizados = countByStatus('completed');
  const rascunhos = countByStatus('draft');

  // Progresso médio
  const mediaProgresso = projetosPeriodo.length > 0 ? Math.round(projetosPeriodo.reduce((acc, p) => acc + Number(p.progress || 0), 0) / projetosPeriodo.length) : 0;

  // Finanças por período
  const financasPeriodo = financasStore.itens.filter(f => {
    const dt = new Date(f.date || now);
    return dt >= from && dt <= now;
  });
  const soma = (filterFn) => financasPeriodo.filter(filterFn).reduce((acc, f) => acc + Number(f.valor || 0), 0);
  const receitaTotal = soma(() => true);
  const receitaPaga = soma(f => f.status === 'paid');
  const receitaPendente = soma(f => f.status === 'pending');
  const descontos = soma(f => f.status === 'discount');

  // Evolução mensal (últimos 4 meses)
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const evolucao_mensal = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const valorMes = financasStore.itens
      .filter(f => new Date(f.date || now) >= start && new Date(f.date || now) < end)
      .reduce((acc, f) => acc + Number(f.valor || 0), 0);
    evolucao_mensal.push({ mes: monthNames[d.getMonth()], valor: valorMes });
  }

  const payload = {
    totais: {
      projetos_ativos: ativos,
      projetos_finalizados: finalizados,
      projetos_rascunho: rascunhos,
      receita_total: receitaTotal,
      receita_pendente: receitaPendente,
      receita_paga: receitaPaga,
      media_progresso: mediaProgresso,
      receita_liquida: receitaTotal - descontos,
      descontos: descontos,
    },
    evolucao_mensal,
  };

  res.status(200).json(payload);
});

// --- Ranking (Mock/Local) ---
function currentWeekRef() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(),0,1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay()+1)/7);
  const weekStr = String(week).padStart(2,'0');
  return `${d.getFullYear()}-${weekStr}`;
}

const rankingStore = {
  week_ref: currentWeekRef(),
  crafters: [
    { id: 'c1', name: 'Lívia Rocha', points: 920, avatar: null },
    { id: 'c2', name: 'Kaique Ramos', points: 1000, avatar: null },
    { id: 'c3', name: 'Diego Martins', points: 870, avatar: null },
    { id: 'c4', name: 'Nina', points: 840, avatar: null },
    { id: 'c5', name: 'Rafa', points: 820, avatar: null },
    { id: 'c6', name: 'João', points: 800, avatar: null },
  ],
  top3: [
    { crafter_id: 'c2', position: 1, reward: 'Badge Ouro' },
    { crafter_id: 'c1', position: 2, reward: 'Badge Prata' },
    { crafter_id: 'c3', position: 3, reward: 'Badge Bronze' },
  ],
  updated_at: new Date().toISOString(),
  updated_by: 'seed',
  history: [],
};

function getRankingPayload() {
  const table = rankingStore.crafters
    .slice()
    .sort((a,b)=>b.points-a.points)
    .map(c => ({ crafter_id: c.id, name: c.name, points: c.points, last_update: rankingStore.updated_at }));
  // Enriquecer top3 com nome/points se faltar
  const byId = new Map(rankingStore.crafters.map(c => [c.id, c]));
  const top3 = rankingStore.top3
    .slice()
    .sort((a,b)=>a.position-b.position)
    .map(t => ({ ...t, name: byId.get(t.crafter_id)?.name || 'N/A', points: byId.get(t.crafter_id)?.points || 0 }));
  return {
    week_ref: rankingStore.week_ref,
    top3,
    table,
    updated_at: rankingStore.updated_at,
    updated_by: rankingStore.updated_by,
  };
}

app.get('/api/ranking', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.status(200).json(getRankingPayload());
});

app.put('/api/ranking/points/:crafter_id', (req, res) => {
  const { crafter_id } = req.params;
  const { delta, set } = req.body || {};
  const idx = rankingStore.crafters.findIndex(c => c.id === crafter_id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Crafter não encontrado' });
  const before = rankingStore.crafters[idx].points;
  let next = before;
  if (typeof set === 'number') next = set;
  else if (typeof delta === 'number') next = before + delta;
  next = Math.max(0, Number(next));
  rankingStore.crafters[idx].points = next;
  rankingStore.updated_at = new Date().toISOString();
  rankingStore.updated_by = req.headers['x-user-id'] || 'local-admin';
  rankingStore.history.push({ at: rankingStore.updated_at, actor: rankingStore.updated_by, action: 'score_change', crafter_id, before, after: next, diff: next-before });
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true });
});

app.put('/api/ranking/top3', (req, res) => {
  const body = req.body || {};
  const arr = Array.isArray(body.top3) ? body.top3 : [];
  if (arr.length !== 3) return res.status(400).json({ success: false, error: 'Top 3 deve conter três entradas' });
  const positions = new Set(arr.map(x => x.position));
  const ids = new Set(arr.map(x => x.crafter_id));
  if (!(positions.has(1) && positions.has(2) && positions.has(3))) return res.status(400).json({ success: false, error: 'Posições inválidas: 1,2,3 obrigatórias' });
  if (ids.size !== 3) return res.status(400).json({ success: false, error: 'Top 3 deve conter crafters distintos' });
  // Validar se crafter existe
  for (const x of arr) {
    if (!rankingStore.crafters.find(c => c.id === x.crafter_id)) return res.status(404).json({ success: false, error: `Crafter inexistente: ${x.crafter_id}` });
  }
  rankingStore.top3 = arr.map(x => ({ crafter_id: x.crafter_id, position: x.position, reward: x.reward || '' }));
  rankingStore.updated_at = new Date().toISOString();
  rankingStore.updated_by = req.headers['x-user-id'] || 'local-admin';
  rankingStore.history.push({ at: rankingStore.updated_at, actor: rankingStore.updated_by, action: 'top3_update' });
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true });
});

// --- Desafios (Mock/Local) ---
function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const desafiosStore = {
  challenges: [
    { id: 'd1', name: 'API Resiliente', objective: 'Implementar Circuit Breaker e Retry com backoff', description: 'Projete uma API resiliente sob falhas.\nInclua métricas e fallback.', deadline: addDays(7), base_points: 300, reward: 'Badge Resilience', status: 'active', criteria: ['inovacao','execucao','apresentacao'], delivery_type: 'github', visible: true, difficulty: 'intermediate', tags: ['web','ia'], created_by: 'u1', updated_at: new Date().toISOString() },
    { id: 'd2', name: 'Refatoração de Performance', objective: 'Otimizar TTI e eliminiar layout thrashing', description: 'Escolha um projeto e reduza tempo interativo.', deadline: addDays(10), base_points: 200, reward: 'Badge Performance', status: 'active', criteria: ['execucao','apresentacao'], delivery_type: 'link', visible: true, difficulty: 'starter', tags: ['web'], created_by: 'u1', updated_at: new Date().toISOString() },
    { id: 'd3', name: 'Sistema de Design', objective: 'Crie um DS com tokens e docs', description: 'Documente princípios, tokens e componentes.', deadline: addDays(-2), base_points: 250, reward: 'Badge Designer', status: 'archived', criteria: ['inovacao','apresentacao'], delivery_type: 'file', visible: false, difficulty: 'pro', tags: ['design'], created_by: 'u1', updated_at: new Date().toISOString() },
  ],
  submissions: [],
  registrations: [],
  logs: [],
};

function publicChallenge(c) {
  return {
    id: c.id,
    name: c.name,
    objective: c.objective,
    description: c.description,
    deadline: c.deadline,
    base_points: c.base_points,
    reward: c.reward,
    status: c.status,
    criteria: c.criteria,
    delivery_type: c.delivery_type,
    visible: !!c.visible,
    difficulty: c.difficulty,
    tags: c.tags,
    updated_at: c.updated_at,
  };
}

function isDeadlinePassed(deadlineIso) {
  try { return new Date(deadlineIso).getTime() < Date.now(); } catch { return false; }
}

app.get('/api/desafios', (req, res) => {
  const { status } = req.query;
  let list = desafiosStore.challenges.filter(c => !!c.visible);
  if (status) {
    list = list.filter(c => c.status === status);
  } else {
    list = list.filter(c => c.status === 'active');
  }
  res.set('Cache-Control', 'public, max-age=60');
  res.status(200).json({ success: true, data: list.map(publicChallenge), total: list.length });
});

app.get('/api/desafios/:id', (req, res) => {
  const c = desafiosStore.challenges.find(x => x.id === req.params.id);
  if (!c || !c.visible) return res.status(404).json({ success: false, error: 'Desafio não encontrado' });
  res.set('Cache-Control', 'public, max-age=60');
  res.status(200).json({ success: true, challenge: publicChallenge(c) });
});

app.post('/api/desafios', (req, res) => {
  const body = req.body || {};
  const required = ['name','objective','deadline','delivery_type'];
  for (const k of required) { if (!body[k]) return res.status(400).json({ success:false, error:`Campo obrigatório: ${k}` }); }
  const id = `d${desafiosStore.challenges.length + 1}`;
  const c = {
    id,
    name: String(body.name).trim(),
    objective: String(body.objective).trim(),
    description: String(body.description || '').trim(),
    deadline: body.deadline,
    base_points: Math.max(0, Number(body.base_points || 0)),
    reward: String(body.reward || '').trim(),
    status: body.status || 'active',
    criteria: Array.isArray(body.criteria) ? body.criteria : [],
    delivery_type: body.delivery_type,
    visible: Boolean(body.visible),
    difficulty: body.difficulty || 'starter',
    tags: Array.isArray(body.tags) ? body.tags : [],
    created_by: req.headers['x-user-id'] || 'local-admin',
    updated_at: new Date().toISOString(),
  };
  desafiosStore.challenges.push(c);
  desafiosStore.logs.push({ id: `lg${desafiosStore.logs.length+1}`, type: 'create', at: c.updated_at, actor: c.created_by, challenge_id: id });
  res.set('Cache-Control', 'no-store');
  res.status(201).json({ success: true, challenge: publicChallenge(c) });
});

app.put('/api/desafios/:id', (req, res) => {
  const idx = desafiosStore.challenges.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success:false, error:'Desafio não encontrado' });
  const before = desafiosStore.challenges[idx];
  const patch = req.body || {};
  const next = { ...before, ...patch, base_points: Math.max(0, Number(patch.base_points ?? before.base_points)), updated_at: new Date().toISOString() };
  desafiosStore.challenges[idx] = next;
  desafiosStore.logs.push({ id: `lg${desafiosStore.logs.length+1}`, type: 'update', at: next.updated_at, actor: req.headers['x-user-id'] || 'local-admin', challenge_id: next.id });
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true, challenge: publicChallenge(next) });
});

app.put('/api/desafios/:id/status', (req, res) => {
  const idx = desafiosStore.challenges.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success:false, error:'Desafio não encontrado' });
  const { status } = req.body || {};
  if (!['active','closed','archived'].includes(status)) return res.status(400).json({ success:false, error:'Status inválido' });
  const next = { ...desafiosStore.challenges[idx], status, updated_at: new Date().toISOString() };
  desafiosStore.challenges[idx] = next;
  desafiosStore.logs.push({ id: `lg${desafiosStore.logs.length+1}`, type: 'status_change', at: next.updated_at, actor: req.headers['x-user-id'] || 'local-admin', challenge_id: next.id, status });
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true });
});

app.post('/api/desafios/:id/inscrever', (req, res) => {
  const { crafter_id } = req.body || {};
  const c = desafiosStore.challenges.find(x => x.id === req.params.id);
  if (!c || !c.visible) return res.status(404).json({ success:false, error:'Desafio não encontrado' });
  if (c.status !== 'active') return res.status(400).json({ success:false, error:'Desafio não aceita novas inscrições' });
  if (isDeadlinePassed(c.deadline)) return res.status(400).json({ success:false, error:'Prazo encerrado para novas inscrições' });
  if (!crafter_id) return res.status(400).json({ success:false, error:'Crafter obrigatório' });
  if (desafiosStore.registrations.some(r => r.challenge_id === c.id && r.crafter_id === crafter_id)) return res.status(409).json({ success:false, error:'Inscrição já existente' });
  const reg = { id: `rg${desafiosStore.registrations.length+1}`, challenge_id: c.id, crafter_id, enrolled_at: new Date().toISOString() };
  desafiosStore.registrations.push(reg);
  desafiosStore.logs.push({ id: `lg${desafiosStore.logs.length+1}`, type: 'register', at: reg.enrolled_at, actor: crafter_id, challenge_id: c.id });
  res.set('Cache-Control', 'no-store');
  res.status(201).json({ success:true, registration: reg });
});

app.post('/api/desafios/:id/entregar', (req, res) => {
  const body = req.body || {};
  const { crafter_id, delivery } = body;
  const c = desafiosStore.challenges.find(x => x.id === req.params.id);
  if (!c || !c.visible) return res.status(404).json({ success:false, error:'Desafio não encontrado' });
  if (c.status !== 'active') return res.status(400).json({ success:false, error:'Desafio encerrado para novas entregas' });
  if (isDeadlinePassed(c.deadline)) return res.status(400).json({ success:false, error:'Prazo encerrado para novas entregas' });
  if (!crafter_id) return res.status(400).json({ success:false, error:'Crafter obrigatório' });
  if (!delivery || typeof delivery !== 'object') return res.status(400).json({ success:false, error:'Entrega inválida' });
  // validação conforme tipo
  if (c.delivery_type === 'link' || c.delivery_type === 'github') {
    const url = String(delivery.url || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ success:false, error:'URL inválida' });
  }
  // mock: para file, aceitar apenas metadados; upload real viria depois
  const sub = {
    id: `s${desafiosStore.submissions.length+1}`,
    challenge_id: c.id,
    crafter_id,
    submitted_at: new Date().toISOString(),
    delivery: { url: delivery.url || '', notes: String(delivery.notes || '').trim() },
    score: null,
    status: 'submitted',
    review: null,
  };
  desafiosStore.submissions.push(sub);
  desafiosStore.logs.push({ id: `lg${desafiosStore.logs.length+1}`, type: 'submit', at: sub.submitted_at, actor: crafter_id, challenge_id: c.id, submission_id: sub.id });
  res.set('Cache-Control', 'no-store');
  res.status(201).json({ success:true, submission: sub });
});

app.put('/api/submissions/:id/review', async (req, res) => {
  const idx = desafiosStore.submissions.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success:false, error:'Submission não encontrada' });
  const body = req.body || {};
  const allowed = ['reviewed','approved','rejected'];
  if (!allowed.includes(body.status)) return res.status(400).json({ success:false, error:'Status de review inválido' });
  const before = desafiosStore.submissions[idx];
  const next = {
    ...before,
    status: body.status,
    score: typeof body.score === 'number' ? body.score : before.score,
    review: {
      by: req.headers['x-user-id'] || 'local-admin',
      notes: String(body.review?.notes || '').trim(),
      criteria_scores: body.review?.criteria_scores || {},
    }
  };
  desafiosStore.submissions[idx] = next;
  const logAt = new Date().toISOString();
  desafiosStore.logs.push({ id: `lg${desafiosStore.logs.length+1}`, type: 'review', at: logAt, actor: next.review.by, challenge_id: next.challenge_id, submission_id: next.id, status: next.status });
  // Integração Ranking opcional
  try {
    if (next.status === 'approved') {
      const challenge = desafiosStore.challenges.find(c => c.id === next.challenge_id);
      const delta = Math.max(0, Number(challenge?.base_points || 0));
      if (delta > 0) {
        await fetch(`http://localhost:${PORT}/api/ranking/points/${next.crafter_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta })
        });
      }
    }
  } catch (err) {
    console.warn(`[${new Date().toISOString()}] Falha na integração de pontos do Ranking`, err?.message || err);
  }
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success:true, submission: next });
});

app.get('/api/crafters', (req, res) => {
  const list = rankingStore.crafters.map(c => ({ id: c.id, name: c.name, avatar: c.avatar }));
  res.status(200).json({ success: true, data: list });
});

// GET /api/feedbacks - Busca os últimos feedbacks aprovados
app.get('/api/feedbacks', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/feedbacks`);
    try {
        const pool = await poolPromise;
        if (!pool) {
            console.log(`[${new Date().toISOString()}] GET /api/feedbacks: BD indisponível, retornando dados mock`);
            // Retorna dados mock quando BD não está disponível
            const mockFeedbacks = [
                {
                    ID: 1,
                    Author: "João Silva",
                    Company: "Tech Corp",
                    Message: "Excelente trabalho! Muito profissional.",
                    Rating: 5,
                    Type: "general",
                    AvatarUrl: null,
                    CreatedAt: new Date().toISOString()
                },
                {
                    ID: 2,
                    Author: "Maria Santos",
                    Company: "Digital Solutions",
                    Message: "Projeto entregue no prazo e com qualidade.",
                    Rating: 5,
                    Type: "technical",
                    AvatarUrl: null,
                    CreatedAt: new Date().toISOString()
                }
            ];
            return res.status(200).json(mockFeedbacks);
        }

        const result = await pool.request()
            .query(`
                SELECT TOP 20 ID, Author, Company, Message, Rating, Type, AvatarUrl, CreatedAt
                FROM Feedbacks
                WHERE Approved = 1
                ORDER BY CreatedAt DESC
            `);

        console.log(`[${new Date().toISOString()}] GET /api/feedbacks: ${result.recordset.length} feedbacks encontrados.`);
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro em GET /api/feedbacks:`, err.message);
        // Retorna dados mock em caso de erro
        const mockFeedbacks = [
            {
                ID: 1,
                Author: "Sistema",
                Company: "CodeCraft",
                Message: "Dados temporariamente indisponíveis",
                Rating: 5,
                Type: "system",
                AvatarUrl: null,
                CreatedAt: new Date().toISOString()
            }
        ];
        res.status(200).json(mockFeedbacks);
    }
});

// POST /api/feedbacks - Cria um novo feedback
app.post('/api/feedbacks', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido POST /api/feedbacks com dados:`, req.body);
    const { author, company, message, rating, type, avatarUrl } = req.body;

    // Validação básica
    if (!message || typeof rating !== 'number' || !type) {
        console.warn(`[${new Date().toISOString()}] POST /api/feedbacks: Dados inválidos.`);
        return res.status(400).json({ error: 'Campos obrigatórios em falta ou inválidos: message, rating, type' });
    }

    try {
        const pool = await poolPromise;
        if (!pool) {
            console.log(`[${new Date().toISOString()}] POST /api/feedbacks: BD indisponível, simulando sucesso`);
            // Simula sucesso quando BD não está disponível
            const mockResponse = {
                id: Date.now(),
                createdAt: new Date().toISOString(),
                approved: true,
                ...req.body
            };
            return res.status(201).json(mockResponse);
        }

        const result = await pool.request()
            .input('Author', sql.NVarChar(100), author || null)
            .input('Company', sql.NVarChar(100), company || null)
            .input('Message', sql.NVarChar(500), message)
            .input('Rating', sql.Int, rating)
            .input('Type', sql.VarChar(20), type)
            .input('AvatarUrl', sql.VarChar(255), avatarUrl || null)
            .query(`
                INSERT INTO Feedbacks (Author, Company, Message, Rating, Type, AvatarUrl, Approved)
                OUTPUT INSERTED.ID, INSERTED.CreatedAt, INSERTED.Approved
                VALUES (@Author, @Company, @Message, @Rating, @Type, @AvatarUrl, 1);
            `);

        if (result.recordset && result.recordset.length > 0) {
            const newFeedback = { id: result.recordset[0].ID, createdAt: result.recordset[0].CreatedAt, approved: result.recordset[0].Approved, ...req.body };
            console.log(`[${new Date().toISOString()}] POST /api/feedbacks: Feedback ID ${newFeedback.id} inserido.`);
            res.status(201).json(newFeedback);
        } else {
            throw new Error('Falha ao obter ID do feedback inserido.');
        }
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro em POST /api/feedbacks:`, err.message);
        // Simula sucesso em caso de erro
        const mockResponse = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            approved: true,
            ...req.body
        };
        res.status(201).json(mockResponse);
    }
});

// GET /api/projects - Busca todos os projetos
app.get('/api/projects', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/projects`);
    try {
        const pool = await poolPromise;
        if (!pool) {
            console.log(`[${new Date().toISOString()}] GET /api/projects: BD indisponível, retornando dados mock`);
            // Retorna dados mock quando BD não está disponível
            const mockProjects = [
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
                }
            ];
            return res.json({
                success: true,
                data: mockProjects,
                total: mockProjects.length,
                timestamp: new Date().toISOString()
            });
        }
        
        // Quando o BD estiver disponível, buscar dados reais
        const result = await pool.request().query(`
            SELECT 
                id, title, description, status, progress, 
                imageUrl, demoUrl, githubUrl, technologies,
                createdAt, updatedAt
            FROM Projects 
            ORDER BY createdAt DESC
        `);
        
        console.log(`[${new Date().toISOString()}] GET /api/projects: ${result.recordset.length} projetos encontrados`);
        res.json({
            success: true,
            data: result.recordset,
            total: result.recordset.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro em GET /api/projects:`, error.message);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno do servidor', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Rota de teste
app.get('/api/test-db', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/test-db`);
    try {
        const pool = await poolPromise;
        if (!pool) {
            console.log(`[${new Date().toISOString()}] GET /api/test-db: BD indisponível`);
            return res.status(200).json({ 
                message: 'Servidor funcionando (BD temporariamente indisponível)', 
                status: 'ok_without_db',
                timestamp: new Date().toISOString()
            });
        }
        
        const result = await pool.request().query('SELECT 1 as test');
        console.log(`[${new Date().toISOString()}] GET /api/test-db: Teste de BD OK.`);
        res.json({ 
            message: 'Conexão com banco de dados OK', 
            data: result.recordset,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro em GET /api/test-db:`, error.message);
        res.status(200).json({ 
            message: 'Servidor funcionando (erro de BD)', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// --- Servir Arquivos Estáticos ---
const staticDir = path.join(__dirname, 'dist');

// Configuração de headers de cache para assets estáticos
app.use('/assets', express.static(path.join(__dirname, 'dist/assets'), {
  maxAge: '1y', // Cache por 1 ano
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Cache específico para diferentes tipos de arquivo
    if (filePath.endsWith('.svg')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 dias para imagens
    }
  }
}));

// Serve arquivos estáticos do React com cache otimizado
app.use(express.static(staticDir, {
  maxAge: '1d', // Cache por 1 dia para arquivos HTML
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Headers específicos para diferentes tipos de arquivo
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// --- SPA Fallback (DEVE SER A ÚLTIMA ROTA) ---
app.get('*', (req, res) => {
    // Evita que APIs deem fallback para index.html
    if (req.path.startsWith('/api/')) {
        return res.status(404).send('Endpoint de API não encontrado');
    }
    console.log(`[${new Date().toISOString()}] Rota não API/estática, servindo index.html para ${req.path}`);
    res.sendFile(path.join(staticDir, 'index.html'));
});

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.WEBSITE_HOSTNAME) {
        console.log(`   Acessível publicamente em: https://${process.env.WEBSITE_HOSTNAME}`);
    } else {
        console.log(`   Acesse localmente em: http://localhost:${PORT}`);
    }
});