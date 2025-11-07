import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import bcrypt from 'bcrypt';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

import { mercadoLivre } from './src/integrations/mercadoLivre.js';
import { getConnectionPool, dbSql } from './src/lib/db.js';

// Carregar variáveis de ambiente (db.js já faz isso, mas garantimos aqui também)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração do Servidor Express ---
const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';
const ADMIN_RESET_TOKEN = process.env.ADMIN_RESET_TOKEN || '';

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

// Inicialização do módulo Mercado Livre (OAuth + sincronização)
try {
  mercadoLivre.init({
    clientId: process.env.MELI_CLIENT_ID,
    clientSecret: process.env.MELI_CLIENT_SECRET,
    redirectUri: process.env.MELI_REDIRECT_URI,
    oauthUrl: process.env.MELI_OAUTH_URL,
    syncUrl: process.env.MELI_SYNC_URL,
    logLevel: process.env.MELI_LOG_LEVEL || 'info',
  });
  console.log('✅ Módulo Mercado Livre inicializado');
} catch (e) {
  console.warn('⚠️ Mercado Livre não inicializado:', e?.message || e);
}

const paymentsByApp = new Map();

// --- Middleware de Autenticação (JWT) ---
function authenticate(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const [type, token] = auth.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      token,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
}

function authorizeAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

// --- Garantir esquema de dbo.users (password_hash, role, status) ---
async function ensureUserTableSchema() {
  try {
    const pool = await getConnectionPool();
    // Adicionar colunas se não existirem (execuções separadas para evitar batch issues)
    await pool.request().query(`IF COL_LENGTH('dbo.users', 'password_hash') IS NULL BEGIN ALTER TABLE dbo.users ADD password_hash NVARCHAR(256) NULL; END;`);
    await pool.request().query(`IF COL_LENGTH('dbo.users', 'role') IS NULL BEGIN ALTER TABLE dbo.users ADD role NVARCHAR(32) NULL; END;`);
    await pool.request().query(`IF COL_LENGTH('dbo.users', 'status') IS NULL BEGIN ALTER TABLE dbo.users ADD status NVARCHAR(16) NOT NULL DEFAULT 'ativo'; END;`);
    // Normalizações
    await pool.request().query(`UPDATE dbo.users SET role = ISNULL(role, 'viewer');`);
    await pool.request().query(`UPDATE dbo.users SET status = ISNULL(status, 'ativo');`);
    console.log('✅ Esquema de dbo.users verificado/ajustado');
  } catch (err) {
    console.error('Erro ao garantir esquema de dbo.users:', err);
  }
}

function mapUserRow(row) {
  return {
    id: row.id,
    nome: row.name,
    email: row.email,
    role: row.role || 'viewer',
    status: row.status || 'ativo',
  };
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

// Rota de autenticação (JWT)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  (async () => {
    try {
      const pool = await getConnectionPool();
      const result = await pool.request()
        .input('email', dbSql.NVarChar, email)
        .query('SELECT id, name, email, role, status, password_hash FROM dbo.users WHERE email = @email');

      if (result.recordset.length > 0) {
        const row = result.recordset[0];
        if (row.status && row.status.toLowerCase() === 'inativo') {
          return res.status(403).json({ error: 'Usuário inativo' });
        }

        if (!row.password_hash) {
          return res.status(401).json({ error: 'Usuário sem senha definida' });
        }

        const ok = await bcrypt.compare(password, row.password_hash);
        if (!ok) {
          return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = { id: row.id, email: row.email, name: row.name, role: row.role || 'viewer' };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token, user });
      }

      // Sem fallback: exige usuário no banco
      return res.status(401).json({ error: 'Credenciais inválidas' });
    } catch (err) {
      console.error('Erro no login:', err);
      return res.status(500).json({ error: 'Erro interno no login' });
    }
  })();
});

