import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import MercadoPagoConfig, { Preference, Payment } from 'mercadopago';
import { getConnectionPool, dbSql } from './src/lib/db.js';

// Carregar variáveis de ambiente (db.js já faz isso, mas garantimos aqui também)
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

// --- REMOVEMOS OS MOCK DATA ---
// const mockData = { ... };
// const mockApps = [ ... ];
// const mockHistory = [];

// --- Configuração Mercado Pago (Mantido) ---
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

const paymentsByApp = new Map();

// --- Middleware de Autenticação (Mock mantido) ---
function authenticate(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const [type, token] = auth.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
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

// --- ROTAS DA API (CONECTADAS AO BANCO) ---

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota de autenticação (Hardcoded mantida)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const adminCredentials = { email: 'admin@codecraft.dev', password: 'admin123' };
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  
  if (email === adminCredentials.email && password === adminCredentials.password) {
    const token = 'admin-token-' + Date.now();
    const user = { id: 1, email: adminCredentials.email, name: 'Administrador', role: 'admin' };
    res.json({ success: true, token, user });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// --- LÓGICA DE NEGÓCIOS (FINANÇAS) ---

// Função auxiliar para Lógica 4
// Sincroniza um projeto com a tabela de finanças
async function syncProjectToFinance(projectId, projeto) {
  if (!projeto.preco || projeto.preco <= 0) {
    return; // Não faz nada se o projeto não tiver preço
  }

  const pool = await getConnectionPool();
  const financeRecord = {
    item: `Projeto: ${projeto.titulo || projeto.nome}`,
    valor: Number(projeto.preco),
    status: (projeto.status === 'finalizado' || projeto.progresso === 100) ? 'paid' : 'pending',
    type: 'project',
    project_id: projectId,
    progress: Number(projeto.progresso || 0),
    date: projeto.data_inicio || new Date().toISOString()
  };

  // Verifica se já existe um registro financeiro para este project_id
  const existingResult = await pool.request()
    .input('project_id', dbSql.Int, projectId)
    .query('SELECT id FROM dbo.financas WHERE project_id = @project_id');

  if (existingResult.recordset.length > 0) {
    // Atualiza o registro existente
    const existingId = existingResult.recordset[0].id;
    await pool.request()
      .input('id', dbSql.Int, existingId)
      .input('item', dbSql.NVarChar, financeRecord.item)
      .input('valor', dbSql.Decimal(10, 2), financeRecord.valor)
      .input('status', dbSql.NVarChar, financeRecord.status)
      .input('progress', dbSql.Int, financeRecord.progress)
      .query(`UPDATE dbo.financas 
              SET item = @item, valor = @valor, status = @status, progress = @progress, updated_at = SYSUTCDATETIME()
              WHERE id = @id`);
    console.log(`[Finanças] Registro ${existingId} atualizado para Projeto ${projectId}`);
  } else {
    // Cria um novo registro
    await pool.request()
      .input('item', dbSql.NVarChar, financeRecord.item)
      .input('valor', dbSql.Decimal(10, 2), financeRecord.valor)
      .input('status', dbSql.NVarChar, financeRecord.status)
      .input('type', dbSql.NVarChar, financeRecord.type)
      .input('project_id', dbSql.Int, financeRecord.project_id)
      .input('progress', dbSql.Int, financeRecord.progress)
      .input('date', dbSql.DateTime2, new Date(financeRecord.date))
      .query(`INSERT INTO dbo.financas (item, valor, status, type, project_id, progress, date)
              VALUES (@item, @valor, @status, @type, @project_id, @progress, @date)`);
    console.log(`[Finanças] Novo registro criado para Projeto ${projectId}`);
  }
}

// --- Rotas de Projetos (Lógica 1, 4) ---
app.get('/api/projetos', async (req, res, next) => {
  try {
    const {
      page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc', visivel, all
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const allowedSortColumns = {
      'createdAt': 'created_at', 'created_at': 'created_at',
      'nome': 'nome', 'titulo': 'titulo', 'status': 'status', 'id': 'id'
    };
    const sortColumn = allowedSortColumns[sortBy] || 'created_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pool = await getConnectionPool();
    const request = pool.request();
    let whereClauses = [];

    // 'all=1' é usado pelo Admin para ver tudo
    if (all !== '1') {
       // 'visivel=true' é usado pela página pública (ProjectsPage)
      if (visivel === 'true') {
        whereClauses.push("status = @status AND visible = 1"); // Assumindo que a tabela projetos tem 'visible' (sim, tem no schema)
        request.input('status', dbSql.NVarChar, 'finalizado'); // Ou 'ativo', dependendo da regra
      } else {
        // Filtro padrão (talvez apenas os ativos?)
        whereClauses.push("status <> 'arquivado'");
      }
    }
    // Se 'all=1', whereClauses fica vazio, buscando todos.

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Contagem
    const countQuery = `SELECT COUNT(*) as total FROM dbo.projetos ${whereSql}`;
    const totalResult = await request.query(countQuery);
    const total = totalResult.recordset[0].total;
    const totalPages = Math.ceil(total / limitNum);

    // Dados Paginados
    const dataQuery = `
      SELECT * FROM dbo.projetos
      ${whereSql}
      ORDER BY ${sortColumn} ${sortDirection}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    
    request.input('offset', dbSql.Int, offset);
    request.input('limit', dbSql.Int, limitNum);
    
    const dataResult = await request.query(dataQuery);

    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        total: total,
        page: pageNum,
        totalPages: totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error('Erro ao buscar projetos (paginado) no banco:', err);
    next(err);
  }
});

app.get('/api/projetos/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do projeto inválido' });
    }
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('id', dbSql.Int, id)
      .query('SELECT * FROM dbo.projetos WHERE id = @id');
      
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Erro ao buscar projeto por ID:', err);
    next(err);
  }
});

// Rota POST (Criar) - Lógica 4
app.post('/api/projetos', authenticate, authorizeAdmin, async (req, res, next) => {
  // O formulário do admin envia 'titulo', 'descricao', 'preco', etc.
  const { titulo, descricao, tecnologias, data_inicio, status, preco, progresso, thumb_url, visivel, owner } = req.body;
  
  if (!titulo) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }

  const tecnologiasString = JSON.stringify(tecnologias || []);

  try {
    const pool = await getConnectionPool();
    const query = `
      INSERT INTO dbo.projetos (titulo, nome, descricao, tecnologias, status, data_inicio, preco, progresso, thumb_url, visible, mentor_id)
      OUTPUT Inserted.* VALUES (@titulo, @nome, @descricao, @tecnologias, @status, @data_inicio, @preco, @progresso, @thumb_url, @visible, @mentor_id)
    `;

    const result = await pool.request()
      .input('titulo', dbSql.NVarChar, titulo)
      .input('nome', dbSql.NVarChar, titulo) // Salva 'titulo' em 'nome' também
      .input('descricao', dbSql.NVarChar, descricao)
      .input('tecnologias', dbSql.NVarChar, tecnologiasString)
      .input('status', dbSql.NVarChar, status || 'rascunho')
      .input('data_inicio', dbSql.DateTime2, data_inicio ? new Date(data_inicio) : null)
      .input('preco', dbSql.Decimal(10, 2), Number(preco || 0))
      .input('progresso', dbSql.Int, Number(progresso || 0))
      .input('thumb_url', dbSql.NVarChar, thumb_url || null)
      .input('visible', dbSql.Bit, visivel ? 1 : 0)
      .input('mentor_id', dbSql.Int, null) // 'owner' não é mentor_id, admin associa depois
      .query(query);

    const novoProjeto = result.recordset[0];
    
    // Lógica 4: Sincronizar com finanças
    await syncProjectToFinance(novoProjeto.id, novoProjeto);

    res.status(201).json({ success: true, project: novoProjeto });

  } catch (err) {
    console.error('Erro ao INSERIR projeto no banco:', err);
    next(err);
  }
});

// Rota PUT (Atualizar) - Lógica 4
app.put('/api/projetos/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  const { id } = req.params;
  const { titulo, descricao, tecnologias, data_inicio, status, preco, progresso, thumb_url, visivel } = req.body;

  if (!titulo) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }
  
  const tecnologiasString = JSON.stringify(tecnologias || []);

  try {
    const pool = await getConnectionPool();
    const query = `
      UPDATE dbo.projetos SET 
        titulo = @titulo,
        nome = @nome,
        descricao = @descricao,
        tecnologias = @tecnologias,
        status = @status,
        data_inicio = @data_inicio,
        preco = @preco,
        progresso = @progresso,
        thumb_url = @thumb_url,
        visible = @visible,
        updated_at = SYSUTCDATETIME()
      OUTPUT Inserted.*
      WHERE id = @id
    `;

    const result = await pool.request()
      .input('id', dbSql.Int, id)
      .input('titulo', dbSql.NVarChar, titulo)
      .input('nome', dbSql.NVarChar, titulo)
      .input('descricao', dbSql.NVarChar, descricao)
      .input('tecnologias', dbSql.NVarChar, tecnologiasString)
      .input('status', dbSql.NVarChar, status)
      .input('data_inicio', dbSql.DateTime2, data_inicio ? new Date(data_inicio) : null)
      .input('preco', dbSql.Decimal(10, 2), Number(preco || 0))
      .input('progresso', dbSql.Int, Number(progresso || 0))
      .input('thumb_url', dbSql.NVarChar, thumb_url || null)
      .input('visible', dbSql.Bit, visivel ? 1 : 0)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado para atualizar' });
    }
    
    const projetoAtualizado = result.recordset[0];

    // Lógica 4: Sincronizar com finanças
    await syncProjectToFinance(projetoAtualizado.id, projetoAtualizado);

    res.json({ success: true, project: projetoAtualizado });
  } catch (err) {
    console.error(`Erro ao ATUALIZAR projeto ${id}:`, err);
    next(err);
  }
});

// --- Rotas de Mentores (Lógica 1, 2) ---
app.get('/api/mentores', async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const { all } = req.query;
    let query = 'SELECT * FROM dbo.mentores';
    
    // O admin (useMentors) pede 'all=1'
    if (all !== '1') {
      query += ' WHERE visible = 1';
    }
    
    const result = await pool.request().query(query);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Erro ao buscar mentores no banco:', err);
    next(err);
  }
});

app.get('/api/mentores/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('id', dbSql.Int, id)
      .query('SELECT * FROM dbo.mentores WHERE id = @id');
      
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Mentor não encontrado' });
    }
    res.json({ success: true, mentor: result.recordset[0] });
  } catch (err) {
    console.error('Erro ao buscar mentor por ID:', err);
    next(err);
  }
});

// --- Rotas de Crafters (Lógica 1, 3) ---
app.get('/api/crafters', async (req, res, next) => {
  // Rota usada pelo AdminCrafters e Ranking
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      active_only,
      order_by = 'nome',
      order_direction = 'asc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Mapeamento e proteção de colunas de ordenação
    const allowedSortColumns = {'nome': 'nome', 'email': 'email', 'points': 'pontos', 'active': 'ativo'};
    const sortColumn = allowedSortColumns[order_by] || 'nome';
    const sortDirection = order_direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const pool = await getConnectionPool();
    const request = pool.request();
    
    let whereClauses = [];
    if (search) {
      whereClauses.push("(nome LIKE @search OR email LIKE @search)");
      request.input('search', dbSql.NVarChar, `%${search}%`);
    }
    if (active_only === 'true') {
      whereClauses.push("ativo = 1");
    } else if (active_only === 'false') {
      whereClauses.push("ativo = 0");
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Contagem
    const countQuery = `SELECT COUNT(*) as total FROM dbo.crafters ${whereSql}`;
    const totalResult = await request.query(countQuery);
    const total = totalResult.recordset[0].total;
    const totalPages = Math.ceil(total / limitNum);

    // Dados Paginados
    const dataQuery = `
      SELECT id, nome, email, avatar_url, pontos, nivel, ativo 
      FROM dbo.crafters
      ${whereSql}
      ORDER BY ${sortColumn} ${sortDirection}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    
    request.input('offset', dbSql.Int, offset);
    request.input('limit', dbSql.Int, limitNum);
    
    const dataResult = await request.query(dataQuery);

    // Mapeia colunas para o frontend (pontos -> points)
    const craftersMapped = dataResult.recordset.map(c => ({
      ...c,
      points: c.pontos 
    }));

    res.json({
      success: true,
      data: craftersMapped,
      pagination: {
        total,
        page: pageNum,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error('Erro ao buscar crafters (paginado):', err);
    next(err);
  }
});

// --- Rota de Ranking (Lógica 3) ---
app.get('/api/ranking', async (req, res, next) => {
  // RankingPage precisa de crafters e top3
  try {
    const pool = await getConnectionPool();
    
    // 1. Buscar todos os crafters
    const craftersResult = await pool.request()
      .query("SELECT id, nome, email, avatar_url, pontos FROM dbo.crafters WHERE ativo = 1 ORDER BY pontos DESC");
      
    // Mapeia colunas (pontos -> points, nome -> name)
    const crafters = craftersResult.recordset.map(c => ({
      ...c,
      points: c.pontos,
      name: c.nome
    }));
      
    // 2. Buscar o Top 3 (armazenado separadamente)
    const top3Result = await pool.request()
      .query("SELECT crafter_id, position, reward FROM dbo.ranking_top3 WHERE position IN (1, 2, 3)");
    
    const response = {
      crafters: crafters, // Lista completa para o ranking
      top3: top3Result.recordset, // IDs do Top 3
      all: crafters // Para o admin preencher o pódio
    };
    
    res.json(response);
  } catch (err) {
    console.error('Erro ao buscar dados do ranking:', err);
    next(err);
  }
});

// Rota para ATUALIZAR pontos (Lógica 3)
app.put('/api/ranking/points/:crafterId', authenticate, authorizeAdmin, async (req, res, next) => {
  const { crafterId } = req.params;
  const { delta, set, reason } = req.body; // delta: +10, set: 100

  try {
    const pool = await getConnectionPool();
    let query = '';
    const request = pool.request().input('id', dbSql.Int, crafterId);

    if (typeof set === 'number') {
      query = 'UPDATE dbo.crafters SET pontos = @points, updated_at = SYSUTCDATETIME() WHERE id = @id';
      request.input('points', dbSql.Int, set);
    } else if (typeof delta === 'number') {
      query = 'UPDATE dbo.crafters SET pontos = pontos + @delta, updated_at = SYSUTCDATETIME() WHERE id = @id';
      request.input('delta', dbSql.Int, delta);
    } else {
      return res.status(400).json({ error: 'Parâmetros "delta" ou "set" são necessários' });
    }

    await request.query(query);
    
    // (Opcional: Adicionar à auditoria)
    
    res.json({ success: true, message: `Pontos atualizados para crafter ${crafterId}` });
    
  } catch (err) {
    console.error('Erro ao atualizar pontos:', err);
    next(err);
  }
});

// --- Rotas de Equipes (Lógica 1) ---
app.get('/api/equipes', async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    // Query mais complexa para juntar os nomes
    const query = `
      SELECT 
        e.id, e.projeto_id, e.mentor_id, e.crafter_id, e.status_inscricao,
        p.titulo as projeto_titulo,
        m.nome as mentor_nome, m.email as mentor_email,
        c.nome as crafter_nome, c.email as crafter_email, c.avatar_url as crafter_avatar_url
      FROM dbo.equipes e
      LEFT JOIN dbo.projetos p ON e.projeto_id = p.id
      LEFT JOIN dbo.mentores m ON e.mentor_id = m.id
      LEFT JOIN dbo.crafters c ON e.crafter_id = c.id
    `;
    const result = await pool.request().query(query);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Erro ao buscar equipes:', err);
    next(err);
  }
});

app.post('/api/equipes', authenticate, authorizeAdmin, async (req, res, next) => {
  const { projeto_id, mentor_id, crafter_id, status_inscricao } = req.body;

  if (!projeto_id || !mentor_id || !crafter_id) {
    return res.status(400).json({ error: 'projeto_id, mentor_id e crafter_id são obrigatórios' });
  }

  try {
    const pool = await getConnectionPool();
    const query = `
      INSERT INTO dbo.equipes (projeto_id, mentor_id, crafter_id, status_inscricao)
      OUTPUT Inserted.*
      VALUES (@projeto_id, @mentor_id, @crafter_id, @status)
    `;
    const result = await pool.request()
      .input('projeto_id', dbSql.Int, projeto_id)
      .input('mentor_id', dbSql.Int, mentor_id)
      .input('crafter_id', dbSql.Int, crafter_id)
      .input('status', dbSql.NVarChar, status_inscricao || 'inscrito')
      .query(query);
    
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Erro ao criar equipe:', err);
    if (err.number === 2627) { // Erro de violação de chave única
      return res.status(409).json({ error: 'Este crafter já está nessa equipe/projeto.' });
    }
    next(err);
  }
});

// --- Rotas de Inscrições (Lógica 6) ---
app.get('/api/inscricoes', async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const { status } = req.query;
    
    let query = 'SELECT * FROM dbo.inscricoes';
    const request = pool.request();

    if (status) {
      query += ' WHERE status = @status';
      request.input('status', dbSql.NVarChar, status);
    }
    query += ' ORDER BY data_inscricao DESC';

    const result = await request.query(query);
    res.json(result.recordset); // O frontend espera um array direto
  } catch (err) {
    console.error('Erro ao buscar inscrições:', err);
    next(err);
  }
});

app.post('/api/inscricoes', async (req, res, next) => {
  // Rota usada pelo CrafterModal (página inicial)
  const { nome, email, telefone, cidade, estado, area_interesse, mensagem } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }
  
  try {
    const pool = await getConnectionPool();
    const query = `
      INSERT INTO dbo.inscricoes (nome, email, telefone, cidade, estado, area_interesse, observacoes, status)
      OUTPUT Inserted.*
      VALUES (@nome, @email, @telefone, @cidade, @estado, @area, @obs, 'pendente')
    `;
    
    const result = await pool.request()
      .input('nome', dbSql.NVarChar, nome)
      .input('email', dbSql.NVarChar, email)
      .input('telefone', dbSql.NVarChar, telefone || null)
      .input('cidade', dbSql.NVarChar, cidade || null)
      .input('estado', dbSql.NVarChar, estado || null)
      .input('area', dbSql.NVarChar, area_interesse || null)
      .input('obs', dbSql.NVarChar, mensagem || null) // 'mensagem' do form vira 'observacoes'
      .query(query);

    res.status(201).json({ success: true, data: result.recordset[0] });

  } catch (err) {
    console.error('Erro ao salvar inscrição:', err);
    next(err);
  }
});

// --- Rotas de Finanças (Lógica 4) ---
app.get('/api/financas', async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const { project_id } = req.query;
    
    let query = 'SELECT * FROM dbo.financas';
    const request = pool.request();

    if (project_id) {
      query += ' WHERE project_id = @project_id';
      request.input('project_id', dbSql.Int, project_id);
    }
    
    const result = await request.query(query);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Erro ao buscar financas:', err);
    next(err);
  }
});

