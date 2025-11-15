import fs from 'fs';
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
import sharp from 'sharp';

import { mercadoLivre } from './src/integrations/mercadoLivre.js';
import { getConnectionPool, dbSql } from './src/lib/db.js';

// Carregar variáveis de ambiente (db.js já faz isso, mas garantimos aqui também)
// Seleciona arquivo conforme NODE_ENV, com fallback para .env
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const candidates = [
    nodeEnv === 'production' ? '.env.production' : null,
    nodeEnv === 'staging' ? '.env.staging' : null,
    nodeEnv === 'development' ? '.env.development' : null,
    '.env',
  ].filter(Boolean);

  let loadedEnvFile = null;
  for (const f of candidates) {
    const p = path.join(__dirname, f);
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      loadedEnvFile = f;
      break;
    }
  }
  if (!loadedEnvFile) {
    dotenv.config();
  }
  // Carrega também .env como fallback base (não sobrescreve variáveis já definidas)
  try {
    const defaultEnvPath = path.join(__dirname, '.env');
    if (loadedEnvFile !== '.env' && fs.existsSync(defaultEnvPath)) {
      dotenv.config({ path: defaultEnvPath });
      console.log('ℹ️ Fallback .env carregado como base.');
    }
  } catch (fallbackErr) {
    console.warn('⚠️ Falha ao carregar fallback .env:', fallbackErr?.message || fallbackErr);
  }
  console.log(`✅ Variáveis de ambiente carregadas: NODE_ENV=${nodeEnv}; arquivo=${loadedEnvFile || 'padrão (.env)'}`);
} catch (e) {
  console.warn('⚠️ Falha ao carregar variáveis de ambiente via dotenv:', e?.message || e);
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração do Servidor Express ---
const app = express();
const PORT = process.env.PORT_OVERRIDE || process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';
const ADMIN_RESET_TOKEN = process.env.ADMIN_RESET_TOKEN || '';
if (ADMIN_RESET_TOKEN) {
  console.log('🔐 ADMIN_RESET_TOKEN definido (valor não exibido)');
} else {
  console.warn('🚫 ADMIN_RESET_TOKEN ausente; /api/auth/admin/reset-password retornará 403 até configurar.');
}

// --- Middlewares Essenciais ---
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// --- Geração dinâmica do logo PNG ---
const logoSvgPath = path.join(__dirname, 'src', 'assets', 'logo-codecraft.svg');
const logoPngPath = path.join(__dirname, 'public', 'logo-codecraft.png');

async function ensureLogoCodecraftPng() {
  try {
    if (!fs.existsSync(logoSvgPath)) {
      console.warn('⚠️ SVG do logo não encontrado em', logoSvgPath);
      return;
    }
    const needRegen = process.env.REGENERATE_ASSETS === '1' || !fs.existsSync(logoPngPath);
    if (!needRegen) {
      return;
    }
    await sharp(fs.readFileSync(logoSvgPath), { density: 300 })
      .png({ quality: 100 })
      .toFile(logoPngPath);
    console.log(`🖼️ Logo PNG gerado: ${path.relative(__dirname, logoPngPath)}`);
  } catch (e) {
    console.warn('⚠️ Falha ao gerar logo PNG:', e?.message || e);
  }
}

await ensureLogoCodecraftPng();

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

// Diagnóstico da integração Mercado Pago/Mercado Livre
app.get('/api/health/mercadopago', async (req, res) => {
  try {
    const mpPublic = process.env.VITE_MERCADO_PAGO_PUBLIC_KEY || process.env.MERCADO_PAGO_PUBLIC_KEY || '';
    const mpAccess = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
    const oauthCfg = {
      clientId: process.env.MELI_CLIENT_ID || '',
      clientSecret: process.env.MELI_CLIENT_SECRET || '',
      redirectUri: process.env.MELI_REDIRECT_URI || ''
    };
    let ensured = false;
    let ensuredError = null;
    try {
      const token = await mercadoLivre.ensureAccessToken();
      ensured = !!token;
    } catch (e) {
      ensuredError = e?.message || String(e);
    }
    return res.json({
      status: 'OK',
      mp_public_key_present: !!mpPublic,
      mp_access_token_present: !!mpAccess,
      oauth_configured: !!(oauthCfg.clientId && oauthCfg.clientSecret && oauthCfg.redirectUri),
      can_ensure_access_token: ensured,
      ensure_error: ensuredError,
    });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', message: err?.message || String(err) });
  }
});

// Diagnóstico do ambiente Mercado Pago (sandbox vs produção)
app.get('/api/health/mp-env', (req, res) => {
  try {
    const publicKey = process.env.VITE_MERCADO_PAGO_PUBLIC_KEY || process.env.MERCADO_PAGO_PUBLIC_KEY || '';
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';

    const detectMode = (tokenLike) => {
      if (!tokenLike) return 'unknown';
      const t = String(tokenLike);
      if (t.startsWith('TEST-')) return 'sandbox';
      if (t.startsWith('APP_USR-')) return 'production';
      return 'unknown';
    };

    const out = {
      status: 'OK',
      mp_client_present: !!mpClient,
      backend_access_token_present: !!accessToken,
      backend_mode_hint: detectMode(accessToken),
      backend_access_token_prefix: accessToken ? accessToken.slice(0, 8) : '',
      frontend_public_key_present: !!publicKey,
      frontend_mode_hint: detectMode(publicKey),
      frontend_public_key_prefix: publicKey ? publicKey.slice(0, 8) : ''
    };

    return res.json(out);
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', message: err?.message || String(err) });
  }
});

// Diagnóstico do banco de dados e schema necessário para pagamentos
app.get('/api/health/db', async (req, res) => {
  const out = {
    status: 'OK',
    database_url_present: !!process.env.DATABASE_URL,
    audit_table_present: false,
    analytic_columns: {
      status_detail: false,
      payment_type_id: false,
      issuer_id: false,
      net_received_amount: false,
      installment_amount: false,
      payer_document_type: false,
      payer_document_number: false
    },
    indexes: {
      app_payments_status_updated: false,
      app_payments_audit_app_date: false
    },
  };
  try {
    const pool = await getConnectionPool();
    // Tabela de auditoria
    const auditRes = await pool.request().query("SELECT OBJECT_ID('dbo.app_payments_audit','U') AS objId");
    out.audit_table_present = !!(auditRes.recordset && auditRes.recordset[0] && auditRes.recordset[0].objId);

    // Colunas analíticas em app_payments
    const colsRes = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='app_payments'");
    const cols = new Set((colsRes.recordset || []).map(r => r.COLUMN_NAME));
    ['status_detail','payment_type_id','issuer_id','net_received_amount','installment_amount','payer_document_type','payer_document_number']
      .forEach(name => { out.analytic_columns[name] = cols.has(name); });

    // Índices
    const idxStatusRes = await pool.request().query("SELECT 1 AS present FROM sys.indexes WHERE name='IX_app_payments_status_updated' AND object_id=OBJECT_ID('dbo.app_payments')");
    out.indexes.app_payments_status_updated = (idxStatusRes.recordset || []).length > 0;
    const idxAuditRes = await pool.request().query("SELECT 1 AS present FROM sys.indexes WHERE name='IX_app_payments_audit_app_date' AND object_id=OBJECT_ID('dbo.app_payments_audit')");
    out.indexes.app_payments_audit_app_date = (idxAuditRes.recordset || []).length > 0;

    return res.json(out);
  } catch (err) {
    console.error('Erro em /api/health/db:', err);
    return res.status(500).json({ status: 'ERROR', message: err?.message || String(err), details: out });
  }
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

// Criar novo mentor
app.post('/api/mentores', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { nome, email, telefone, bio, avatar_url, visible } = req.body || {};

    if (!nome || !email) {
      return res.status(400).json({ error: 'Os campos "nome" e "email" são obrigatórios.' });
    }

    const pool = await getConnectionPool();
    const request = pool.request()
      .input('nome', dbSql.NVarChar, nome)
      .input('email', dbSql.NVarChar, email)
      .input('telefone', dbSql.NVarChar, telefone || null)
      .input('bio', dbSql.NVarChar(dbSql.MAX), bio || null)
      .input('avatar_url', dbSql.NVarChar, avatar_url || null)
      .input('visible', dbSql.Bit, (visible === undefined || visible === null) ? 1 : (visible ? 1 : 0));

    const insertQuery = `
      INSERT INTO dbo.mentores (nome, email, telefone, bio, avatar_url, visible)
      OUTPUT Inserted.*
      VALUES (@nome, @email, @telefone, @bio, @avatar_url, @visible)
    `;
    const result = await request.query(insertQuery);
    const mentor = result.recordset[0] || {};
    return res.status(201).json({ success: true, mentor });
  } catch (err) {
    if (err && err.number === 2627) {
      // Violação de chave única (email)
      return res.status(409).json({ error: 'Email já cadastrado para um mentor.' });
    }
    console.error('Erro ao criar mentor:', err);
    next(err);
  }
});

// Atualizar mentor existente
app.put('/api/mentores/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const { nome, email, telefone, bio, avatar_url, visible } = req.body || {};

    const pool = await getConnectionPool();
    const request = pool.request()
      .input('id', dbSql.Int, id)
      .input('nome', dbSql.NVarChar, nome || null)
      .input('email', dbSql.NVarChar, email || null)
      .input('telefone', dbSql.NVarChar, telefone || null)
      .input('bio', dbSql.NVarChar(dbSql.MAX), bio || null)
      .input('avatar_url', dbSql.NVarChar, avatar_url || null)
      .input('visible', dbSql.Bit, visible === undefined || visible === null ? null : (visible ? 1 : 0));

    // Atualização com SET completo (usa COALESCE para manter valores quando null)
    const updateQuery = `
      UPDATE dbo.mentores
      SET 
        nome = COALESCE(@nome, nome),
        email = COALESCE(@email, email),
        telefone = COALESCE(@telefone, telefone),
        bio = COALESCE(@bio, bio),
        avatar_url = COALESCE(@avatar_url, avatar_url),
        visible = COALESCE(@visible, visible),
        updated_at = SYSUTCDATETIME()
      WHERE id = @id
    `;
    const upd = await request.query(updateQuery);
    if (!upd.rowsAffected || upd.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Mentor não encontrado' });
    }

    const result = await pool.request()
      .input('id', dbSql.Int, id)
      .query('SELECT * FROM dbo.mentores WHERE id = @id');
    return res.json({ success: true, mentor: result.recordset[0] });
  } catch (err) {
    if (err && err.number === 2627) {
      return res.status(409).json({ error: 'Email já cadastrado para outro mentor.' });
    }
    console.error('Erro ao atualizar mentor:', err);
    next(err);
  }
});

