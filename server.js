import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import MercadoPagoConfig, { Preference, Payment } from 'mercadopago';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração do Servidor Express ---
const app = express();
const PORT = process.env.PORT || 8080;

// --- Middlewares Essenciais ---
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// --- Dados Mock para Demonstração ---
const mockData = {
  projetos: [
    {
      id: 1,
      nome: "CodeCraft Platform",
      descricao: "Plataforma de desenvolvimento colaborativo",
      status: "ativo",
      tecnologias: ["React", "Node.js", "Express"],
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      nome: "API Gateway",
      descricao: "Gateway para microserviços",
      status: "desenvolvimento",
      tecnologias: ["Node.js", "Docker", "Kubernetes"],
      created_at: new Date().toISOString()
    }
  ],
  mentores: [
    {
      id: 1,
      nome: "João Silva",
      email: "joao@codecraft.dev",
      especialidade: "Full Stack Development",
      bio: "Desenvolvedor com 10+ anos de experiência",
      ativo: true
    },
    {
      id: 2,
      nome: "Maria Santos",
      email: "maria@codecraft.dev",
      especialidade: "DevOps",
      bio: "Especialista em infraestrutura e CI/CD",
      ativo: true
    }
  ],
  crafters: [
    {
      id: 1,
      nome: "Ana Costa",
      email: "ana@example.com",
      pontos: 1250,
      nivel: "Avançado"
    },
    {
      id: 2,
      nome: "Pedro Lima",
      email: "pedro@example.com",
      pontos: 890,
      nivel: "Intermediário"
    }
  ]
};

// --- Mock de Aplicativos, Histórico e Feedbacks ---
const mockApps = [
  {
    id: 101,
    ownerId: 1,
    name: 'CodeCraft CLI',
    mainFeature: 'Automatiza tarefas de projeto',
    description: 'Ferramenta de linha de comando para produtividade',
    status: 'finalizado',
    price: 49.9,
    thumbnail: null,
    executableUrl: 'https://example.com/downloads/codecraft-cli.exe',
    created_at: new Date().toISOString(),
    feedbacks: []
  },
  {
    id: 102,
    ownerId: 1,
    name: 'Craft Studio',
    mainFeature: 'IDE leve com plugins',
    description: 'Editor com integrações CodeCraft',
    status: 'ready',
    price: 129.0,
    thumbnail: null,
    executableUrl: 'https://example.com/downloads/craft-studio.exe',
    created_at: new Date().toISOString(),
    feedbacks: []
  }
];

const mockHistory = [];

// --- Configuração Mercado Pago ---
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const MP_SUCCESS_URL = process.env.MERCADO_PAGO_SUCCESS_URL || 'http://localhost:5173/apps/:id/compra';
const MP_FAILURE_URL = process.env.MERCADO_PAGO_FAILURE_URL || 'http://localhost:5173/apps/:id/compra';
const MP_PENDING_URL = process.env.MERCADO_PAGO_PENDING_URL || 'http://localhost:5173/apps/:id/compra';
const MP_WEBHOOK_URL = process.env.MERCADO_PAGO_WEBHOOK_URL || 'http://localhost:8080/api/apps/webhook';

let mpClient = null;
try {
  if (MP_ACCESS_TOKEN) {
    mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    console.log('✅ Mercado Pago SDK configurado');
  } else {
    console.log('ℹ️ Mercado Pago não configurado (MERCADO_PAGO_ACCESS_TOKEN ausente); usando fluxo mock.');
  }
} catch (e) {
  console.warn('⚠️ Falha ao inicializar Mercado Pago SDK:', e?.message || e);
}

// Estado simples em memória para associar status por app
const paymentsByApp = new Map(); // appId -> { payment_id, status }