// Rota segura para reset de senha do admin via token (para recuperar acesso)
app.post('/api/auth/admin/reset-password', async (req, res) => {
  try {
    const token = req.headers['x-admin-reset-token'] || '';
    if (!ADMIN_RESET_TOKEN || token !== ADMIN_RESET_TOKEN) {
      return res.status(403).json({ error: 'Token de reset inválido ou não configurado' });
    }
    const { email, new_password } = req.body || {};
    if (!email || !new_password) {
      return res.status(400).json({ error: 'email e new_password são obrigatórios' });
    }
    const pool = await getConnectionPool();
    const userQ = await pool.request().input('email', dbSql.NVarChar, email)
      .query('SELECT id, role FROM dbo.users WHERE email = @email');
    if (userQ.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const row = userQ.recordset[0];
    if (String(row.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Apenas usuários admin podem ser resetados por esta rota' });
    }
    const hash = await bcrypt.hash(String(new_password), 10);
    await pool.request()
      .input('id', dbSql.Int, row.id)
      .input('pwd', dbSql.NVarChar, hash)
      .query('UPDATE dbo.users SET password_hash = @pwd, updated_at = SYSUTCDATETIME() WHERE id = @id');
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro no reset de senha admin:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// --- Rotas de Usuários Admin ---
app.get('/api/auth/users', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const result = await pool.request().query('SELECT id, name, email, role, status FROM dbo.users');
    const users = result.recordset.map(mapUserRow);
    res.json(users);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    next(err);
  }
});

app.post('/api/auth/users', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { nome, email, senha, role } = req.body || {};
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Campos nome, email e senha são obrigatórios' });
    }
    const hash = await bcrypt.hash(String(senha), 10);

    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('name', dbSql.NVarChar, nome)
      .input('email', dbSql.NVarChar, email)
      .input('role', dbSql.NVarChar, role || 'viewer')
      .input('status', dbSql.NVarChar, 'ativo')
      .input('pwd', dbSql.NVarChar, hash)
      .query(`
        INSERT INTO dbo.users (name, email, role, status, password_hash, created_at)
        OUTPUT Inserted.id, Inserted.name, Inserted.email, Inserted.role, Inserted.status
        VALUES (@name, @email, @role, @status, @pwd, SYSUTCDATETIME())
      `);
    const user = mapUserRow(result.recordset[0]);
    res.status(201).json({ success: true, user });
  } catch (err) {
    if (err && (err.number === 2627 || String(err.message).includes('UNIQUE'))) {
      return res.status(409).json({ error: 'Email já cadastrado.' });
    }
    console.error('Erro ao criar usuário:', err);
    next(err);
  }
});

app.put('/api/auth/users/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, email, role, status, senha } = req.body || {};
    const pool = await getConnectionPool();

    const request = pool.request()
      .input('id', dbSql.Int, Number(id))
      .input('name', dbSql.NVarChar, nome || null)
      .input('email', dbSql.NVarChar, email || null)
      .input('role', dbSql.NVarChar, role || null)
      .input('status', dbSql.NVarChar, status || null);

    let setPwdSql = '';
    if (senha) {
      const hash = await bcrypt.hash(String(senha), 10);
      request.input('pwd', dbSql.NVarChar, hash);
      setPwdSql = ', password_hash = @pwd';
    }

    const result = await request.query(`
      UPDATE dbo.users SET
        name = COALESCE(@name, name),
        email = COALESCE(@email, email),
        role = COALESCE(@role, role),
        status = COALESCE(@status, status)
        ${setPwdSql}
      WHERE id = @id;
      SELECT id, name, email, role, status FROM dbo.users WHERE id = @id;
    `);
    const user = mapUserRow(result.recordset[0]);
    res.json({ success: true, user });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    next(err);
  }
});

app.patch('/api/auth/users/:id/toggle-status', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await getConnectionPool();
    const current = await pool.request().input('id', dbSql.Int, Number(id))
      .query('SELECT status FROM dbo.users WHERE id = @id');
    if (current.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const cur = (current.recordset[0].status || 'ativo').toLowerCase();
    const nextStatus = cur === 'ativo' ? 'inativo' : 'ativo';
    const result = await pool.request().input('id', dbSql.Int, Number(id)).input('status', dbSql.NVarChar, nextStatus)
      .query(`UPDATE dbo.users SET status = @status, updated_at = SYSUTCDATETIME() WHERE id = @id;
              SELECT id, name, email, role, status FROM dbo.users WHERE id = @id;`);
    const user = mapUserRow(result.recordset[0]);
    res.json({ success: true, user });
  } catch (err) {
    console.error('Erro ao alternar status do usuário:', err);
    next(err);
  }
});