// Remover mentor
app.delete('/api/mentores/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const pool = await getConnectionPool();
    const del = await pool.request()
      .input('id', dbSql.Int, id)
      .query('DELETE FROM dbo.mentores WHERE id = @id');

    if (!del.rowsAffected || del.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Mentor não encontrado' });
    }
    return res.json({ success: true, removed: true });
  } catch (err) {
    console.error('Erro ao remover mentor:', err);
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
app.get('/api/apps/mine', async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '12', 10);
  const userId = (req.user && req.user.id) ? req.user.id : 2; // default usuário comum
  const start = (page - 1) * pageSize;
  try {
    const pool = await getConnectionPool();
    const totalRes = await pool.request()
      .input('owner_id', dbSql.Int, userId)
      .query('SELECT COUNT(*) AS total FROM dbo.apps WHERE owner_id = @owner_id');
    const total = totalRes.recordset[0]?.total || 0;
    const dataRes = await pool.request()
      .input('owner_id', dbSql.Int, userId)
      .input('start', dbSql.Int, start)
      .input('pageSize', dbSql.Int, pageSize)
      .query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at
              FROM dbo.apps WHERE owner_id = @owner_id
              ORDER BY created_at DESC
              OFFSET @start ROWS FETCH NEXT @pageSize ROWS ONLY`);
    const rows = dataRes.recordset || [];
    return res.json({ success: true, data: rows, pagination: { total, page, pageSize } });
  } catch (err) {
    console.warn('Erro ao listar apps do usuário, usando mock:', err);
    // Fallback ao mock em caso de erro de banco
    const list = mockApps.filter(a => a.ownerId === userId);
    const paged = list.slice(start, start + pageSize);
    return res.json({ success: true, data: paged, pagination: { total: list.length, page, pageSize } });
  }
});

// Lista todos apps (admin)
app.get('/api/apps', authenticate, authorizeAdmin, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '50', 10);
  const start = (page - 1) * pageSize;
  try {
    const pool = await getConnectionPool();
    const totalRes = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.apps');
    const total = totalRes.recordset[0]?.total || 0;
    const dataRes = await pool.request()
      .input('start', dbSql.Int, start)
      .input('pageSize', dbSql.Int, pageSize)
      .query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at
              FROM dbo.apps
              ORDER BY created_at DESC
              OFFSET @start ROWS FETCH NEXT @pageSize ROWS ONLY`);
    const rows = dataRes.recordset || [];
    return res.json({ success: true, data: rows, pagination: { total, page, pageSize } });
  } catch (err) {
    console.warn('Erro ao listar apps (admin), usando mock:', err);
    const paged = mockApps.slice(start, start + pageSize);
    return res.json({ success: true, data: paged, pagination: { total: mockApps.length, page, pageSize } });
  }
});

// Lista todos apps (público) – sem autenticação
app.get('/api/apps/public', async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '50', 10);
  const sortBy = String(req.query.sortBy || '').toLowerCase();
  const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase();
  const start = (page - 1) * pageSize;

  const allowedSort = ['name', 'price', 'created_at'];
  const sortKey = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const orderClause = (() => {
    switch (sortKey) {
      case 'name': return `name ${sortDir}`;
      case 'price': return `price ${sortDir}`;
      default: return `created_at ${sortDir}`;
    }
  })();

  try {
    const pool = await getConnectionPool();
    const totalRes = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.apps');
    const total = totalRes.recordset[0]?.total || 0;
    const dataRes = await pool.request()
      .input('start', dbSql.Int, start)
      .input('pageSize', dbSql.Int, pageSize)
      .query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at
              FROM dbo.apps
              ORDER BY ${orderClause}
              OFFSET @start ROWS FETCH NEXT @pageSize ROWS ONLY`);
    const rows = dataRes.recordset || [];
    return res.json({ success: true, data: rows, pagination: { total, page, pageSize } });
  } catch (err) {
    console.warn('Erro ao listar apps públicos, usando mock:', err);
    // Fallback para mockApps caso banco indisponível
    let list = [...mockApps];
    if (sortBy) {
      const dir = sortOrder === 'asc' ? 1 : -1;
      list.sort((a, b) => {
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
    return res.json({ success: true, data: paged, pagination: { total: list.length, page, pageSize } });
  }
});

// Detalhes de um app (público para exibição na página de compra)
app.get('/api/apps/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const pool = await getConnectionPool();
    const dataRes = await pool.request()
      .input('id', dbSql.Int, id)
      .query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at
              FROM dbo.apps WHERE id = @id`);
    if (dataRes.recordset.length) {
      return res.json({ success: true, data: dataRes.recordset[0] });
    }
    // Fallback: tentar mockApps se não houver no banco
    const mockItem = mockApps.find(a => a.id === id);
    if (mockItem) return res.json({ success: true, data: mockItem });
    return res.status(404).json({ error: 'Aplicativo não encontrado' });
  } catch (err) {
    console.warn('Erro ao buscar app por id, usando mock:', err);
    const appItem = mockApps.find(a => a.id === id);
    if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });
    return res.json({ success: true, data: appItem });
  }
});