// --- Rota de Dashboard (Lógica 5) ---
app.get('/api/dashboard/resumo', async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    
    // Kpis
    const kpiQuery = `
      SELECT 
        (SELECT COUNT(*) FROM dbo.projetos WHERE status = 'ongoing' OR status = 'ativo') as projetos_ativos,
        (SELECT COUNT(*) FROM dbo.projetos WHERE status = 'finalizado' OR status = 'concluido') as projetos_finalizados,
        (SELECT COUNT(*) FROM dbo.projetos WHERE status = 'rascunho' OR status = 'desenvolvimento') as projetos_rascunho,
        (SELECT AVG(progresso) FROM dbo.projetos WHERE status = 'ongoing' OR status = 'ativo') as media_progresso,
        (SELECT ISNULL(SUM(valor), 0) FROM dbo.financas WHERE status = 'paid') as receita_paga,
        (SELECT ISNULL(SUM(valor), 0) FROM dbo.financas WHERE status = 'pending') as receita_pendente,
        (SELECT ISNULL(SUM(valor), 0) FROM dbo.financas WHERE status = 'discount') as descontos
    `;
    const kpiResult = await pool.request().query(kpiQuery);
    const totais = kpiResult.recordset[0];
    totais.receita_total = totais.receita_paga + totais.receita_pendente;

    // Evolução (simplificado - últimos 6 meses)
    const evolucaoQuery = `
      SELECT 
        FORMAT(date, 'yyyy-MM') as mes,
        ISNULL(SUM(CASE WHEN status = 'paid' THEN valor ELSE 0 END), 0) as valor
      FROM dbo.financas
      WHERE date >= DATEADD(month, -6, GETDATE())
      GROUP BY FORMAT(date, 'yyyy-MM')
      ORDER BY mes ASC
    `;
    const evolucaoResult = await pool.request().query(evolucaoQuery);

    res.json({
      totais: totais,
      evolucao_mensal: evolucaoResult.recordset
    });
    
  } catch (err) {
    console.error('Erro ao gerar resumo do dashboard:', err);
    next(err);
  }
});


// --- Rotas de Aplicativos (Mock mantido por enquanto, pois é complexo) ---
// (As rotas /api/apps/... e Mercado Pago continuam aqui como mock)
// ... (Copie e cole todas as rotas de /api/apps/... do seu server.js original aqui) ...
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
// Lista apps do usuário autenticado
app.get('/api/apps/mine', authenticate, (req, res) => {
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

// --- Inicialização do Servidor (aguarda conexão ao banco) ---
getConnectionPool().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Falha fatal ao conectar ao banco de dados. Servidor não iniciado.', err);
  process.exit(1);
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