// --- Middleware de Autenticação e Autorização ---
function authenticate(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const [type, token] = auth.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    // Decodificação simples baseada em prefixo do token (mock)
    const isAdmin = token.startsWith('admin-token');
    req.user = {
      id: isAdmin ? 1 : 2,
      email: isAdmin ? 'admin@codecraft.dev' : 'user@example.com',
      role: isAdmin ? 'admin' : 'user',
      token,
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
}

function authorizeAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

// --- Rotas da API ---

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota de autenticação (hardcoded para admin)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Credenciais hardcoded para admin
  const adminCredentials = {
    email: 'admin@codecraft.dev',
    password: 'admin123'
  };
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  
  if (email === adminCredentials.email && password === adminCredentials.password) {
    // Login bem-sucedido
    const token = 'admin-token-' + Date.now(); // Token simples para demonstração
    const user = {
      id: 1,
      email: adminCredentials.email,
      name: 'Administrador',
      role: 'admin'
    };
    
    res.json({
      success: true,
      token,
      user
    });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// Rotas de Projetos
app.get('/api/projetos', (req, res) => {
  res.json(mockData.projetos);
});

app.get('/api/projetos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const projeto = mockData.projetos.find(p => p.id === id);
  
  if (!projeto) {
    return res.status(404).json({ error: 'Projeto não encontrado' });
  }
  
  res.json(projeto);
});

app.post('/api/projetos', (req, res) => {
  const { nome, descricao, tecnologias } = req.body;
  
  if (!nome || !descricao) {
    return res.status(400).json({ error: 'Nome e descrição são obrigatórios' });
  }
  
  const novoProjeto = {
    id: mockData.projetos.length + 1,
    nome,
    descricao,
    status: 'desenvolvimento',
    tecnologias: tecnologias || [],
    created_at: new Date().toISOString()
  };
  
  mockData.projetos.push(novoProjeto);
  res.status(201).json(novoProjeto);
});

// Rotas de Mentores
app.get('/api/mentores', (req, res) => {
  res.json(mockData.mentores);
});

app.get('/api/mentores/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const mentor = mockData.mentores.find(m => m.id === id);
  
  if (!mentor) {
    return res.status(404).json({ error: 'Mentor não encontrado' });
  }
  
  res.json(mentor);
});

// Rotas de Crafters
app.get('/api/crafters', (req, res) => {
  // Estrutura esperada pelo componente AdminCrafters
  const craftersWithStatus = mockData.crafters.map(crafter => ({
    ...crafter,
    points: crafter.pontos, // Mapear pontos para points
    active: true, // Adicionar status ativo
    avatar_url: null // Adicionar campo de avatar
  }));

  // Estrutura de resposta paginada esperada pelo hook useCrafters
  const response = {
    success: true,
    data: craftersWithStatus,
    pagination: {
      total: craftersWithStatus.length,
      page: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  };
  
  res.json(response);
});

app.get('/api/ranking', (req, res) => {
  // Estrutura esperada pelo componente RankingPage
  const crafters = mockData.crafters.map(crafter => ({
    ...crafter,
    points: crafter.pontos, // Mapear pontos para points
    name: crafter.nome // Mapear nome para name
  }));
  
  // Criar top3 baseado nos pontos
  const sortedCrafters = [...crafters].sort((a, b) => b.points - a.points);
  const top3 = sortedCrafters.slice(0, 3).map((crafter, index) => ({
    crafter_id: crafter.id,
    position: index + 1,
    reward: index === 0 ? 'Badge Ouro' : index === 1 ? 'Badge Prata' : 'Badge Bronze'
  }));
  
  const response = {
    crafters: crafters,
    top3: top3
  };
  
  res.json(response);
});

// Rota de feedbacks (mock)
app.get('/api/feedbacks', (req, res) => {
  const feedbacks = [
    {
      id: 1,
      nome: "Carlos Silva",
      email: "carlos@example.com",
      feedback: "Excelente plataforma! Muito intuitiva.",
      rating: 5,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      nome: "Lucia Oliveira",
      email: "lucia@example.com",
      feedback: "Ótima para aprender e colaborar.",
      rating: 4,
      created_at: new Date().toISOString()
    }
  ];
  
  res.json(feedbacks);
});

app.post('/api/feedbacks', (req, res) => {
  const { nome, email, feedback, rating } = req.body;
  
  if (!nome || !email || !feedback) {
    return res.status(400).json({ error: 'Nome, email e feedback são obrigatórios' });
  }
  
  const novoFeedback = {
    id: Date.now(),
    nome,
    email,
    feedback,
    rating: rating || 5,
    created_at: new Date().toISOString()
  };
  
  res.status(201).json({
    message: 'Feedback enviado com sucesso!',
    feedback: novoFeedback
  });
});

// Rota de estatísticas (mock)
app.get('/api/stats', (req, res) => {
  res.json({
    totalProjetos: mockData.projetos.length,
    totalMentores: mockData.mentores.length,
    totalCrafters: mockData.crafters.length,
    projetosAtivos: mockData.projetos.filter(p => p.status === 'ativo').length,
    timestamp: new Date().toISOString()
  });
});

// --- Rotas de Aplicativos (mock) ---
// Lista apps do usuário autenticado
app.get('/api/apps/mine', authenticate, (req, res) => {
  // Simples: associa todos ao usuário 1
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '12', 10);
  const userId = req.user?.id || 1;
  const list = mockApps.filter(a => a.ownerId === userId);
  const start = (page - 1) * pageSize;
  const paged = list.slice(start, start + pageSize);
  res.json({ success: true, data: paged, pagination: { total: list.length, page, pageSize } });
});