// Criar/atualizar card de app a partir de um projeto (admin)
app.post('/api/apps/from-project/:projectId', authenticate, authorizeAdmin, async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const { name, mainFeature, price, thumbnail, executableUrl, status, ownerId } = req.body || {};
  const payload = {
    id: projectId,
    ownerId: ownerId ?? req.user?.id ?? 1,
    name: name || `App do Projeto ${projectId}`,
    mainFeature: mainFeature || 'Funcionalidade principal',
    description: (mainFeature || '').trim() || '—',
    status: status || 'finalizado',
    price: Number(price || 0),
    thumbnail: thumbnail || null,
    executableUrl: executableUrl || null,
  };
  try {
    const pool = await getConnectionPool();
    const upd = await pool.request()
      .input('id', dbSql.Int, payload.id)
      .input('owner_id', dbSql.Int, payload.ownerId)
      .input('name', dbSql.NVarChar, payload.name)
      .input('main_feature', dbSql.NVarChar, payload.mainFeature)
      .input('description', dbSql.NVarChar, payload.description)
      .input('status', dbSql.NVarChar, payload.status)
      .input('price', dbSql.Decimal(10, 2), payload.price)
      .input('thumbnail', dbSql.NVarChar, payload.thumbnail)
      .input('executable_url', dbSql.NVarChar, payload.executableUrl)
      .query(`UPDATE dbo.apps SET owner_id=@owner_id, name=@name, main_feature=@main_feature, description=@description, status=@status, price=@price, thumbnail=@thumbnail, executable_url=@executable_url WHERE id=@id`);
    const affected = upd?.rowsAffected?.[0] || 0;
    if (affected === 0) {
      await pool.request()
        .input('id', dbSql.Int, payload.id)
        .input('owner_id', dbSql.Int, payload.ownerId)
        .input('name', dbSql.NVarChar, payload.name)
        .input('main_feature', dbSql.NVarChar, payload.mainFeature)
        .input('description', dbSql.NVarChar, payload.description)
        .input('status', dbSql.NVarChar, payload.status)
        .input('price', dbSql.Decimal(10, 2), payload.price)
        .input('thumbnail', dbSql.NVarChar, payload.thumbnail)
        .input('executable_url', dbSql.NVarChar, payload.executableUrl)
        .query(`INSERT INTO dbo.apps (id, owner_id, name, main_feature, description, status, price, thumbnail, executable_url) VALUES (@id, @owner_id, @name, @main_feature, @description, @status, @price, @thumbnail, @executable_url)`);
    }
    const rowRes = await pool.request().input('id', dbSql.Int, payload.id).query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at FROM dbo.apps WHERE id=@id`);
    const row = rowRes.recordset[0];
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.warn('Erro ao criar/atualizar app a partir de projeto, usando mock:', err);
    // Fallback para mock
    let appItem = mockApps.find(a => a.id === projectId);
    if (!appItem) {
      appItem = { ...payload, created_at: new Date().toISOString(), feedbacks: [] };
      mockApps.push(appItem);
    } else {
      Object.assign(appItem, payload);
    }
    return res.status(201).json({ success: true, data: appItem });
  }
});

// Inserção de app no banco em ambiente de desenvolvimento, protegida por ADMIN_RESET_TOKEN
// Útil para popular dbo.apps sem exigir fluxo de autenticação completo
app.post('/api/apps/dev/insert', async (req, res) => {
  try {
    if ((process.env.NODE_ENV || 'development') !== 'development') {
      return res.status(403).json({ error: 'Disponível apenas em development' });
    }
    const token = req.headers['x-admin-reset-token'] || '';
    if (!ADMIN_RESET_TOKEN || token !== ADMIN_RESET_TOKEN) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    const { id, ownerId, name, mainFeature, description, status, price, thumbnail, executableUrl } = req.body || {};
    const appId = parseInt(id, 10);
    if (!appId || !name) {
      return res.status(400).json({ error: 'id (int) e name são obrigatórios' });
    }
    const payload = {
      id: appId,
      ownerId: ownerId ?? 1,
      name: String(name),
      mainFeature: mainFeature ? String(mainFeature) : null,
      description: description ? String(description) : null,
      status: status ? String(status) : 'finalizado',
      price: Number(price || 0),
      thumbnail: thumbnail || null,
      executableUrl: executableUrl || null,
    };
    const pool = await getConnectionPool();
    const upd = await pool.request()
      .input('id', dbSql.Int, payload.id)
      .input('owner_id', dbSql.Int, payload.ownerId)
      .input('name', dbSql.NVarChar, payload.name)
      .input('main_feature', dbSql.NVarChar, payload.mainFeature)
      .input('description', dbSql.NVarChar, payload.description)
      .input('status', dbSql.NVarChar, payload.status)
      .input('price', dbSql.Decimal(10, 2), payload.price)
      .input('thumbnail', dbSql.NVarChar, payload.thumbnail)
      .input('executable_url', dbSql.NVarChar, payload.executableUrl)
      .query(`UPDATE dbo.apps SET owner_id=@owner_id, name=@name, main_feature=@main_feature, description=@description, status=@status, price=@price, thumbnail=@thumbnail, executable_url=@executable_url WHERE id=@id`);
    const affected = upd?.rowsAffected?.[0] || 0;
    if (affected === 0) {
      await pool.request()
        .input('id', dbSql.Int, payload.id)
        .input('owner_id', dbSql.Int, payload.ownerId)
        .input('name', dbSql.NVarChar, payload.name)
        .input('main_feature', dbSql.NVarChar, payload.mainFeature)
        .input('description', dbSql.NVarChar, payload.description)
        .input('status', dbSql.NVarChar, payload.status)
        .input('price', dbSql.Decimal(10, 2), payload.price)
        .input('thumbnail', dbSql.NVarChar, payload.thumbnail)
        .input('executable_url', dbSql.NVarChar, payload.executableUrl)
        .query(`INSERT INTO dbo.apps (id, owner_id, name, main_feature, description, status, price, thumbnail, executable_url) VALUES (@id, @owner_id, @name, @main_feature, @description, @status, @price, @thumbnail, @executable_url)`);
    }
    const rowRes = await pool.request().input('id', dbSql.Int, payload.id).query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at FROM dbo.apps WHERE id=@id`);
    const row = rowRes.recordset[0];
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error('Erro ao inserir app (dev):', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// Editar card de app (admin)
app.put('/api/apps/:id', authenticate, authorizeAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, mainFeature, price, thumbnail, executableUrl, status, ownerId } = req.body || {};
  try {
    const pool = await getConnectionPool();
    const currentRes = await pool.request().input('id', dbSql.Int, id).query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl FROM dbo.apps WHERE id=@id`);
    if (!currentRes.recordset.length) return res.status(404).json({ error: 'Aplicativo não encontrado' });
    const cur = currentRes.recordset[0];
    const next = {
      ownerId: ownerId !== undefined ? ownerId : cur.ownerId,
      name: name !== undefined ? name : cur.name,
      mainFeature: mainFeature !== undefined ? mainFeature : cur.mainFeature,
      status: status !== undefined ? status : cur.status,
      price: price !== undefined ? Number(price) : Number(cur.price || 0),
      thumbnail: thumbnail !== undefined ? thumbnail : cur.thumbnail,
      executableUrl: executableUrl !== undefined ? executableUrl : cur.executableUrl,
      description: cur.description, // mantemos descrição existente
    };
    await pool.request()
      .input('id', dbSql.Int, id)
      .input('owner_id', dbSql.Int, next.ownerId)
      .input('name', dbSql.NVarChar, next.name)
      .input('main_feature', dbSql.NVarChar, next.mainFeature)
      .input('status', dbSql.NVarChar, next.status)
      .input('price', dbSql.Decimal(10, 2), next.price)
      .input('thumbnail', dbSql.NVarChar, next.thumbnail)
      .input('executable_url', dbSql.NVarChar, next.executableUrl)
      .query(`UPDATE dbo.apps SET owner_id=@owner_id, name=@name, main_feature=@main_feature, status=@status, price=@price, thumbnail=@thumbnail, executable_url=@executable_url WHERE id=@id`);
    const outRes = await pool.request().input('id', dbSql.Int, id).query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at FROM dbo.apps WHERE id=@id`);
    return res.json({ success: true, data: outRes.recordset[0] });
  } catch (err) {
    console.warn('Erro ao editar app, usando mock:', err);
    const idx = mockApps.findIndex(a => a.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Aplicativo não encontrado' });
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
    return res.json({ success: true, data: mockApps[idx] });
  }
});