// --- LÓGICA DE NEGÓCIOS (FINANÇAS) ---

// Função auxiliar para Lógica 4
// Sincroniza um projeto com a tabela de finanças
async function syncProjectToFinance(projectId, projeto) {
  const pool = await getConnectionPool();
  const financeRecord = {
    item: `Projeto: ${projeto.titulo || projeto.nome}`,
    valor: Number(projeto.preco || 0),
    status: (projeto.status === 'finalizado' || projeto.progresso === 100) ? 'paid' : 'pending',
    type: 'project',
    project_id: projectId,
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
      .query(`UPDATE dbo.financas 
              SET item = @item, valor = @valor, status = @status, updated_at = SYSUTCDATETIME()
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
      .input('date', dbSql.DateTime2, new Date(financeRecord.date))
      .query(`INSERT INTO dbo.financas (item, valor, status, type, project_id, date)
              VALUES (@item, @valor, @status, @type, @project_id, @date)`);
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
        // Listagem pública: considerar projetos 'ativo' e 'finalizado'
        whereClauses.push("p.status IN ('ativo','finalizado')");
      } else {
        // Filtro padrão (sem depender de coluna 'visible')
        whereClauses.push("p.status <> 'arquivado'");
      }
    }
    // Se 'all=1', whereClauses fica vazio, buscando todos.

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Contagem
    const countQuery = `SELECT COUNT(*) as total FROM dbo.projetos p ${whereSql}`;
    const totalResult = await request.query(countQuery);
    const total = totalResult.recordset[0].total;
    const totalPages = Math.ceil(total / limitNum);

    // Dados Paginados
    const dataQuery = `
      SELECT 
        p.id,
        p.titulo,
        p.nome,
        p.descricao,
        p.status,
        p.tecnologias,
        p.data_inicio,
        p.thumb_url,
        p.mentor_id,
        p.created_at,
        p.updated_at,
        p.preco,
        COALESCE(p.progresso, 0) AS progresso
      FROM dbo.projetos p
      ${whereSql}
      ORDER BY p.${sortColumn} ${sortDirection}
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
      .query(`
        SELECT 
          p.id,
          p.titulo,
          p.nome,
          p.descricao,
          p.status,
          p.tecnologias,
          p.data_inicio,
          p.thumb_url,
          p.mentor_id,
          p.created_at,
          p.updated_at,
          p.preco,
          COALESCE(p.progresso, 0) AS progresso
        FROM dbo.projetos p
        WHERE p.id = @id
      `);
      
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
  const { titulo, descricao, tecnologias, data_inicio, status, preco, progresso, thumb_url } = req.body;
  
  if (!titulo) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }

  const tecnologiasString = JSON.stringify(tecnologias || []);

  try {
    const pool = await getConnectionPool();
    const query = `
      INSERT INTO dbo.projetos (titulo, nome, descricao, tecnologias, status, data_inicio, thumb_url, mentor_id, progresso, preco)
      OUTPUT Inserted.* VALUES (@titulo, @nome, @descricao, @tecnologias, @status, @data_inicio, @thumb_url, @mentor_id, @progresso, @preco)
    `;

    const result = await pool.request()
      .input('titulo', dbSql.NVarChar, titulo)
      .input('nome', dbSql.NVarChar, titulo) // Salva 'titulo' em 'nome' também
      .input('descricao', dbSql.NVarChar, descricao)
      .input('tecnologias', dbSql.NVarChar, tecnologiasString)
      .input('status', dbSql.NVarChar, status || 'rascunho')
      .input('data_inicio', dbSql.DateTime2, data_inicio ? new Date(data_inicio) : null)
      .input('thumb_url', dbSql.NVarChar, thumb_url || null)
      .input('mentor_id', dbSql.Int, null) // 'owner' não é mentor_id, admin associa depois
      .input('progresso', dbSql.Int, Number(progresso || 0))
      .input('preco', dbSql.Decimal(10, 2), Number(preco || 0))
      .query(query);

    const novoProjeto = result.recordset[0];
    // Propagar valores recebidos para sincronização financeira
    novoProjeto.preco = Number(preco || 0);
    novoProjeto.progresso = Number(progresso || 0);
    
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
  const { titulo, descricao, tecnologias, data_inicio, status, preco, progresso, thumb_url } = req.body;

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
        thumb_url = @thumb_url,
        progresso = @progresso,
        preco = @preco,
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
      .input('thumb_url', dbSql.NVarChar, thumb_url || null)
      .input('progresso', dbSql.Int, Number(progresso || 0))
      .input('preco', dbSql.Decimal(10, 2), Number(preco || 0))
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado para atualizar' });
    }
    
    const projetoAtualizado = result.recordset[0];
    // Propagar valores recebidos para sincronização financeira
    projetoAtualizado.preco = Number(preco || 0);
    projetoAtualizado.progresso = Number(progresso || 0);

    // Lógica 4: Sincronizar com finanças
    await syncProjectToFinance(projetoAtualizado.id, projetoAtualizado);

    res.json({ success: true, project: projetoAtualizado });
  } catch (err) {
    console.error(`Erro ao ATUALIZAR projeto ${id}:`, err);
    next(err);
  }
});