// Lista todos apps (admin)
app.get('/api/apps', authenticate, authorizeAdmin, (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '50', 10);
  const start = (page - 1) * pageSize;
  const paged = mockApps.slice(start, start + pageSize);
  res.json({ success: true, data: paged, pagination: { total: mockApps.length, page, pageSize } });
});

// Detalhes de um app
app.get('/api/apps/:id', authenticate, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const appItem = mockApps.find(a => a.id === id);
  if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });
  res.json({ success: true, data: appItem });
});

// Criar/atualizar card de app a partir de um projeto (admin)
app.post('/api/apps/from-project/:projectId', authenticate, authorizeAdmin, (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const { name, mainFeature, price, thumbnail, executableUrl, status, ownerId } = req.body || {};
  // Procura app existente com id igual ao projectId ou cria novo
  let appItem = mockApps.find(a => a.id === projectId);
  if (!appItem) {
    appItem = {
      id: projectId,
      ownerId: ownerId ?? req.user?.id ?? 1,
      name: name || `App do Projeto ${projectId}`,
      mainFeature: mainFeature || 'Funcionalidade principal',
      description: mainFeature || '—',
      status: status || 'finalizado',
      price: price || 0,
      thumbnail: thumbnail || null,
      executableUrl: executableUrl || null,
      created_at: new Date().toISOString(),
      feedbacks: []
    };
    mockApps.push(appItem);
  } else {
    appItem.name = name ?? appItem.name;
    appItem.mainFeature = mainFeature ?? appItem.mainFeature;
    appItem.status = status ?? appItem.status;
    appItem.price = price ?? appItem.price;
    appItem.thumbnail = thumbnail ?? appItem.thumbnail;
    appItem.executableUrl = executableUrl ?? appItem.executableUrl;
    // Atualiza ownerId se enviado
    appItem.ownerId = ownerId ?? appItem.ownerId;
  }
  res.status(201).json({ success: true, data: appItem });
});

// Editar card de app (admin)
app.put('/api/apps/:id', authenticate, authorizeAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = mockApps.findIndex(a => a.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Aplicativo não encontrado' });
  const { name, mainFeature, price, thumbnail, executableUrl, status, ownerId } = req.body || {};
  mockApps[idx] = {
    ...mockApps[idx],
    ...(name !== undefined ? { name } : {}),
    ...(mainFeature !== undefined ? { mainFeature } : {}),
    ...(price !== undefined ? { price } : {}),
    ...(thumbnail !== undefined ? { thumbnail } : {}),
    ...(executableUrl !== undefined ? { executableUrl } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(ownerId !== undefined ? { ownerId } : {}),
  };
  res.json({ success: true, data: mockApps[idx] });
});

// Mercado Livre/Mercado Pago – criar preferência de pagamento (mock)
app.post('/api/apps/:id/purchase', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const appItem = mockApps.find(a => a.id === id);
  if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });

  // Fluxo real com Mercado Pago se configurado; caso contrário, fluxo mock
  if (mpClient) {
    try {
      const successUrl = MP_SUCCESS_URL.replace(':id', String(id));
      const failureUrl = MP_FAILURE_URL.replace(':id', String(id));
      const pendingUrl = MP_PENDING_URL.replace(':id', String(id));
      const pref = new Preference(mpClient);
      const prefResult = await pref.create({
        body: {
          items: [
            {
              title: appItem.name,
              description: appItem.mainFeature || appItem.description || 'Aplicativo CodeCraft',
              currency_id: 'BRL',
              quantity: 1,
              unit_price: Number(appItem.price || 0),
            },
          ],
          back_urls: { success: successUrl, failure: failureUrl, pending: pendingUrl },
          notification_url: MP_WEBHOOK_URL,
          auto_return: 'approved',
          external_reference: String(id),
        },
      });
      const preference_id = prefResult?.id || `pref_${Date.now()}`;
      const init_point = prefResult?.init_point || prefResult?.sandbox_init_point;
      mockHistory.push({ type: 'purchase', appId: id, app_name: appItem.name, status: 'pending', date: new Date().toISOString() });
      return res.status(201).json({ success: true, preference_id, init_point });
    } catch (e) {
      console.error('Erro ao criar preferência Mercado Pago:', e);
      return res.status(500).json({ error: 'Falha ao iniciar pagamento' });
    }
  }

  // Fallback mock
  const preference_id = `pref_${Date.now()}`;
  const init_point = `http://localhost:5173/apps/${id}/compra?preference_id=${preference_id}&status=approved`;
  mockHistory.push({ type: 'purchase', appId: id, app_name: appItem.name, status: 'approved', date: new Date().toISOString() });
  res.status(201).json({ success: true, preference_id, init_point });
});