// Mercado Livre/Mercado Pago – criar preferência de pagamento (mock)
  app.post('/api/apps/:id/purchase', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const appItem = mockApps.find(a => a.id === id);
  if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });

  if (mpClient) {
    try {
      const successUrl = MP_SUCCESS_URL.replace(':id', String(id));
      const failureUrl = MP_FAILURE_URL.replace(':id', String(id));
      const pendingUrl = MP_PENDING_URL.replace(':id', String(id));
      const pref = new Preference(mpClient);

      // Opções opcionais vindas do payload com validação básica (whitelist)
      const {
        payment_methods: pmRaw,
        statement_descriptor: statementRaw,
        expires: expiresRaw,
        expiration_date_from: expFromRaw,
        expiration_date_to: expToRaw,
        payer: payerRaw,
      } = req.body || {};

      // Defaults via ENV
      const ENV_INSTALLMENTS_MAX = Number(process.env.MERCADO_PAGO_INSTALLMENTS_MAX || 0);
      const ENV_DEFAULT_INSTALLMENTS = Number(process.env.MERCADO_PAGO_DEFAULT_INSTALLMENTS || 0);
      const ENV_EXC_TYPES = String(process.env.MERCADO_PAGO_EXCLUDED_PAYMENT_TYPES || '').split(',').map(s => s.trim()).filter(Boolean);
      const ENV_EXC_METHODS = String(process.env.MERCADO_PAGO_EXCLUDED_PAYMENT_METHODS || '').split(',').map(s => s.trim()).filter(Boolean);

      const safePaymentMethods = (() => {
        const out = {};
        // Payload overrides ENV defaults when provided
        const installments = (pmRaw && typeof pmRaw.installments === 'number') ? pmRaw.installments : ENV_INSTALLMENTS_MAX;
        const defaultInstallments = (pmRaw && typeof pmRaw.default_installments === 'number') ? pmRaw.default_installments : ENV_DEFAULT_INSTALLMENTS;
        if (installments > 0 && installments <= 24) out.installments = installments;
        if (defaultInstallments > 0 && defaultInstallments <= 24) out.default_installments = defaultInstallments;
        const mapIds = (arr) => Array.isArray(arr)
          ? arr.slice(0, 20).map(x => ({ id: String(x?.id || x).slice(0, 32) })).filter(x => !!x.id)
          : undefined;
        const excTypesSrc = (pmRaw && pmRaw.excluded_payment_types) || ENV_EXC_TYPES;
        const excMethodsSrc = (pmRaw && pmRaw.excluded_payment_methods) || ENV_EXC_METHODS;
        const excludedTypes = mapIds(excTypesSrc);
        const excludedMethods = mapIds(excMethodsSrc);
        if (excludedTypes && excludedTypes.length) out.excluded_payment_types = excludedTypes;
        if (excludedMethods && excludedMethods.length) out.excluded_payment_methods = excludedMethods;
        return Object.keys(out).length ? out : undefined;
      })();

      const envStatement = String(process.env.MERCADO_PAGO_STATEMENT_DESCRIPTOR || '').trim();
      const safeStatement = typeof statementRaw === 'string'
        ? statementRaw.trim().slice(0, 22)
        : (envStatement ? envStatement.slice(0, 22) : undefined);
      const safeExpires = typeof expiresRaw === 'boolean' ? expiresRaw : undefined;
      const isValidDate = (s) => {
        if (typeof s !== 'string') return false;
        const t = Date.parse(s);
        return !Number.isNaN(t);
      };
      const safeExpFrom = isValidDate(expFromRaw) ? expFromRaw : undefined;
      const safeExpTo = isValidDate(expToRaw) ? expToRaw : undefined;
      const safePayer = (() => {
        if (!payerRaw || typeof payerRaw !== 'object') return undefined;
        const email = typeof payerRaw.email === 'string' ? payerRaw.email.trim().slice(0, 128) : undefined;
        const name = typeof payerRaw.name === 'string' ? payerRaw.name.trim().slice(0, 128) : undefined;
        const identification = payerRaw.identification && typeof payerRaw.identification === 'object'
          ? {
              type: typeof payerRaw.identification.type === 'string' ? payerRaw.identification.type.trim().slice(0, 32) : undefined,
              number: typeof payerRaw.identification.number === 'string' ? payerRaw.identification.number.trim().slice(0, 32) : undefined,
            }
          : undefined;
        const out = { ...(email ? { email } : {}), ...(name ? { name } : {}), ...(identification?.type && identification?.number ? { identification } : {}) };
        return Object.keys(out).length ? out : undefined;
      })();

      const prefBody = {
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
        ...(safePaymentMethods ? { payment_methods: safePaymentMethods } : {}),
        ...(safeStatement ? { statement_descriptor: safeStatement } : {}),
        ...(safeExpires !== undefined ? { expires: safeExpires } : {}),
        ...(safeExpFrom ? { expiration_date_from: safeExpFrom } : {}),
        ...(safeExpTo ? { expiration_date_to: safeExpTo } : {}),
        ...(safePayer ? { payer: safePayer } : {}),
      };

      const prefResult = await pref.create({ body: prefBody });
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
      // Persistir no banco: app_history (pending) e app_payments (pending) com novas colunas
      try {
        const pool = await getConnectionPool();
        // Histórico
        await pool.request()
          .input('type', dbSql.NVarChar, 'purchase')
          .input('app_id', dbSql.Int, id)
          .input('app_name', dbSql.NVarChar, appItem.name)
          .input('status', dbSql.NVarChar, 'pending')
          .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
        // Pagamento (usa preference_id tanto em payment_id quanto na coluna preference_id para manter PK)
        const metadataJson = JSON.stringify({ external_reference: String(id) });
        await pool.request()
          .input('payment_id', dbSql.NVarChar, String(preference_id))
          .input('preference_id', dbSql.NVarChar, String(preference_id))
          .input('app_id', dbSql.Int, id)
          .input('user_id', dbSql.Int, req.user?.id || null)
          .input('status', dbSql.NVarChar, 'pending')
          .input('amount', dbSql.Decimal(18, 2), Number(appItem.price || 0))
          .input('currency', dbSql.NVarChar, 'BRL')
          .input('payer_email', dbSql.NVarChar, req.user?.email || null)
          .input('source', dbSql.NVarChar, 'mercado_pago')
          .input('metadata', dbSql.NVarChar(dbSql.MAX), metadataJson)
          .query('INSERT INTO dbo.app_payments (payment_id, preference_id, app_id, user_id, status, amount, currency, payer_email, source, metadata) VALUES (@payment_id, @preference_id, @app_id, @user_id, @status, @amount, @currency, @payer_email, @source, @metadata)');
        // Auditoria
        await pool.request()
          .input('payment_id', dbSql.NVarChar, String(preference_id))
          .input('preference_id', dbSql.NVarChar, String(preference_id))
          .input('app_id', dbSql.Int, id)
          .input('user_id', dbSql.Int, req.user?.id || null)
          .input('action', dbSql.NVarChar, 'create_preference')
          .input('from_status', dbSql.NVarChar, null)
          .input('to_status', dbSql.NVarChar, 'pending')
          .input('from_payment_id', dbSql.NVarChar, null)
          .input('to_payment_id', dbSql.NVarChar, String(preference_id))
          .input('amount', dbSql.Decimal(18, 2), Number(appItem.price || 0))
          .input('currency', dbSql.NVarChar, 'BRL')
          .input('payer_email', dbSql.NVarChar, req.user?.email || null)
          .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
      } catch (dbErr) {
        console.warn('Falha ao persistir compra pendente no banco:', dbErr?.message || dbErr);
      }
      return res.status(201).json({ success: true, preference_id, init_point });
    } catch (e) {
      console.error('Erro ao criar preferência Mercado Pago:', e);
      return res.status(500).json({ error: 'Falha ao iniciar pagamento' });
    }
  }

  // Fallback mock
  const preference_id = `pref_${Date.now()}`;
  // Detecta a origem da requisição em dev para construir URL de retorno coerente
  const requestOrigin = req.headers.origin || req.headers.referer || '';
  const baseAppUrl = (process.env.MERCADO_PAGO_SUCCESS_URL || '').includes('/apps/:id/compra')
    ? null
    : process.env.MERCADO_PAGO_SUCCESS_URL;
  const computedSuccess = baseAppUrl
    ? baseAppUrl
    : (requestOrigin ? `${requestOrigin.replace(/\/$/, '')}/apps/:id/compra` : MP_SUCCESS_URL);
  const successUrl = computedSuccess.replace(':id', String(id));
  const init_point = `${successUrl}?preference_id=${preference_id}&status=pending&mock=1`;
  paymentsByApp.set(id, {
    payment_id: preference_id,
    status: 'pending',
    buyer: { id: req.user?.id, email: req.user?.email, name: req.user?.name },
    amount: Number(appItem.price || 0),
    products: [{ title: appItem.name, quantity: 1, unit_price: Number(appItem.price || 0) }],
  });
  mockHistory.push({ type: 'purchase', appId: id, app_name: appItem.name, status: 'pending', date: new Date().toISOString() });
  // Persistir no banco: app_history (pending) e app_payments (pending) com novas colunas
  try {
    const pool = await getConnectionPool();
    await pool.request()
      .input('type', dbSql.NVarChar, 'purchase')
      .input('app_id', dbSql.Int, id)
      .input('app_name', dbSql.NVarChar, appItem.name)
      .input('status', dbSql.NVarChar, 'pending')
      .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
    const metadataJson = JSON.stringify({ external_reference: String(id), source: 'mock' });
    await pool.request()
      .input('payment_id', dbSql.NVarChar, String(preference_id))
      .input('preference_id', dbSql.NVarChar, String(preference_id))
      .input('app_id', dbSql.Int, id)
      .input('user_id', dbSql.Int, req.user?.id || null)
      .input('status', dbSql.NVarChar, 'pending')
      .input('amount', dbSql.Decimal(18, 2), Number(appItem.price || 0))
      .input('currency', dbSql.NVarChar, 'BRL')
      .input('payer_email', dbSql.NVarChar, req.user?.email || null)
      .input('source', dbSql.NVarChar, 'mercado_pago')
      .input('metadata', dbSql.NVarChar(dbSql.MAX), metadataJson)
      .query('INSERT INTO dbo.app_payments (payment_id, preference_id, app_id, user_id, status, amount, currency, payer_email, source, metadata) VALUES (@payment_id, @preference_id, @app_id, @user_id, @status, @amount, @currency, @payer_email, @source, @metadata)');
    // Auditoria
    await pool.request()
      .input('payment_id', dbSql.NVarChar, String(preference_id))
      .input('preference_id', dbSql.NVarChar, String(preference_id))
      .input('app_id', dbSql.Int, id)
      .input('user_id', dbSql.Int, req.user?.id || null)
      .input('action', dbSql.NVarChar, 'create_preference')
      .input('from_status', dbSql.NVarChar, null)
      .input('to_status', dbSql.NVarChar, 'pending')
      .input('from_payment_id', dbSql.NVarChar, null)
      .input('to_payment_id', dbSql.NVarChar, String(preference_id))
      .input('amount', dbSql.Decimal(18, 2), Number(appItem.price || 0))
      .input('currency', dbSql.NVarChar, 'BRL')
      .input('payer_email', dbSql.NVarChar, req.user?.email || null)
      .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
  } catch (dbErr) {
    console.warn('Falha ao persistir compra pendente (mock) no banco:', dbErr?.message || dbErr);
  }
  res.status(201).json({ success: true, preference_id, init_point });
});