// Rota DELETE (Excluir) - remove registros financeiros relacionados e o projeto
app.delete('/api/projetos/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do projeto inválido' });
    }

    const pool = await getConnectionPool();

    // Remove registros de finanças associados ao projeto
    await pool.request()
      .input('project_id', dbSql.Int, id)
      .query(`DELETE FROM dbo.financas WHERE project_id = @project_id`);

    // Remove o projeto
    const delResult = await pool.request()
      .input('id', dbSql.Int, id)
      .query(`DELETE FROM dbo.projetos WHERE id = @id`);

    // delResult.rowsAffected é um array com contagem por operação
    const affected = Array.isArray(delResult.rowsAffected) ? delResult.rowsAffected.reduce((a,b)=>a+b,0) : (delResult.rowsAffected || 0);
    if (!affected) {
      return res.status(404).json({ error: 'Projeto não encontrado para exclusão' });
    }

    return res.json({ success: true, removed: id });
  } catch (err) {
    console.error('Erro ao EXCLUIR projeto:', err);
    next(err);
  }
});

// Endpoint auxiliar: verificar tipo da coluna "progresso" em dbo.projetos
app.get('/api/projetos/column/progresso', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const result = await pool.request().query(`
      SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'projetos' AND COLUMN_NAME = 'progresso'
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Coluna progresso não encontrada em dbo.projetos' });
    }

    const info = result.recordset[0];
    return res.json({ success: true, column: { name: 'progresso', ...info } });
  } catch (err) {
    console.error('Erro ao consultar coluna progresso:', err);
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

// Criar novo Crafter
app.post('/api/crafters', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { nome, email, avatar_url, pontos, nivel, ativo } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'O campo "nome" é obrigatório.' });
    }

    const pool = await getConnectionPool();
    const request = pool.request()
      .input('nome', dbSql.NVarChar, nome)
      .input('email', dbSql.NVarChar, email || null)
      .input('avatar_url', dbSql.NVarChar, avatar_url || null)
      .input('pontos', dbSql.Int, typeof pontos === 'number' ? pontos : 0)
      .input('nivel', dbSql.NVarChar, nivel || null)
      .input('ativo', dbSql.Bit, typeof ativo === 'boolean' ? (ativo ? 1 : 0) : 1);

    const insertQuery = `
      INSERT INTO dbo.crafters (nome, email, avatar_url, pontos, nivel, ativo)
      OUTPUT Inserted.id, Inserted.nome, Inserted.email, Inserted.avatar_url, Inserted.pontos, Inserted.nivel, Inserted.ativo
      VALUES (@nome, @email, @avatar_url, @pontos, @nivel, @ativo)
    `;

    const result = await request.query(insertQuery);
    const row = result.recordset[0] || {};
    const response = { ...row, points: row.pontos };
    return res.status(201).json({ success: true, data: response });
  } catch (err) {
    // 2627: violation of UNIQUE KEY constraint (e.g., email)
    if (err && (err.number === 2627 || err.code === 'EREQUEST')) {
      console.error('Violação de chave única ao criar crafter:', err);
      return res.status(409).json({ error: 'Email já cadastrado para um crafter.' });
    }
    console.error('Erro ao criar crafter:', err);
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
  const { delta, set } = req.body; // delta: +10, set: 100

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

// Remover um membro (crafter) da equipe
app.delete('/api/equipes/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await getConnectionPool();
    const del = await pool.request()
      .input('id', dbSql.Int, id)
      .query('DELETE FROM dbo.equipes WHERE id = @id');

    // del.rowsAffected[0] indica número de linhas afetadas
    if (!del.rowsAffected || del.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao remover crafter da equipe:', err);
    next(err);
  }
});

// Alterar status de inscrição de um membro da equipe
app.put('/api/equipes/:id/status', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status_inscricao } = req.body;
    if (!status_inscricao) {
      return res.status(400).json({ error: 'status_inscricao é obrigatório' });
    }

    const pool = await getConnectionPool();
    const upd = await pool.request()
      .input('id', dbSql.Int, id)
      .input('status', dbSql.NVarChar, status_inscricao)
      .query('UPDATE dbo.equipes SET status_inscricao = @status WHERE id = @id');

    if (!upd.rowsAffected || upd.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao alterar status da equipe:', err);
    next(err);
  }
});

// Associar mentor a projeto
app.post('/api/projetos/:id/mentor', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { id } = req.params; // projeto_id
    const { mentor_id } = req.body;
    if (!mentor_id) {
      return res.status(400).json({ error: 'mentor_id é obrigatório' });
    }

    const pool = await getConnectionPool();
    const request = pool.request()
      .input('projeto_id', dbSql.Int, id)
      .input('mentor_id', dbSql.Int, mentor_id);

    // 1) Tentar inserir na tabela de associação múltipla
    try {
      await request.query(`
        INSERT INTO dbo.projetos_mentores (projeto_id, mentor_id)
        VALUES (@projeto_id, @mentor_id)
      `);
    } catch (e) {
      // Ignorar se já associado (chave única)
      if (!(e && e.number === 2627)) throw e;
    }

    // 2) Atualizar referência direta em dbo.projetos (opcional, para conveniência)
    await pool.request()
      .input('projeto_id', dbSql.Int, id)
      .input('mentor_id', dbSql.Int, mentor_id)
      .query('UPDATE dbo.projetos SET mentor_id = @mentor_id, updated_at = SYSUTCDATETIME() WHERE id = @projeto_id');

    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao associar mentor ao projeto:', err);
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
        (SELECT AVG(CAST(progresso AS FLOAT)) FROM dbo.projetos WHERE status = 'ongoing' OR status = 'ativo') as media_progresso,
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
// Lista apps do usuário (permite acesso sem autenticação no ambiente atual)
app.get('/api/apps/mine', (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '12', 10);
  const userId = (req.user && req.user.id) ? req.user.id : 2; // default usuário comum
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

// Lista todos apps (público) – sem autenticação
app.get('/api/apps/public', (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '50', 10);
  const sortBy = String(req.query.sortBy || '').toLowerCase();
  const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase();

  const start = (page - 1) * pageSize;

  // Ordenação básica
  let list = [...mockApps];
  if (sortBy) {
    list.sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'name':
          return String(a.name || '').localeCompare(String(b.name || '')) * dir;
        case 'price':
          return ((a.price || 0) - (b.price || 0)) * dir;
        case 'update':
        case 'created_at':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
        default:
          return 0;
      }
    });
  }

  const paged = list.slice(start, start + pageSize);
  res.json({ success: true, data: paged, pagination: { total: list.length, page, pageSize } });
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
      // Persistir metadados básicos da compra para sincronização pós-aprovação
      paymentsByApp.set(id, {
        payment_id: preference_id,
        status: 'pending',
        buyer: { id: req.user?.id, email: req.user?.email, name: req.user?.name },
        amount: Number(appItem.price || 0),
        products: [{ title: appItem.name, quantity: 1, unit_price: Number(appItem.price || 0) }],
      });
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
  paymentsByApp.set(id, {
    payment_id: preference_id,
    status: 'approved',
    buyer: { id: req.user?.id, email: req.user?.email, name: req.user?.name },
    amount: Number(appItem.price || 0),
    products: [{ title: appItem.name, quantity: 1, unit_price: Number(appItem.price || 0) }],
  });
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
      if (status === 'approved') {
        try {
          const meta = paymentsByApp.get(id) || {};
          const tx = {
            amount: Number(appItem.price || data?.transaction_amount || 0),
            products: meta.products || [{ title: appItem.name, quantity: 1, unit_price: Number(appItem.price || 0) }],
            customer: { email: req.user?.email, name: req.user?.name },
          };
          await mercadoLivre.sendTransaction(tx, { external_reference: String(id), metadata: { payment_id } });
        } catch (syncErr) {
          console.warn('Sync Mercado Livre falhou (fallback mantido):', syncErr?.message || syncErr);
        }
      }
      return res.json({ success: true, status, download_url });
    } catch (e) {
      console.warn('Falha ao consultar pagamento no Mercado Pago:', e?.message || e);
      return res.status(500).json({ error: 'Não foi possível consultar status do pagamento' });
    }
  }

  const status = statusQuery || paymentsByApp.get(id)?.status || 'approved';
  const download_url = status === 'approved' ? (appItem.executableUrl || 'https://example.com/downloads/dev-placeholder.exe') : null;
  if (status === 'approved') {
    try {
      const meta = paymentsByApp.get(id) || {};
      const tx = {
        amount: Number(meta.amount || appItem.price || 0),
        products: meta.products || [{ title: appItem.name, quantity: 1, unit_price: Number(appItem.price || 0) }],
        customer: { email: req.user?.email, name: req.user?.name },
      };
      await mercadoLivre.sendTransaction(tx, { external_reference: String(id), metadata: { source: 'status_check' } });
    } catch (syncErr) {
      console.warn('Sync Mercado Livre (status) falhou, mantendo fallback:', syncErr?.message || syncErr);
    }
  }
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

// Histórico de compras e downloads (mock, sem autenticação para usuário comum)
app.get('/api/apps/history', (req, res) => {
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
            // Sincronizar transação com Mercado Livre (não bloqueia o webhook)
            try {
              const tx = {
                amount: Number(pay?.transaction_amount || appItem.price || 0),
                products: [{ title: appItem.name, quantity: 1, unit_price: Number(appItem.price || 0) }],
                customer: { email: pay?.payer?.email || undefined, name: undefined },
              };
              await mercadoLivre.sendTransaction(tx, { external_reference: String(appId), metadata: { payment_id: String(data.id), source: 'webhook' } });
            } catch (syncErr) {
              console.warn('Webhook: falha ao sincronizar com Mercado Livre:', syncErr?.message || syncErr);
            }
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
app.use((err, req, res, next) => {
  void next; // marca como usado para o ESLint mantendo a assinatura de 4 parâmetros
  console.error('Erro no servidor:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// --- Inicialização do Servidor (aguarda conexão ao banco) ---
getConnectionPool().then(async () => {
  await ensureUserTableSchema();
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

// OAuth callback Mercado Livre para troca de código por tokens
app.get('/api/mercado-livre/oauth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    await mercadoLivre.exchangeCode(code);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro no OAuth callback Mercado Livre:', err);
    res.status(500).json({ error: 'OAuth callback error' });
  }
});