// Consultar status da compra (mock)
app.get('/api/apps/:id/purchase/status', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status: statusQuery, payment_id } = req.query;
  const appItem = mockApps.find(a => a.id === id);
  if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });

  if (mpClient && payment_id) {
    try {
      const payment = new Payment(mpClient);
      const data = await payment.get({ id: payment_id });
      const status = data?.status || statusQuery || 'pending';
      const download_url = status === 'approved' ? (appItem.executableUrl || 'https://example.com/downloads/dev-placeholder.exe') : null;
      paymentsByApp.set(id, { payment_id, status });
      return res.json({ success: true, status, download_url });
    } catch (e) {
      console.warn('Falha ao consultar pagamento no Mercado Pago:', e?.message || e);
      return res.status(500).json({ error: 'Não foi possível consultar status do pagamento' });
    }
  }

  const status = statusQuery || paymentsByApp.get(id)?.status || 'approved';
  const download_url = status === 'approved' ? (appItem.executableUrl || 'https://example.com/downloads/dev-placeholder.exe') : null;
  res.json({ success: true, status, download_url });
});

// Registrar download (mock)
app.post('/api/apps/:id/download', authenticate, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const appItem = mockApps.find(a => a.id === id);
  if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });
  const statusOk = paymentsByApp.get(id)?.status === 'approved' || !mpClient; // permite mock
  if (!statusOk) return res.status(403).json({ error: 'Download não liberado. Pagamento não aprovado.' });
  const url = appItem.executableUrl || 'https://example.com/downloads/dev-placeholder.exe';
  mockHistory.push({ type: 'download', appId: id, app_name: appItem.name, status: 'done', date: new Date().toISOString() });
  res.json({ success: true, download_url: url });
});

// Histórico de compras e downloads (mock)
app.get('/api/apps/history', authenticate, (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '20', 10);
  const start = (page - 1) * pageSize;
  const paged = mockHistory.slice(start, start + pageSize);
  res.json({ success: true, data: paged, pagination: { total: mockHistory.length, page, pageSize } });
});

// Feedback do app (mock)
app.post('/api/apps/:id/feedback', authenticate, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rating = 5, comment = '' } = req.body || {};
  const appItem = mockApps.find(a => a.id === id);
  if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });
  const fb = { rating, comment, date: new Date().toISOString() };
  appItem.feedbacks.push(fb);
  res.status(201).json({ success: true, feedback: fb });
});

// Webhook de pagamento Mercado Pago (mock/real)
app.post('/api/apps/webhook', async (req, res) => {
  try {
    const { type, data } = req.body || {};
    if (mpClient && type === 'payment' && data?.id) {
      const payment = new Payment(mpClient);
      const pay = await payment.get({ id: data.id });
      const appId = parseInt(pay?.external_reference || '0', 10);
      if (appId) {
        paymentsByApp.set(appId, { payment_id: String(data.id), status: pay?.status || 'pending' });
        if (pay?.status === 'approved') {
          const appItem = mockApps.find(a => a.id === appId);
          if (appItem) {
            mockHistory.push({ type: 'purchase', appId, app_name: appItem.name, status: 'approved', date: new Date().toISOString() });
          }
        }
      }
    }
    res.status(200).json({ received: true });
  } catch (e) {
    console.error('Erro no webhook:', e);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// --- Servir Arquivos Estáticos ---
app.use(express.static(path.join(__dirname, 'dist')));

// Rota catch-all para SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Middleware de Tratamento de Erros ---
app.use((err, req, res, _next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// --- Inicialização do Servidor ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`⚡ Servidor simplificado sem banco de dados`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});