// Consultar status da compra (mock)
  app.get('/api/apps/:id/purchase/status', async (req, res) => {
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
        // Persistir no banco: atualizar/registrar pagamento e histórico aprovado (novas colunas)
        try {
          const pool = await getConnectionPool();
          const payerEmail = data?.payer?.email || req.user?.email || null;
          const amountVal = Number(appItem.price || data?.transaction_amount || 0);
          const currencyVal = data?.currency_id || 'BRL';
          const statusDetail = data?.status_detail || null;
          const paymentTypeId = data?.payment_type_id || null;
          const issuerId = String(data?.issuer_id || data?.card?.issuer_id || data?.transaction_details?.issuer_id || '') || null;
          const netReceived = (data?.transaction_details?.net_received_amount !== undefined) ? Number(data.transaction_details.net_received_amount) : null;
          const installmentAmount = (data?.transaction_details?.installment_amount !== undefined) ? Number(data.transaction_details.installment_amount) : null;
          const docType = data?.payer?.identification?.type || null;
          const docNumber = data?.payer?.identification?.number || null;

          // 1) Tenta atualizar pelo payment_id
          const updByPid = await pool.request()
            .input('pid', dbSql.NVarChar, String(payment_id))
            .input('status', dbSql.NVarChar, 'approved')
            .input('amount', dbSql.Decimal(18, 2), amountVal)
            .input('currency', dbSql.NVarChar, currencyVal)
            .input('payer_email', dbSql.NVarChar, payerEmail)
            .input('status_detail', dbSql.NVarChar, statusDetail)
            .input('payment_type_id', dbSql.NVarChar, paymentTypeId)
            .input('issuer_id', dbSql.NVarChar, issuerId)
            .input('net_received_amount', dbSql.Decimal(18, 2), netReceived)
            .input('installment_amount', dbSql.Decimal(18, 2), installmentAmount)
            .input('payer_document_type', dbSql.NVarChar, docType)
            .input('payer_document_number', dbSql.NVarChar, docNumber)
            .query('UPDATE dbo.app_payments SET status=@status, amount=@amount, currency=@currency, payer_email=@payer_email, status_detail=@status_detail, payment_type_id=@payment_type_id, issuer_id=@issuer_id, net_received_amount=@net_received_amount, installment_amount=@installment_amount, payer_document_type=@payer_document_type, payer_document_number=@payer_document_number, updated_at=SYSUTCDATETIME() WHERE payment_id=@pid');

          let affected = updByPid?.rowsAffected?.[0] || 0;
          if (affected === 0) {
            // 2) Se não encontrou, atualiza o registro pendente pelo app_id, ajustando o payment_id
            const updPending = await pool.request()
              .input('pid', dbSql.NVarChar, String(payment_id))
              .input('app_id', dbSql.Int, id)
              .input('status', dbSql.NVarChar, 'approved')
              .input('amount', dbSql.Decimal(18, 2), amountVal)
              .input('currency', dbSql.NVarChar, currencyVal)
              .input('payer_email', dbSql.NVarChar, payerEmail)
              .input('status_detail', dbSql.NVarChar, statusDetail)
              .input('payment_type_id', dbSql.NVarChar, paymentTypeId)
              .input('issuer_id', dbSql.NVarChar, issuerId)
              .input('net_received_amount', dbSql.Decimal(18, 2), netReceived)
              .input('installment_amount', dbSql.Decimal(18, 2), installmentAmount)
              .input('payer_document_type', dbSql.NVarChar, docType)
              .input('payer_document_number', dbSql.NVarChar, docNumber)
              .query("UPDATE dbo.app_payments SET payment_id=@pid, status=@status, amount=@amount, currency=@currency, payer_email=@payer_email, status_detail=@status_detail, payment_type_id=@payment_type_id, issuer_id=@issuer_id, net_received_amount=@net_received_amount, installment_amount=@installment_amount, payer_document_type=@payer_document_type, payer_document_number=@payer_document_number, updated_at=SYSUTCDATETIME() WHERE app_id=@app_id AND status='pending'");
            affected = updPending?.rowsAffected?.[0] || 0;
            if (affected > 0) {
              // Auditoria de correção de payment_id
              await pool.request()
                .input('payment_id', dbSql.NVarChar, String(payment_id))
                .input('preference_id', dbSql.NVarChar, null)
                .input('app_id', dbSql.Int, id)
                .input('user_id', dbSql.Int, req.user?.id || null)
                .input('action', dbSql.NVarChar, 'pid_correction')
                .input('from_status', dbSql.NVarChar, 'pending')
                .input('to_status', dbSql.NVarChar, 'approved')
                .input('from_payment_id', dbSql.NVarChar, null)
                .input('to_payment_id', dbSql.NVarChar, String(payment_id))
                .input('amount', dbSql.Decimal(18, 2), amountVal)
                .input('currency', dbSql.NVarChar, currencyVal)
                .input('payer_email', dbSql.NVarChar, payerEmail)
                .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
            }
          }
          if (affected === 0) {
            // 3) Se ainda não há registro, insere um novo
            await pool.request()
              .input('pid', dbSql.NVarChar, String(payment_id))
              .input('app_id', dbSql.Int, id)
              .input('user_id', dbSql.Int, req.user?.id || null)
              .input('status', dbSql.NVarChar, 'approved')
              .input('amount', dbSql.Decimal(18, 2), amountVal)
              .input('currency', dbSql.NVarChar, currencyVal)
              .input('payer_email', dbSql.NVarChar, payerEmail)
              .input('source', dbSql.NVarChar, 'mercado_pago')
              .query('INSERT INTO dbo.app_payments (payment_id, app_id, user_id, status, amount, currency, payer_email, source) VALUES (@pid, @app_id, @user_id, @status, @amount, @currency, @payer_email, @source)');
            // Auditoria de inserção faltante
            await pool.request()
              .input('payment_id', dbSql.NVarChar, String(payment_id))
              .input('preference_id', dbSql.NVarChar, null)
              .input('app_id', dbSql.Int, id)
              .input('user_id', dbSql.Int, req.user?.id || null)
              .input('action', dbSql.NVarChar, 'insert_missing')
              .input('from_status', dbSql.NVarChar, null)
              .input('to_status', dbSql.NVarChar, 'approved')
              .input('from_payment_id', dbSql.NVarChar, null)
              .input('to_payment_id', dbSql.NVarChar, String(payment_id))
              .input('amount', dbSql.Decimal(18, 2), amountVal)
              .input('currency', dbSql.NVarChar, currencyVal)
              .input('payer_email', dbSql.NVarChar, payerEmail)
              .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
          }

          // Auditoria de status update (caso 1: atualização por payment_id)
          if ((updByPid?.rowsAffected?.[0] || 0) > 0) {
            await pool.request()
              .input('payment_id', dbSql.NVarChar, String(payment_id))
              .input('preference_id', dbSql.NVarChar, null)
              .input('app_id', dbSql.Int, id)
              .input('user_id', dbSql.Int, req.user?.id || null)
              .input('action', dbSql.NVarChar, 'status_update')
              .input('from_status', dbSql.NVarChar, 'pending')
              .input('to_status', dbSql.NVarChar, 'approved')
              .input('from_payment_id', dbSql.NVarChar, null)
              .input('to_payment_id', dbSql.NVarChar, String(payment_id))
              .input('amount', dbSql.Decimal(18, 2), amountVal)
              .input('currency', dbSql.NVarChar, currencyVal)
              .input('payer_email', dbSql.NVarChar, payerEmail)
              .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
          }

          await pool.request()
            .input('type', dbSql.NVarChar, 'purchase')
            .input('app_id', dbSql.Int, id)
            .input('app_name', dbSql.NVarChar, appItem.name)
            .input('status', dbSql.NVarChar, 'approved')
            .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
        } catch (dbErr) {
          console.warn('Falha ao atualizar pagamento aprovado no banco:', dbErr?.message || dbErr);
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
    // Persistir no banco: histórico aprovado (fallback)
    try {
      const pool = await getConnectionPool();
      await pool.request()
        .input('type', dbSql.NVarChar, 'purchase')
        .input('app_id', dbSql.Int, id)
        .input('app_name', dbSql.NVarChar, appItem.name)
        .input('status', dbSql.NVarChar, 'approved')
        .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
    } catch (dbErr) {
      console.warn('Falha ao persistir histórico aprovado (fallback) no banco:', dbErr?.message || dbErr);
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
  // Persistir no banco: app_history (download)
  (async () => {
    try {
      const pool = await getConnectionPool();
      await pool.request()
        .input('type', dbSql.NVarChar, 'download')
        .input('app_id', dbSql.Int, id)
        .input('app_name', dbSql.NVarChar, appItem.name)
        .input('status', dbSql.NVarChar, 'done')
        .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
    } catch (dbErr) {
      console.warn('Falha ao persistir download no banco:', dbErr?.message || dbErr);
    }
  })();
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

// Pagamento direto via API de pagamentos do Mercado Pago (cartão/pix/boleto)
// Espera payload com: token (quando cartão), payment_method_id (ex.: 'master', 'pix'), installments (opcional), payer (email/nome/identification)
// Usa dados do app e do usuário (quando disponível) para compor additional_info e persiste no banco
app.post('/api/apps/:id/payment/direct', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const appItem = mockApps.find(a => a.id === id);
    if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });

    // Coleta dados do payload
    const {
      token,
      payment_method_id,
      installments,
      description,
      binary_mode,
      capture,
      external_reference,
      payer,
      additional_info,
      metadata,
    } = req.body || {};

    if (!payment_method_id) {
      return res.status(400).json({ error: 'payment_method_id é obrigatório (ex.: master, visa, pix, ticket)' });
    }

    // Monta additional_info.items usando dados do app
    const items = [
      {
        id: `APP-${id}`,
        title: appItem.name,
        description: appItem.mainFeature || appItem.description || 'Aplicativo CodeCraft',
        picture_url: appItem.thumbnail || undefined,
        category_id: 'software',
        quantity: 1,
        unit_price: Number(appItem.price || 0),
        type: 'software',
      },
    ];

    // Payer: usa do payload, senão tenta dados básicos do usuário autenticado
    const safePayer = (() => {
      const p = typeof payer === 'object' ? payer : {};
      const email = typeof p.email === 'string' ? p.email : (req.user?.email || undefined);
      const name = typeof p.name === 'string' ? p.name : (req.user?.name || undefined);
      const identification = (p.identification && typeof p.identification === 'object') ? {
        type: typeof p.identification.type === 'string' ? p.identification.type : undefined,
        number: typeof p.identification.number === 'string' ? p.identification.number : undefined,
      } : undefined;
      return {
        email,
        name,
        ...(identification?.type && identification?.number ? { identification } : {}),
      };
    })();

    // Corpo da requisição de pagamento
    const amount = Number(appItem.price || 0);
    const payload = {
      description: description || `Pagamento do app ${appItem.name}`,
      external_reference: String(external_reference || id),
      transaction_amount: amount,
      payment_method_id,
      ...(typeof installments === 'number' && installments > 0 ? { installments } : {}),
      ...(token ? { token } : {}),
      payer: {
        email: safePayer.email,
        name: safePayer.name,
        ...(safePayer.identification ? { identification: safePayer.identification } : {}),
      },
      additional_info: {
        ...(additional_info || {}),
        items,
        payer: {
          first_name: safePayer.name ? String(safePayer.name).split(' ')[0] : undefined,
          last_name: safePayer.name ? String(safePayer.name).split(' ').slice(1).join(' ') || undefined : undefined,
        },
      },
      ...(typeof binary_mode === 'boolean' ? { binary_mode } : { binary_mode: false }),
      ...(typeof capture === 'boolean' ? { capture } : { capture: true }),
      metadata: { source: 'codecraft', ...(metadata || {}) },
    };

    // Obtém token de acesso (OAuth ou access token direto)
    let accessToken = null;
    try {
      accessToken = await mercadoLivre.ensureAccessToken();
    } catch (tokErr) {
      console.warn('Pagamento direto: access token ausente/inválido:', tokErr?.message || tokErr);
      return res.status(503).json({
        error: 'NO_ACCESS_TOKEN',
        message: 'Sem access token válido (configure MERCADO_PAGO_ACCESS_TOKEN ou OAuth).',
        details: tokErr?.message || String(tokErr)
      });
    }
    const idempotencyKey = req.headers['x-idempotency-key']
      || `app-${id}-user-${req.user?.id || 'anon'}-${Date.now()}`;

    // Chama API de pagamentos
    let resp;
    try {
      resp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': String(idempotencyKey),
        },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      console.warn('Erro de rede ao criar pagamento direto:', netErr?.message || netErr);
      return res.status(502).json({
        error: 'NETWORK_ERROR',
        message: 'Falha de rede ao chamar a API de pagamentos',
        details: netErr?.message || String(netErr)
      });
    }
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!resp.ok) {
      console.warn('Falha na criação de pagamento direto:', resp.status, json);
      return res.status(502).json({ error: 'Falha ao criar pagamento direto', mp_status: resp.status, details: json });
    }

    // Extrai dados principais
    const payment_id = String(json.id || json.payment_id || `pay_${Date.now()}`);
    const status = json.status || 'pending';
    const currency = json.currency_id || 'BRL';
    const payerEmail = json.payer?.email || safePayer.email || null;
    const statusDetail = json.status_detail || null;
    const paymentTypeId = json.payment_type_id || null;
    const issuerId = String(json?.issuer_id || json?.card?.issuer_id || json?.transaction_details?.issuer_id || '') || null;
    const netReceived = (json?.transaction_details?.net_received_amount !== undefined) ? Number(json.transaction_details.net_received_amount) : null;
    const installmentAmount = (json?.transaction_details?.installment_amount !== undefined) ? Number(json.transaction_details.installment_amount) : null;
    const docType = json?.payer?.identification?.type || safePayer?.identification?.type || null;
    const docNumber = json?.payer?.identification?.number || safePayer?.identification?.number || null;

    // Atualiza cache em memória
    paymentsByApp.set(id, {
      payment_id,
      status,
      status_detail: statusDetail,
      buyer: { id: req.user?.id, email: payerEmail, name: req.user?.name },
      amount,
      products: items.map(i => ({ title: i.title, quantity: i.quantity, unit_price: i.unit_price })),
      mp_response: json,
    });

    // Persistir no banco
    try {
      const pool = await getConnectionPool();
      // Registro principal (se existir pendente, atualiza; senão insere)
      const updPending = await pool.request()
        .input('pid', dbSql.NVarChar, payment_id)
        .input('app_id', dbSql.Int, id)
        .input('status', dbSql.NVarChar, status)
        .input('amount', dbSql.Decimal(18, 2), amount)
        .input('currency', dbSql.NVarChar, currency)
        .input('payer_email', dbSql.NVarChar, payerEmail)
        .input('status_detail', dbSql.NVarChar, statusDetail)
        .input('payment_type_id', dbSql.NVarChar, paymentTypeId)
        .input('issuer_id', dbSql.NVarChar, issuerId)
        .input('net_received_amount', dbSql.Decimal(18, 2), netReceived)
        .input('installment_amount', dbSql.Decimal(18, 2), installmentAmount)
        .input('payer_document_type', dbSql.NVarChar, docType)
        .input('payer_document_number', dbSql.NVarChar, docNumber)
        .query("UPDATE dbo.app_payments SET payment_id=@pid, status=@status, amount=@amount, currency=@currency, payer_email=@payer_email, status_detail=@status_detail, payment_type_id=@payment_type_id, issuer_id=@issuer_id, net_received_amount=@net_received_amount, installment_amount=@installment_amount, payer_document_type=@payer_document_type, payer_document_number=@payer_document_number, updated_at=SYSUTCDATETIME() WHERE app_id=@app_id AND status='pending'");

      let affected = updPending?.rowsAffected?.[0] || 0;
      if (affected === 0) {
        await pool.request()
          .input('pid', dbSql.NVarChar, payment_id)
          .input('app_id', dbSql.Int, id)
          .input('user_id', dbSql.Int, req.user?.id || null)
          .input('status', dbSql.NVarChar, status)
          .input('amount', dbSql.Decimal(18, 2), amount)
          .input('currency', dbSql.NVarChar, currency)
          .input('payer_email', dbSql.NVarChar, payerEmail)
          .input('source', dbSql.NVarChar, 'mercado_pago')
          .input('status_detail', dbSql.NVarChar, statusDetail)
          .input('payment_type_id', dbSql.NVarChar, paymentTypeId)
          .input('issuer_id', dbSql.NVarChar, issuerId)
          .input('net_received_amount', dbSql.Decimal(18, 2), netReceived)
          .input('installment_amount', dbSql.Decimal(18, 2), installmentAmount)
          .input('payer_document_type', dbSql.NVarChar, docType)
          .input('payer_document_number', dbSql.NVarChar, docNumber)
          .query('INSERT INTO dbo.app_payments (payment_id, app_id, user_id, status, amount, currency, payer_email, source, status_detail, payment_type_id, issuer_id, net_received_amount, installment_amount, payer_document_type, payer_document_number) VALUES (@pid, @app_id, @user_id, @status, @amount, @currency, @payer_email, @source, @status_detail, @payment_type_id, @issuer_id, @net_received_amount, @installment_amount, @payer_document_type, @payer_document_number)');
      }

      // Auditoria
      await pool.request()
        .input('payment_id', dbSql.NVarChar, payment_id)
        .input('preference_id', dbSql.NVarChar, null)
        .input('app_id', dbSql.Int, id)
        .input('user_id', dbSql.Int, req.user?.id || null)
        .input('action', dbSql.NVarChar, 'create_payment')
        .input('from_status', dbSql.NVarChar, affected ? 'pending' : null)
        .input('to_status', dbSql.NVarChar, status)
        .input('from_payment_id', dbSql.NVarChar, affected ? null : null)
        .input('to_payment_id', dbSql.NVarChar, payment_id)
        .input('amount', dbSql.Decimal(18, 2), amount)
        .input('currency', dbSql.NVarChar, currency)
        .input('payer_email', dbSql.NVarChar, payerEmail)
        .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
    } catch (dbErr) {
      console.warn('Falha ao persistir pagamento direto no banco:', dbErr?.message || dbErr);
    }

    // Se aprovado, registra histórico e tenta sincronizar
    if (status === 'approved') {
      try {
        const meta = paymentsByApp.get(id) || {};
        const tx = {
          amount,
          products: meta.products || items.map(i => ({ title: i.title, quantity: i.quantity, unit_price: i.unit_price })),
          customer: { email: payerEmail, name: req.user?.name },
        };
        await mercadoLivre.sendTransaction(tx, { external_reference: String(id), metadata: { payment_id } });
      } catch (syncErr) {
        console.warn('Sync Mercado Livre falhou (pagamento direto):', syncErr?.message || syncErr);
      }
      try {
        const pool = await getConnectionPool();
        await pool.request()
          .input('type', dbSql.NVarChar, 'purchase')
          .input('app_id', dbSql.Int, id)
          .input('app_name', dbSql.NVarChar, appItem.name)
          .input('status', dbSql.NVarChar, 'approved')
          .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
      } catch (histErr) {
        console.warn('Falha ao registrar histórico aprovado (pagamento direto):', histErr?.message || histErr);
      }
    }

    return res.status(201).json({ success: true, payment_id, status, result: json });
  } catch (err) {
    console.error('Erro no pagamento direto:', err?.message || err);
    return res.status(500).json({ error: 'Erro interno ao processar pagamento direto' });
  }
});

// Último resultado de pagamento direto para um app (cache em memória)
// GET /api/apps/:id/payment/last
// Retorna o último pagamento registrado via endpoint de pagamento direto
app.get('/api/apps/:id/payment/last', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Parâmetro id inválido' });
    }
    const cached = paymentsByApp.get(id) || null;
    if (!cached) {
      return res.status(404).json({ error: 'Nenhum pagamento direto encontrado para este app nesta instância' });
    }
    return res.json({ success: true, data: cached });
  } catch (err) {
    console.error('Erro ao obter último pagamento direto:', err?.message || err);
    return res.status(500).json({ error: 'Erro interno ao obter último pagamento direto' });
  }
});

// Busca de pagamentos no Mercado Pago (proxy seguro)
// GET /api/payments/search?sort=...&criteria=...&external_reference=...&range=...&begin_date=...&end_date=...&collector.id=...&payer.id=...
// Exige autenticação e perfil admin para proteger dados sensíveis
app.get('/api/payments/search', authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Garante token de acesso; se não houver, retorna erro claro de configuração (503)
    let accessToken = null;
    try {
      accessToken = await mercadoLivre.ensureAccessToken();
    } catch (tokErr) {
      console.warn('Busca de pagamentos: access token ausente/inválido:', tokErr?.message || tokErr);
      return res.status(503).json({
        error: 'NO_ACCESS_TOKEN',
        message: 'Sem access token válido (configure MERCADO_PAGO_ACCESS_TOKEN ou OAuth).'
      });
    }

    // Monta query string preservando todos os parâmetros enviados
    const qp = new URLSearchParams();
    const entries = Object.entries(req.query || {});
    for (const [key, value] of entries) {
      if (value !== undefined && value !== null && String(value).length) {
        qp.append(key, String(value));
      }
    }

    const url = `https://api.mercadopago.com/v1/payments/search?${qp.toString()}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!resp.ok) {
      console.warn('Falha na busca de pagamentos:', resp.status, json);
      return res.status(resp.status).json({ error: 'Falha na busca de pagamentos', details: json });
    }

    return res.json({ success: true, data: json });
  } catch (err) {
    console.error('Erro na busca de pagamentos:', err?.message || err);
    return res.status(500).json({ error: 'Erro interno ao buscar pagamentos' });
  }
});

// Obter pagamento por ID no Mercado Pago (proxy seguro)
// GET /api/payments/:id
// Exige autenticação e perfil admin
app.get('/api/payments/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const accessToken = await mercadoLivre.ensureAccessToken();
    const { id } = req.params || {};
    if (!id || !String(id).length) {
      return res.status(400).json({ error: 'Parâmetro id é obrigatório' });
    }

    const url = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(id))}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });

    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!resp.ok) {
      console.warn('Falha ao obter pagamento:', id, resp.status, json);
      return res.status(resp.status).json({ error: 'Falha ao obter pagamento', details: json });
    }

    return res.json({ success: true, data: json });
  } catch (err) {
    console.error('Erro ao obter pagamento:', err?.message || err);
    return res.status(500).json({ error: 'Erro interno ao obter pagamento' });
  }
});

// Atualizar pagamento por ID no Mercado Pago (proxy seguro)
// PUT /api/payments/:id
// Exige autenticação e perfil admin
app.put('/api/payments/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const accessToken = await mercadoLivre.ensureAccessToken();
    const { id } = req.params || {};
    if (!id || !String(id).length) {
      return res.status(400).json({ error: 'Parâmetro id é obrigatório' });
    }

    const payload = req.body || {};
    if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Body JSON com campos a atualizar é obrigatório' });
    }

    const url = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(id))}`;
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!resp.ok) {
      console.warn('Falha ao atualizar pagamento:', id, resp.status, json);
      return res.status(resp.status).json({ error: 'Falha ao atualizar pagamento', details: json });
    }

    return res.json({ success: true, data: json });
  } catch (err) {
    console.error('Erro ao atualizar pagamento:', err?.message || err);
    return res.status(500).json({ error: 'Erro interno ao atualizar pagamento' });
  }
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
            // Persistir no banco: app_history aprovado e app_payments atualizado (novas colunas)
            try {
              const pool = await getConnectionPool();
              await pool.request()
                .input('type', dbSql.NVarChar, 'purchase')
                .input('app_id', dbSql.Int, appId)
                .input('app_name', dbSql.NVarChar, appItem.name)
                .input('status', dbSql.NVarChar, 'approved')
                .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');

              const payerEmail = pay?.payer?.email || null;
              const amountVal = Number(pay?.transaction_amount || appItem.price || 0);
              const currencyVal = pay?.currency_id || 'BRL';
              const statusDetail = pay?.status_detail || null;
              const paymentTypeId = pay?.payment_type_id || null;
              const issuerId = String(pay?.issuer_id || pay?.card?.issuer_id || pay?.transaction_details?.issuer_id || '') || null;
              const netReceived = (pay?.transaction_details?.net_received_amount !== undefined) ? Number(pay.transaction_details.net_received_amount) : null;
              const installmentAmount = (pay?.transaction_details?.installment_amount !== undefined) ? Number(pay.transaction_details.installment_amount) : null;
              const docType = pay?.payer?.identification?.type || null;
              const docNumber = pay?.payer?.identification?.number || null;

              // 1) Atualiza pelo payment_id do webhook
              const updByPid = await pool.request()
                .input('pid', dbSql.NVarChar, String(data.id))
                .input('status', dbSql.NVarChar, 'approved')
                .input('amount', dbSql.Decimal(18, 2), amountVal)
                .input('currency', dbSql.NVarChar, currencyVal)
                .input('payer_email', dbSql.NVarChar, payerEmail)
                .input('status_detail', dbSql.NVarChar, statusDetail)
                .input('payment_type_id', dbSql.NVarChar, paymentTypeId)
                .input('issuer_id', dbSql.NVarChar, issuerId)
                .input('net_received_amount', dbSql.Decimal(18, 2), netReceived)
                .input('installment_amount', dbSql.Decimal(18, 2), installmentAmount)
                .input('payer_document_type', dbSql.NVarChar, docType)
                .input('payer_document_number', dbSql.NVarChar, docNumber)
                .query('UPDATE dbo.app_payments SET status=@status, amount=@amount, currency=@currency, payer_email=@payer_email, status_detail=@status_detail, payment_type_id=@payment_type_id, issuer_id=@issuer_id, net_received_amount=@net_received_amount, installment_amount=@installment_amount, payer_document_type=@payer_document_type, payer_document_number=@payer_document_number, updated_at=SYSUTCDATETIME() WHERE payment_id=@pid');

              let affected = updByPid?.rowsAffected?.[0] || 0;
              if (affected === 0) {
                // 2) Atualiza o pendente pelo app_id
                const updPending = await pool.request()
                  .input('pid', dbSql.NVarChar, String(data.id))
                  .input('app_id', dbSql.Int, appId)
                  .input('status', dbSql.NVarChar, 'approved')
                  .input('amount', dbSql.Decimal(18, 2), amountVal)
                  .input('currency', dbSql.NVarChar, currencyVal)
                  .input('payer_email', dbSql.NVarChar, payerEmail)
                  .input('status_detail', dbSql.NVarChar, statusDetail)
                  .input('payment_type_id', dbSql.NVarChar, paymentTypeId)
                  .input('issuer_id', dbSql.NVarChar, issuerId)
                  .input('net_received_amount', dbSql.Decimal(18, 2), netReceived)
                  .input('installment_amount', dbSql.Decimal(18, 2), installmentAmount)
                  .input('payer_document_type', dbSql.NVarChar, docType)
                  .input('payer_document_number', dbSql.NVarChar, docNumber)
                  .query("UPDATE dbo.app_payments SET payment_id=@pid, status=@status, amount=@amount, currency=@currency, payer_email=@payer_email, status_detail=@status_detail, payment_type_id=@payment_type_id, issuer_id=@issuer_id, net_received_amount=@net_received_amount, installment_amount=@installment_amount, payer_document_type=@payer_document_type, payer_document_number=@payer_document_number, updated_at=SYSUTCDATETIME() WHERE app_id=@app_id AND status='pending'");
                affected = updPending?.rowsAffected?.[0] || 0;
                if (affected > 0) {
                  // Auditoria de correção de payment_id (webhook)
                  await pool.request()
                    .input('payment_id', dbSql.NVarChar, String(data.id))
                    .input('preference_id', dbSql.NVarChar, null)
                    .input('app_id', dbSql.Int, appId)
                    .input('user_id', dbSql.Int, null)
                    .input('action', dbSql.NVarChar, 'pid_correction')
                    .input('from_status', dbSql.NVarChar, 'pending')
                    .input('to_status', dbSql.NVarChar, 'approved')
                    .input('from_payment_id', dbSql.NVarChar, null)
                    .input('to_payment_id', dbSql.NVarChar, String(data.id))
                    .input('amount', dbSql.Decimal(18, 2), amountVal)
                    .input('currency', dbSql.NVarChar, currencyVal)
                    .input('payer_email', dbSql.NVarChar, payerEmail)
                    .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
                }
              }
              if (affected === 0) {
                // 3) Insere um novo se não achar
                await pool.request()
                  .input('pid', dbSql.NVarChar, String(data.id))
                  .input('app_id', dbSql.Int, appId)
                  .input('user_id', dbSql.Int, null)
                  .input('status', dbSql.NVarChar, 'approved')
                  .input('amount', dbSql.Decimal(18, 2), amountVal)
                  .input('currency', dbSql.NVarChar, currencyVal)
                  .input('payer_email', dbSql.NVarChar, payerEmail)
                  .input('source', dbSql.NVarChar, 'mercado_pago')
                  .query('INSERT INTO dbo.app_payments (payment_id, app_id, user_id, status, amount, currency, payer_email, source) VALUES (@pid, @app_id, @user_id, @status, @amount, @currency, @payer_email, @source)');
                // Auditoria de inserção faltante (webhook)
                await pool.request()
                  .input('payment_id', dbSql.NVarChar, String(data.id))
                  .input('preference_id', dbSql.NVarChar, null)
                  .input('app_id', dbSql.Int, appId)
                  .input('user_id', dbSql.Int, null)
                  .input('action', dbSql.NVarChar, 'insert_missing')
                  .input('from_status', dbSql.NVarChar, null)
                  .input('to_status', dbSql.NVarChar, 'approved')
                  .input('from_payment_id', dbSql.NVarChar, null)
                  .input('to_payment_id', dbSql.NVarChar, String(data.id))
                  .input('amount', dbSql.Decimal(18, 2), amountVal)
                  .input('currency', dbSql.NVarChar, currencyVal)
                  .input('payer_email', dbSql.NVarChar, payerEmail)
                  .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
              }

              // Auditoria de status update (caso 1: atualização por payment_id)
              if ((updByPid?.rowsAffected?.[0] || 0) > 0) {
                await pool.request()
                  .input('payment_id', dbSql.NVarChar, String(data.id))
                  .input('preference_id', dbSql.NVarChar, null)
                  .input('app_id', dbSql.Int, appId)
                  .input('user_id', dbSql.Int, null)
                  .input('action', dbSql.NVarChar, 'webhook_update')
                  .input('from_status', dbSql.NVarChar, 'pending')
                  .input('to_status', dbSql.NVarChar, 'approved')
                  .input('from_payment_id', dbSql.NVarChar, null)
                  .input('to_payment_id', dbSql.NVarChar, String(data.id))
                  .input('amount', dbSql.Decimal(18, 2), amountVal)
                  .input('currency', dbSql.NVarChar, currencyVal)
                  .input('payer_email', dbSql.NVarChar, payerEmail)
                  .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
              }
            } catch (dbErr) {
              console.warn('Webhook: falha ao persistir atualização de pagamento no banco:', dbErr?.message || dbErr);
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

// Endpoint de verificação (GET) para testes de URL no painel do Mercado Pago
// Alguns validadores fazem requisições GET/HEAD e esperam 200.
app.get('/api/apps/webhook', (req, res) => {
  try {
    res.status(200).json({ ok: true, message: 'Webhook endpoint ativo', method: 'GET', echo: req.query || null });
  } catch {
    res.status(500).json({ error: 'Webhook GET error' });
  }
});

// --- Admin: Pagamentos no Banco ---
// Lista pagamentos persistidos (filtros opcionais)
app.get('/api/admin/app-payments', async (req, res) => {
  try {
    const pool = await getConnectionPool();
    const request = pool.request();
    const conditions = ['1=1'];
    const { status, app_id, payer_email, preference_id, payment_id } = req.query || {};
    let limit = parseInt(String(req.query?.limit || '50'), 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 50;
    request.input('limit', dbSql.Int, limit);
    if (status) { conditions.push('status = @status'); request.input('status', dbSql.NVarChar, String(status)); }
    if (app_id) { conditions.push('app_id = @app_id'); request.input('app_id', dbSql.Int, parseInt(String(app_id), 10)); }
    if (payer_email) { conditions.push('payer_email = @payer_email'); request.input('payer_email', dbSql.NVarChar, String(payer_email)); }
    if (preference_id) { conditions.push('preference_id = @preference_id'); request.input('preference_id', dbSql.NVarChar, String(preference_id)); }
    if (payment_id) { conditions.push('payment_id = @payment_id'); request.input('payment_id', dbSql.NVarChar, String(payment_id)); }
    const whereSql = conditions.join(' AND ');
    const sql = `SELECT TOP(@limit)
      payment_id, app_id, preference_id, status, amount, currency, payer_email, source, updated_at,
      status_detail, payment_type_id, issuer_id, net_received_amount, installment_amount, payer_document_type, payer_document_number
      FROM dbo.app_payments WHERE ${whereSql} ORDER BY updated_at DESC, payment_id DESC`;
    const rows = await request.query(sql);
    res.json({ success: true, data: rows?.recordset || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: 'DB_LIST_FAILED', message: e?.message || String(e) });
  }
});

// Obter pagamento e auditoria por payment_id
app.get('/api/admin/app-payments/:pid', async (req, res) => {
  const pid = String(req.params?.pid || '').trim();
  if (!pid) return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'pid é obrigatório' });
  try {
    const pool = await getConnectionPool();
    const req1 = pool.request().input('pid', dbSql.NVarChar, pid);
    const paymentResp = await req1.query(`SELECT TOP(1)
      payment_id, app_id, preference_id, status, amount, currency, payer_email, source, updated_at,
      status_detail, payment_type_id, issuer_id, net_received_amount, installment_amount, payer_document_type, payer_document_number, metadata
      FROM dbo.app_payments WHERE payment_id=@pid`);
    const payment = paymentResp?.recordset?.[0] || null;
    const auditResp = await pool.request().input('pid', dbSql.NVarChar, pid)
      .query('SELECT TOP(200) payment_id, app_id, event, status, created_at, notes FROM dbo.app_payments_audit WHERE payment_id=@pid ORDER BY created_at DESC');
    const audit = auditResp?.recordset || [];
    res.json({ success: true, data: { payment, audit } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'DB_GET_FAILED', message: e?.message || String(e) });
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