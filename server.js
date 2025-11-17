import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import bcrypt from 'bcrypt';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
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
app.disable('x-powered-by');
app.set('trust proxy', 1);
const PORT = process.env.PORT_OVERRIDE || process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_RESET_TOKEN = process.env.ADMIN_RESET_TOKEN;
if (!JWT_SECRET || !ADMIN_RESET_TOKEN) {
  console.error('ERRO FATAL: JWT_SECRET ou ADMIN_RESET_TOKEN não definidos no .env');
  process.exit(1);
}
console.log('🔐 Segredos essenciais definidos (valores não exibidos)');

// --- Middlewares Essenciais ---
app.use(helmet({
  contentSecurityPolicy: false,
}));
const isProd = (process.env.NODE_ENV === 'production');
const parseOrigins = (raw) => String(raw || '').split(',').map(s => s.trim()).filter(Boolean);
const allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);
if (isProd && allowedOrigins.length === 0) {
  console.error('ERRO FATAL: ALLOWED_ORIGINS não definido em produção');
  process.exit(1);
}
const devOrigin = 'http://localhost:5173';
const devOriginAlt = 'http://127.0.0.1:5173';
app.use(cors({
  origin: (origin, callback) => {
    const list = isProd ? allowedOrigins : [devOrigin, devOriginAlt, ...allowedOrigins];
    const normalizedOrigin = origin ? origin.replace(/\/$/, '') : origin;
    const normalizedList = list.map(o => o.replace(/\/$/, ''));
    if (!normalizedOrigin) return callback(null, true);
    const devRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
    if (!isProd && devRegex.test(normalizedOrigin)) return callback(null, true);
    if (normalizedList.includes(normalizedOrigin)) return callback(null, true);
    return callback(new Error('CORS origin não permitido'), false);
  },
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE'],
  allowedHeaders: ['Content-Type','Authorization','x-csrf-token','x-admin-reset-token','X-Device-Id','x-device-id','X-Tracking-Id','x-tracking-id'],
  credentials: false,
}));
if (isProd) {
  app.use(helmet.hsts({ maxAge: 15552000 }));
}
app.use(compression());
// Aceita corpo text/plain para rotas que recebem JSON como string
app.use(express.text({ limit: '10mb', type: 'text/plain' }));
app.use(express.json({ limit: '10mb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login, tente novamente em 15 minutos.' },
  keyGenerator: (req) => {
    const raw = req.ip || '';
    const s = String(raw);
    const idx = s.indexOf(':');
    return idx > -1 ? s.slice(0, idx) : s || 'unknown';
  }
});
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

function logEvent(type, details) {
  try {
    const entry = { type, time: new Date().toISOString(), ...details };
    console.log(JSON.stringify(entry));
  } catch {
    console.log(`[LOG] ${type}`, details);
  }
}

function sanitizeString(s, maxLen = 2048) {
  if (typeof s !== 'string') return s;
  const trimmed = s.trim().slice(0, maxLen);
  return trimmed.replace(/<[^>]*>/g, '');
}

function validateEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePasswordStrength(pwd) {
  if (typeof pwd !== 'string') return false;
  const hasLen = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
  return hasLen && hasUpper && hasLower && hasDigit && hasSymbol;
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashResetToken(token) {
  const pepper = process.env.PASSWORD_RESET_PEPPER || '';
  return crypto.createHash('sha256').update(String(token) + pepper).digest('hex');
}

async function sendResetEmail(email, resetLink) {
  const webhook = process.env.RESET_EMAIL_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: email, link: resetLink }) });
      return true;
    } catch {
      return false;
    }
  }
  console.log('🔗 Link de reset (dev):', { email, resetLink });
  return true;
}

app.use((req, res, next) => {
  if (process.env.CSRF_ENABLED === 'true' && ['POST','PUT','DELETE','PATCH'].includes(req.method)) {
    const token = req.headers['x-csrf-token'];
    const expected = process.env.CSRF_SECRET || '';
    if (!expected || token !== expected) {
      return res.status(403).json({ error: 'CSRF token inválido' });
    }
  }
  next();
});

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

const MP_ENV = String(process.env.MP_ENV || process.env.MERCADO_PAGO_ENV || '').toLowerCase();
const MP_USE_PROD = MP_ENV === 'production' || MP_ENV === 'prod' || MP_ENV === 'live' || (!MP_ENV && (process.env.NODE_ENV || 'development') === 'production');
const MP_ACCESS_TOKEN = MP_USE_PROD
  ? (process.env.MERCADO_PAGO_ACCESS_TOKEN_PROD || process.env.MP_ACCESS_TOKEN_PROD || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '')
  : (process.env.MERCADO_PAGO_ACCESS_TOKEN_SANDBOX || process.env.MP_ACCESS_TOKEN_SANDBOX || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '');
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
    await pool.request().query(`IF COL_LENGTH('dbo.users', 'mfa_enabled') IS NULL BEGIN ALTER TABLE dbo.users ADD mfa_enabled BIT NOT NULL DEFAULT 0; END;`);
    await pool.request().query(`IF COL_LENGTH('dbo.users', 'mfa_secret') IS NULL BEGIN ALTER TABLE dbo.users ADD mfa_secret NVARCHAR(64) NULL; END;`);
    // Normalizações
    await pool.request().query(`UPDATE dbo.users SET role = ISNULL(role, 'viewer');`);
    await pool.request().query(`UPDATE dbo.users SET status = ISNULL(status, 'ativo');`);
    console.log('✅ Esquema de dbo.users verificado/ajustado');
  } catch (err) {
    console.error('Erro ao garantir esquema de dbo.users:', err);
  }
}

// --- Garantir colunas opcionais em dbo.projetos usadas pelo frontend ---
async function ensureProjetosOptionalColumns() {
  try {
    const pool = await getConnectionPool();
    await pool.request().query(`IF COL_LENGTH('dbo.projetos', 'preco') IS NULL BEGIN ALTER TABLE dbo.projetos ADD preco DECIMAL(10,2) NOT NULL CONSTRAINT DF_projetos_preco DEFAULT 0; END;`);
    await pool.request().query(`IF COL_LENGTH('dbo.projetos', 'progresso') IS NULL BEGIN ALTER TABLE dbo.projetos ADD progresso INT NOT NULL CONSTRAINT DF_projetos_progresso DEFAULT 0; END;`);
    console.log('✅ Esquema de dbo.projetos verificado/ajustado (preco, progresso)');
  } catch (err) {
    console.error('Erro ao garantir colunas opcionais de dbo.projetos (preco/progresso):', err);
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

// --- Garantir coluna mp_response_json em dbo.app_payments ---
async function ensureAppPaymentsSchema() {
  try {
    const pool = await getConnectionPool();
    await pool.request().query(`IF COL_LENGTH('dbo.app_payments', 'mp_response_json') IS NULL BEGIN ALTER TABLE dbo.app_payments ADD mp_response_json NVARCHAR(MAX) NULL; END;`);
    console.log('✅ Esquema de dbo.app_payments verificado/ajustado (mp_response_json)');
  } catch (err) {
    console.error('Erro ao garantir esquema de dbo.app_payments (mp_response_json):', err);
  }
}

// --- Garantir tabela de auditoria, colunas analíticas e índices (replica backups/2025-11-15_app_payments_audit_patch.sql) ---
async function ensurePaymentsAuditPatch() {
  const pool = await getConnectionPool();

  // Criação idempotente da tabela dbo.app_payments_audit
  await pool.request().query(`
    IF OBJECT_ID('dbo.app_payments_audit','U') IS NULL
    BEGIN
      CREATE TABLE dbo.app_payments_audit (
        id INT IDENTITY(1,1) PRIMARY KEY,
        payment_id NVARCHAR(64) NULL,
        preference_id NVARCHAR(64) NULL,
        app_id INT NOT NULL,
        user_id INT NULL,
        action NVARCHAR(64) NOT NULL,
        from_status NVARCHAR(32) NULL,
        to_status NVARCHAR(32) NULL,
        from_payment_id NVARCHAR(64) NULL,
        to_payment_id NVARCHAR(64) NULL,
        amount DECIMAL(18,2) NULL,
        currency NVARCHAR(8) NULL,
        payer_email NVARCHAR(128) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_app_payments_audit_app FOREIGN KEY (app_id) REFERENCES dbo.apps(id),
        CONSTRAINT FK_app_payments_audit_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
      );
    END;
  `);

  // Índice de auditoria: (app_id, created_at)
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes WHERE name = 'IX_app_payments_audit_app_date' AND object_id = OBJECT_ID('dbo.app_payments_audit')
    )
    BEGIN
      CREATE INDEX IX_app_payments_audit_app_date ON dbo.app_payments_audit(app_id, created_at);
    END;
  `);

  // Adição idempotente de colunas analíticas em dbo.app_payments
  const addColumnIfMissing = async (name, type) => {
    await pool.request().query(`
      IF COL_LENGTH('dbo.app_payments','${name}') IS NULL
      BEGIN
        ALTER TABLE dbo.app_payments ADD ${name} ${type} NULL;
      END;
    `);
  };

  await addColumnIfMissing('status_detail', 'NVARCHAR(64)');
  await addColumnIfMissing('payment_type_id', 'NVARCHAR(32)');
  await addColumnIfMissing('issuer_id', 'NVARCHAR(32)');
  await addColumnIfMissing('net_received_amount', 'DECIMAL(18,2)');
  await addColumnIfMissing('installment_amount', 'DECIMAL(18,2)');
  await addColumnIfMissing('payer_document_type', 'NVARCHAR(16)');
  await addColumnIfMissing('payer_document_number', 'NVARCHAR(32)');
  await addColumnIfMissing('mp_response_json', 'NVARCHAR(MAX)');

  // Índice em dbo.app_payments(status, updated_at)
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes WHERE name = 'IX_app_payments_status_updated' AND object_id = OBJECT_ID('dbo.app_payments')
    )
    BEGIN
      CREATE INDEX IX_app_payments_status_updated ON dbo.app_payments(status, updated_at);
    END;
  `);

  console.log('✅ ensurePaymentsAuditPatch: tabela de auditoria, colunas e índices garantidos');
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

// Expor chave pública do Mercado Pago para o frontend
app.get('/api/config/mp-public-key', (req, res) => {
  try {
    const publicKey = process.env.VITE_MERCADO_PAGO_PUBLIC_KEY || process.env.MERCADO_PAGO_PUBLIC_KEY || '';
    return res.json({ public_key: publicKey, present: !!publicKey });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
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
      payer_document_number: false,
      mp_response_json: false
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
    ['status_detail','payment_type_id','issuer_id','net_received_amount','installment_amount','payer_document_type','payer_document_number','mp_response_json']
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
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  (async () => {
    try {
      const pool = await getConnectionPool();
      const result = await pool.request()
        .input('email', dbSql.NVarChar, email)
        .query('SELECT id, name, email, role, status, password_hash, mfa_enabled, mfa_secret FROM dbo.users WHERE email = @email');

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

        if (process.env.MFA_ENABLED === 'true' && row.mfa_enabled) {
          const mfaCode = String(req.body?.mfa_code || '').trim();
          const secret = String(row.mfa_secret || '');
          const valid = verifyTotp(secret, mfaCode);
          if (!valid) {
            return res.status(401).json({ error: 'MFA requerido' });
          }
        }

      const user = { id: row.id, email: row.email, name: row.name, role: row.role || 'viewer' };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
      logEvent('auth_login_success', { user_id: user.id, role: user.role });
      return res.json({ success: true, token, user });
      }

      // Sem fallback: exige usuário no banco
      return res.status(401).json({ error: 'Credenciais inválidas' });
    } catch (err) {
      console.error('Erro no login:', err);
      logEvent('auth_login_error', { message: err?.message || String(err) });
      return res.status(500).json({ error: 'Erro interno no login' });
    }
  })();
});

// Solicitar reset de senha por e-mail (gera token único e expirável)
app.post('/api/auth/password-reset/request', sensitiveLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !validateEmail(email)) {
      return res.status(200).json({ success: true });
    }
    const pool = await getConnectionPool();
    const userQ = await pool.request().input('email', dbSql.NVarChar, email).query('SELECT id, email, status FROM dbo.users WHERE email=@email');
    const user = userQ.recordset[0] || null;
    if (!user || String(user.status || '').toLowerCase() === 'inativo') {
      return res.status(200).json({ success: true });
    }
    const token = generateResetToken();
    const hash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await pool.request()
      .input('user_id', dbSql.Int, user.id)
      .input('email', dbSql.NVarChar, user.email)
      .input('token_hash', dbSql.NVarChar, hash)
      .input('expires_at', dbSql.DateTime2, expiresAt)
      .query("INSERT INTO dbo.password_resets (user_id, email, token_hash, expires_at, used, created_at) VALUES (@user_id, @email, @token_hash, @expires_at, 0, SYSUTCDATETIME())");
    const base = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
    await sendResetEmail(user.email, link);
    logEvent('password_reset_request', { user_id: user.id });
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ success: true, reset_link: link });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro em password-reset/request:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// Confirmar reset de senha (consome token válido e atualiza senha)
app.post('/api/auth/password-reset/confirm', sensitiveLimiter, async (req, res) => {
  try {
    const { token, new_password } = req.body || {};
    if (!token || !new_password || !validatePasswordStrength(String(new_password))) {
      return res.status(400).json({ error: 'Token ou senha inválidos' });
    }
    const hash = hashResetToken(token);
    const pool = await getConnectionPool();
    const nowIso = new Date().toISOString();
    const prQ = await pool.request().input('token_hash', dbSql.NVarChar, hash).query("SELECT TOP(1) id, user_id, email, expires_at, used FROM dbo.password_resets WHERE token_hash=@token_hash ORDER BY created_at DESC");
    const pr = prQ.recordset[0] || null;
    if (!pr || pr.used || (pr.expires_at && new Date(pr.expires_at).toISOString() < nowIso)) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }
    const hashPwd = await bcrypt.hash(String(new_password), 10);
    await pool.request().input('id', dbSql.Int, pr.user_id).input('pwd', dbSql.NVarChar, hashPwd).query('UPDATE dbo.users SET password_hash=@pwd, updated_at=SYSUTCDATETIME() WHERE id=@id');
    await pool.request().input('id', dbSql.Int, pr.id).query('UPDATE dbo.password_resets SET used=1, consumed_at=SYSUTCDATETIME() WHERE id=@id');
    logEvent('password_reset_confirm', { user_id: pr.user_id });
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro em password-reset/confirm:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

function base32Encode(buf) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function generateMfaSecret() {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

function verifyTotp(base32Secret, token) {
  if (!base32Secret || !token) return false;
  const secret = base32ToBuffer(base32Secret);
  const period = 30;
  const now = Math.floor(Date.now() / 1000);
  for (let drift = -1; drift <= 1; drift++) {
    const counter = Math.floor(now / period) + drift;
    const code = totpCode(secret, counter);
    if (code === token) return true;
  }
  return false;
}

function base32ToBuffer(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const out = [];
  for (const ch of String(str).toUpperCase().replace(/=+$/,'')) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totpCode(secretBuf, counter) {
  const ctr = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    ctr[i] = counter & 0xff;
    counter = counter >>> 8;
  }
  const hmac = crypto.createHmac('sha1', secretBuf).update(ctr).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  const otp = (binCode % 1e6).toString().padStart(6, '0');
  return otp;
}

app.post('/api/auth/mfa/setup', authenticate, async (req, res) => {
  try {
    const pool = await getConnectionPool();
    const secret = generateMfaSecret();
    await pool.request()
      .input('id', dbSql.Int, req.user.id)
      .input('secret', dbSql.NVarChar, secret)
      .query('UPDATE dbo.users SET mfa_secret = @secret, updated_at = SYSUTCDATETIME() WHERE id = @id');
    const issuer = encodeURIComponent('CodeCraft');
    const label = encodeURIComponent(req.user.email || 'user');
    const otpauth = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&period=30&digits=6&algorithm=SHA1`;
    logEvent('mfa_setup', { user_id: req.user.id });
    return res.json({ success: true, secret, otpauth });
  } catch (err) {
    console.error('Erro em MFA setup:', err);
    return res.status(500).json({ error: 'Falha em MFA setup' });
  }
});

app.post('/api/auth/mfa/enable', authenticate, async (req, res) => {
  try {
    const { code } = req.body || {};
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('id', dbSql.Int, req.user.id)
      .query('SELECT mfa_secret FROM dbo.users WHERE id = @id');
    const secret = result.recordset[0]?.mfa_secret || '';
    if (!secret || !verifyTotp(secret, String(code || ''))) {
      return res.status(400).json({ error: 'Código 2FA inválido' });
    }
    await pool.request()
      .input('id', dbSql.Int, req.user.id)
      .query('UPDATE dbo.users SET mfa_enabled = 1, updated_at = SYSUTCDATETIME() WHERE id = @id');
    logEvent('mfa_enable', { user_id: req.user.id });
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro em MFA enable:', err);
    return res.status(500).json({ error: 'Falha ao habilitar MFA' });
  }
});

app.post('/api/auth/mfa/disable', authenticate, async (req, res) => {
  try {
    const pool = await getConnectionPool();
    await pool.request()
      .input('id', dbSql.Int, req.user.id)
      .query('UPDATE dbo.users SET mfa_enabled = 0, mfa_secret = NULL, updated_at = SYSUTCDATETIME() WHERE id = @id');
    logEvent('mfa_disable', { user_id: req.user.id });
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro em MFA disable:', err);
    return res.status(500).json({ error: 'Falha ao desabilitar MFA' });
  }
});

// Rota segura para reset de senha do admin via token (para recuperar acesso)
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/auth/admin/reset-password', authenticate, authorizeAdmin, async (req, res) => {
    try {
      const token = req.headers['x-admin-reset-token'] || '';
      if (!ADMIN_RESET_TOKEN || token !== ADMIN_RESET_TOKEN) {
        return res.status(403).json({ error: 'Token de reset inválido ou não configurado' });
      }
      const { email, new_password } = req.body || {};
      if (!email || !new_password) {
        return res.status(400).json({ error: 'email e new_password são obrigatórios' });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Email inválido' });
      }
      if (!validatePasswordStrength(String(new_password))) {
        return res.status(400).json({ error: 'Senha fraca: mínimo 8 caracteres, com maiúsculas, minúsculas, números e símbolos' });
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
      logEvent('admin_reset_password', { admin_id: req.user?.id, target_user_id: row.id });
      return res.json({ success: true });
    } catch (err) {
      console.error('Erro no reset de senha admin:', err);
      logEvent('admin_reset_password_error', { admin_id: req.user?.id, message: err?.message || String(err) });
      return res.status(500).json({ error: 'Erro interno' });
    }
  });
} else {
  console.log('🔒 Rota /api/auth/admin/reset-password desativada em produção');
}

// --- Rotas de Usuários Admin ---
app.get('/api/auth/users', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const result = await pool.request().query('SELECT id, name, email, role, status FROM dbo.users');
    const users = result.recordset.map(mapUserRow);
    res.json({ success: true, data: users });
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
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    if (!validatePasswordStrength(String(senha))) {
      return res.status(400).json({ error: 'Senha fraca: mínimo 8 caracteres, com maiúsculas, minúsculas, números e símbolos' });
    }
    const nomeSafe = sanitizeString(String(nome), 128);
    const emailSafe = sanitizeString(String(email), 128);
    const hash = await bcrypt.hash(String(senha), 10);

    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('name', dbSql.NVarChar, nomeSafe)
      .input('email', dbSql.NVarChar, emailSafe)
      .input('role', dbSql.NVarChar, role || 'viewer')
      .input('status', dbSql.NVarChar, 'ativo')
      .input('pwd', dbSql.NVarChar, hash)
      .query(`
        INSERT INTO dbo.users (name, email, role, status, password_hash, created_at)
        OUTPUT Inserted.id, Inserted.name, Inserted.email, Inserted.role, Inserted.status
        VALUES (@name, @email, @role, @status, @pwd, SYSUTCDATETIME())
      `);
    const user = mapUserRow(result.recordset[0]);
    logEvent('admin_user_create', { admin_id: req.user?.id, created_user_id: user.id });
    res.status(201).json({ success: true, user });
  } catch (err) {
    if (err && (err.number === 2627 || String(err.message).includes('UNIQUE'))) {
      return res.status(409).json({ error: 'Email já cadastrado.' });
    }
    console.error('Erro ao criar usuário:', err);
    logEvent('admin_user_create_error', { admin_id: req.user?.id, message: err?.message || String(err) });
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
    logEvent('projects_list_error', { message: err?.message || String(err) });
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
  const tituloSafe = sanitizeString(String(titulo), 256);
  const descricaoSafe = descricao ? sanitizeString(String(descricao), 4000) : null;
  const thumbSafe = thumb_url ? sanitizeString(String(thumb_url), 512) : null;

  try {
    const pool = await getConnectionPool();
    const query = `
      INSERT INTO dbo.projetos (titulo, nome, descricao, tecnologias, status, data_inicio, thumb_url, mentor_id, progresso, preco)
      OUTPUT Inserted.* VALUES (@titulo, @nome, @descricao, @tecnologias, @status, @data_inicio, @thumb_url, @mentor_id, @progresso, @preco)
    `;

    const result = await pool.request()
      .input('titulo', dbSql.NVarChar, tituloSafe)
      .input('nome', dbSql.NVarChar, tituloSafe)
      .input('descricao', dbSql.NVarChar, descricaoSafe)
      .input('tecnologias', dbSql.NVarChar, tecnologiasString)
      .input('status', dbSql.NVarChar, status || 'rascunho')
      .input('data_inicio', dbSql.DateTime2, data_inicio ? new Date(data_inicio) : null)
      .input('thumb_url', dbSql.NVarChar, thumbSafe)
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
  const tituloSafe = sanitizeString(String(titulo), 256);
  const descricaoSafe = descricao ? sanitizeString(String(descricao), 4000) : null;
  const thumbSafe = thumb_url ? sanitizeString(String(thumb_url), 512) : null;

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
      .input('titulo', dbSql.NVarChar, tituloSafe)
      .input('nome', dbSql.NVarChar, tituloSafe)
      .input('descricao', dbSql.NVarChar, descricaoSafe)
      .input('tecnologias', dbSql.NVarChar, tecnologiasString)
      .input('status', dbSql.NVarChar, status)
      .input('data_inicio', dbSql.DateTime2, data_inicio ? new Date(data_inicio) : null)
      .input('thumb_url', dbSql.NVarChar, thumbSafe)
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
      .input('nome', dbSql.NVarChar, sanitizeString(String(nome), 128))
      .input('email', dbSql.NVarChar, sanitizeString(String(email), 128))
      .input('telefone', dbSql.NVarChar, telefone ? sanitizeString(String(telefone), 64) : null)
      .input('bio', dbSql.NVarChar(dbSql.MAX), bio ? sanitizeString(String(bio), 4000) : null)
      .input('avatar_url', dbSql.NVarChar, avatar_url ? sanitizeString(String(avatar_url), 512) : null)
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
      .input('nome', dbSql.NVarChar, nome ? sanitizeString(String(nome), 128) : null)
      .input('email', dbSql.NVarChar, email ? sanitizeString(String(email), 128) : null)
      .input('telefone', dbSql.NVarChar, telefone ? sanitizeString(String(telefone), 64) : null)
      .input('bio', dbSql.NVarChar(dbSql.MAX), bio ? sanitizeString(String(bio), 4000) : null)
      .input('avatar_url', dbSql.NVarChar, avatar_url ? sanitizeString(String(avatar_url), 512) : null)
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
      points: c.pontos,
      active: !!c.ativo
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
      .input('nome', dbSql.NVarChar, sanitizeString(String(nome), 128))
      .input('email', dbSql.NVarChar, email ? sanitizeString(String(email), 128) : null)
      .input('avatar_url', dbSql.NVarChar, avatar_url ? sanitizeString(String(avatar_url), 512) : null)
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

// Buscar um Crafter por ID
app.get('/api/crafters/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('id', dbSql.Int, id)
      .query('SELECT id, nome, email, avatar_url, pontos, nivel, ativo FROM dbo.crafters WHERE id = @id');

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ error: 'Crafter não encontrado' });
    }

    const row = result.recordset[0];
    const crafter = { ...row, points: row.pontos, active: !!row.ativo };
    return res.json({ success: true, data: crafter });
  } catch (err) {
    console.error('Erro ao buscar crafter por id:', err);
    next(err);
  }
});

// Atualizar um Crafter
app.put('/api/crafters/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const { nome, email, avatar_url, pontos, nivel, ativo } = req.body || {};

    const pool = await getConnectionPool();
    const request = pool.request()
      .input('id', dbSql.Int, id)
      .input('nome', dbSql.NVarChar, nome != null ? sanitizeString(String(nome), 128) : null)
      .input('email', dbSql.NVarChar, email != null ? sanitizeString(String(email), 128) : null)
      .input('avatar_url', dbSql.NVarChar, avatar_url != null ? sanitizeString(String(avatar_url), 512) : null)
      .input('pontos', dbSql.Int, typeof pontos === 'number' ? pontos : null)
      .input('nivel', dbSql.NVarChar, nivel != null ? sanitizeString(String(nivel), 64) : null)
      .input('ativo', dbSql.Bit, typeof ativo === 'boolean' ? (ativo ? 1 : 0) : null);

    const fields = [];
    if (nome !== undefined) fields.push('nome = @nome');
    if (email !== undefined) fields.push('email = @email');
    if (avatar_url !== undefined) fields.push('avatar_url = @avatar_url');
    if (pontos !== undefined) fields.push('pontos = @pontos');
    if (nivel !== undefined) fields.push('nivel = @nivel');
    if (ativo !== undefined) fields.push('ativo = @ativo');

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    const updateSql = `UPDATE dbo.crafters SET ${fields.join(', ')}, updated_at = SYSUTCDATETIME() WHERE id = @id`;
    const upd = await request.query(updateSql);
    if (!upd.rowsAffected || upd.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Crafter não encontrado' });
    }

    // Retorna registro atualizado
    const getRes = await pool.request().input('id', dbSql.Int, id).query('SELECT id, nome, email, avatar_url, pontos, nivel, ativo FROM dbo.crafters WHERE id = @id');
    const row = getRes.recordset[0];
    const crafter = { ...row, points: row.pontos, active: !!row.ativo };
    return res.json({ success: true, data: crafter });
  } catch (err) {
    console.error('Erro ao atualizar crafter:', err);
    next(err);
  }
});

// Excluir (remover) um Crafter
app.delete('/api/crafters/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const pool = await getConnectionPool();

    // Remover dependências conhecidas
    await pool.request().input('id', dbSql.Int, id).query('DELETE FROM dbo.equipes WHERE crafter_id = @id');
    try {
      await pool.request().input('id', dbSql.Int, id).query('DELETE FROM dbo.ranking_top3 WHERE crafter_id = @id');
    } catch {
      // Ignora se tabela não existir
    }

    const del = await pool.request().input('id', dbSql.Int, id).query('DELETE FROM dbo.crafters WHERE id = @id');
    if (!del.rowsAffected || del.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Crafter não encontrado' });
    }
    return res.json({ success: true, removed: true });
  } catch (err) {
    console.error('Erro ao excluir crafter:', err);
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
    res.json({ success: true, data: result.recordset });
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
      .input('nome', dbSql.NVarChar, sanitizeString(String(nome), 128))
      .input('email', dbSql.NVarChar, sanitizeString(String(email), 128))
      .input('telefone', dbSql.NVarChar, telefone ? sanitizeString(String(telefone), 64) : null)
      .input('cidade', dbSql.NVarChar, cidade ? sanitizeString(String(cidade), 64) : null)
      .input('estado', dbSql.NVarChar, estado ? sanitizeString(String(estado), 32) : null)
      .input('area', dbSql.NVarChar, area_interesse ? sanitizeString(String(area_interesse), 64) : null)
      .input('obs', dbSql.NVarChar, mensagem ? sanitizeString(String(mensagem), 4000) : null)
      .query(query);

    res.status(201).json({ success: true, data: result.recordset[0] });

  } catch (err) {
    console.error('Erro ao salvar inscrição:', err);
    next(err);
  }
});

// --- Rota para atualizar status da inscrição ---
app.put('/api/inscricoes/:id/status', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }
    
    // Validar status permitidos
    const statusPermitidos = ['pendente', 'contato_realizado', 'confirmado', 'rejeitado'];
    if (!statusPermitidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    const pool = await getConnectionPool();
    
    // Verificar se a inscrição existe
    const checkResult = await pool.request()
      .input('id', dbSql.Int, id)
      .query('SELECT id FROM dbo.inscricoes WHERE id = @id');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Inscrição não encontrada' });
    }
    
    // Atualizar o status
    const updateResult = await pool.request()
      .input('id', dbSql.Int, id)
      .input('status', dbSql.NVarChar, status)
      .query('UPDATE dbo.inscricoes SET status = @status WHERE id = @id');
    
    if (updateResult.rowsAffected[0] === 0) {
      return res.status(500).json({ error: 'Falha ao atualizar status' });
    }
    
    // Retornar a inscrição atualizada
    const updatedResult = await pool.request()
      .input('id', dbSql.Int, id)
      .query('SELECT * FROM dbo.inscricoes WHERE id = @id');
    
    res.json({ success: true, data: updatedResult.recordset[0] });
    
  } catch (err) {
    console.error('Erro ao atualizar status da inscrição:', err);
    next(err);
  }
});

// --- Remover uma inscrição ---
app.delete('/api/inscricoes/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const pool = await getConnectionPool();

    const del = await pool.request()
      .input('id', dbSql.Int, id)
      .query('DELETE FROM dbo.inscricoes WHERE id = @id');

    if (!del.rowsAffected || del.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Inscrição não encontrada' });
    }

    res.json({ success: true, removed: true });
  } catch (err) {
    console.error('Erro ao excluir inscrição:', err);
    next(err);
  }
});

// --- Rotas de Finanças (Lógica 4) ---
app.get('/api/financas', authenticate, authorizeAdmin, async (req, res, next) => {
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
app.get('/api/dashboard/resumo', authenticate, authorizeAdmin, async (req, res, next) => {
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


// --- Rotas de Aplicativos (Conectadas ao Banco) ---
// Lista apps do usuário (permite acesso sem autenticação no ambiente atual)
app.get('/api/apps/mine', authenticate, async (req, res, next) => {
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
    console.error('Erro ao listar apps do usuário:', err);
    next(err);
  }
});

// Lista todos apps (admin)
app.get('/api/apps', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { page = 1, pageSize, limit, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt((pageSize ?? limit ?? 50), 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const allowedSortColumns = {
      'created_at': 'created_at',
      'name': 'name',
      'status': 'status',
      'id': 'id',
      'price': 'price',
    };
    const sortColumn = allowedSortColumns[String(sortBy).toLowerCase()] || 'created_at';
    const sortDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pool = await getConnectionPool();
    const request = pool.request();
    const totalResult = await request.query('SELECT COUNT(*) as total FROM dbo.apps');
    const total = totalResult.recordset[0]?.total || 0;
    const totalPages = Math.ceil(total / Math.max(1, limitNum));

    const dataQuery = `
      SELECT 
        id,
        owner_id AS ownerId,
        name,
        main_feature AS mainFeature,
        description,
        status,
        price,
        thumbnail,
        executable_url AS executableUrl,
        created_at
      FROM dbo.apps
      ORDER BY ${sortColumn} ${sortDirection}
      OFFSET @offset ROWS 
      FETCH NEXT @limit ROWS ONLY
    `;
    request.input('offset', dbSql.Int, offset);
    request.input('limit', dbSql.Int, limitNum);
    const dataResult = await request.query(dataQuery);

    return res.json({
      success: true,
      data: dataResult.recordset || [],
      pagination: {
        total,
        page: pageNum,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      }
    });
  } catch (err) {
    console.error('Erro ao buscar aplicativos (do banco):', err);
    next(err);
  }
});

// Lista todos apps (público) – sem autenticação
app.get('/api/apps/public', async (req, res, next) => {
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
    console.error('Erro ao listar apps públicos:', err);
    next(err);
  }
});

// Detalhes de um app (público para exibição na página de compra)
app.get('/api/apps/:id', async (req, res, next) => {
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
    return res.status(404).json({ error: 'Aplicativo não encontrado' });
  } catch (err) {
    console.error('Erro ao buscar app por id:', err);
    next(err);
  }
});

app.post('/api/apps', authenticate, authorizeAdmin, async (req, res) => {
  const { name, mainFeature, description, status, price, thumbnail, executableUrl, ownerId } = req.body || {};
  if (!name || String(name).trim().length === 0) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  try {
    const pool = await getConnectionPool();
    const metaRes = await pool.request().query(`SELECT COLUMNPROPERTY(OBJECT_ID('dbo.apps'),'id','IsIdentity') AS isIdentity`);
    const isIdentity = !!(metaRes.recordset && metaRes.recordset[0] && metaRes.recordset[0].isIdentity === 1);
    const reqBase = pool.request()
      .input('owner_id', dbSql.Int, ownerId ?? (req.user?.id || 1))
      .input('name', dbSql.NVarChar, String(name))
      .input('main_feature', dbSql.NVarChar, mainFeature ? String(mainFeature) : null)
      .input('description', dbSql.NVarChar, description ? String(description) : null)
      .input('status', dbSql.NVarChar, status ? String(status) : 'draft')
      .input('price', dbSql.Decimal(10, 2), Number(price || 0))
      .input('thumbnail', dbSql.NVarChar, thumbnail || null)
      .input('executable_url', dbSql.NVarChar, executableUrl || null);

    let newId = null;
    if (isIdentity) {
      const insertRes = await reqBase.query(`INSERT INTO dbo.apps (owner_id, name, main_feature, description, status, price, thumbnail, executable_url)
                                             VALUES (@owner_id, @name, @main_feature, @description, @status, @price, @thumbnail, @executable_url);
                                             SELECT SCOPE_IDENTITY() AS id;`);
      newId = insertRes.recordset?.[0]?.id ? parseInt(insertRes.recordset[0].id, 10) : null;
    } else {
      const nextRes = await pool.request().query(`SELECT ISNULL(MAX(id),0)+1 AS nextId FROM dbo.apps`);
      newId = nextRes.recordset?.[0]?.nextId ? parseInt(nextRes.recordset[0].nextId, 10) : null;
      await reqBase.input('id', dbSql.Int, newId).query(`INSERT INTO dbo.apps (id, owner_id, name, main_feature, description, status, price, thumbnail, executable_url)
                                                         VALUES (@id, @owner_id, @name, @main_feature, @description, @status, @price, @thumbnail, @executable_url);`);
    }
    const rowRes = await pool.request().input('id', dbSql.Int, newId).query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at FROM dbo.apps WHERE id=@id`);
    return res.status(201).json({ success: true, data: rowRes.recordset?.[0] || { id: newId, name } });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Erro ao criar aplicativo' });
  }
});

// Criar/atualizar card de app a partir de um projeto (admin)
app.post('/api/apps/from-project/:projectId', authenticate, authorizeAdmin, async (req, res, next) => {
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
    console.error('Erro ao criar/atualizar app a partir de projeto:', err);
    next(err);
  }
});

// Inserção de app no banco em ambiente de desenvolvimento, protegida por ADMIN_RESET_TOKEN
// Útil para popular dbo.apps sem exigir fluxo de autenticação completo
app.post('/api/apps/dev/insert', authenticate, authorizeAdmin, async (req, res) => {
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
  const { name, mainFeature, price, thumbnail, executableUrl, status, ownerId, description } = req.body || {};
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
      description: description !== undefined ? description : cur.description,
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
      .input('description', dbSql.NVarChar, next.description)
      .query(`UPDATE dbo.apps SET owner_id=@owner_id, name=@name, main_feature=@main_feature, description=@description, status=@status, price=@price, thumbnail=@thumbnail, executable_url=@executable_url WHERE id=@id`);
    const outRes = await pool.request().input('id', dbSql.Int, id).query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at FROM dbo.apps WHERE id=@id`);
    return res.json({ success: true, data: outRes.recordset[0] });
  } catch (err) {
    console.error('Erro ao editar app:', err);
    return res.status(500).json({ error: 'Erro ao editar aplicativo' });
  }
});

app.delete('/api/apps/:id', authenticate, authorizeAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const pool = await getConnectionPool();
    const exists = await pool.request().input('id', dbSql.Int, id).query('SELECT id FROM dbo.apps WHERE id=@id');
    if (!exists.recordset.length) return res.status(404).json({ error: 'Aplicativo não encontrado' });
    await pool.request().input('id', dbSql.Int, id).query('DELETE FROM dbo.apps WHERE id=@id');
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Erro ao excluir aplicativo' });
  }
});

// Mercado Livre/Mercado Pago – criar preferência de pagamento (mock)
app.post('/api/apps/:id/purchase', sensitiveLimiter, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    // Buscar app no banco
    let appItem = null;
    try {
      const pool = await getConnectionPool();
      const dataRes = await pool.request()
        .input('id', dbSql.Int, id)
        .query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at FROM dbo.apps WHERE id = @id`);
      appItem = dataRes.recordset[0] || null;
    } catch (dbErr) {
      console.error('Erro ao buscar app para preferência:', dbErr?.message || dbErr);
      return res.status(500).json({ error: 'Erro interno ao buscar aplicativo' });
    }
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
      console.info('Preferência Mercado Pago', { preference_id, external_reference: String(id), amount: Number(appItem.price || 0) });
      // Persistir metadados básicos da compra para sincronização pós-aprovação
      paymentsByApp.set(id, {
        payment_id: preference_id,
        status: 'pending',
        buyer: { id: req.user?.id, email: req.user?.email, name: req.user?.name },
        amount: Number(appItem.price || 0),
        products: [{ title: appItem.name, quantity: 1, unit_price: Number(appItem.price || 0) }],
      });
      // Histórico será persistido no banco abaixo
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

  // Sem fallback: requer mpClient configurado
  return res.status(503).json({ error: 'Mercado Pago não configurado' });
});

// Consultar status da compra (mock)
app.get('/api/apps/:id/purchase/status', sensitiveLimiter, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status: statusQuery, payment_id } = req.query;
  // Buscar app no banco
  let appItem = null;
  try {
    const pool = await getConnectionPool();
    const dataRes = await pool.request()
      .input('id', dbSql.Int, id)
      .query(`SELECT id, name, price, executable_url AS executableUrl FROM dbo.apps WHERE id = @id`);
    appItem = dataRes.recordset[0] || null;
  } catch (dbErr) {
    console.error('Erro ao buscar app para status de compra:', dbErr?.message || dbErr);
    return res.status(500).json({ error: 'Erro interno ao buscar aplicativo' });
  }
  if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });

  if (mpClient && payment_id) {
    try {
      const payment = new Payment(mpClient);
      const data = await payment.get({ id: payment_id });
      const status = data?.status || statusQuery || 'pending';
      const download_url = status === 'approved' ? (appItem.executableUrl || null) : null;
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
          console.warn('Sync Mercado Livre falhou:', syncErr?.message || syncErr);
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
app.post('/api/apps/:id/download', authenticate, sensitiveLimiter, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  let appItem = null;
  try {
    const pool = await getConnectionPool();
    const dataRes = await pool.request()
      .input('id', dbSql.Int, id)
      .query(`SELECT id, name, executable_url AS executableUrl FROM dbo.apps WHERE id=@id`);
    appItem = dataRes.recordset[0] || null;
  } catch (dbErr) {
    console.error('Erro ao buscar app para download:', dbErr?.message || dbErr);
    return res.status(500).json({ error: 'Erro interno ao buscar aplicativo' });
  }
  if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });
  const statusOk = paymentsByApp.get(id)?.status === 'approved';
  if (!statusOk) return res.status(403).json({ error: 'Download não liberado. Pagamento não aprovado.' });
  const url = appItem.executableUrl || null;
  if (!url) return res.status(400).json({ error: 'Aplicativo sem URL de executável configurada' });
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
  return res.json({ success: true, download_url: url });
});

// Histórico de compras e downloads (mock, sem autenticação para usuário comum)
app.get('/api/apps/history', async (req, res, next) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '20', 10);
  const offset = (page - 1) * pageSize;
  try {
    const pool = await getConnectionPool();
    const totalRes = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.app_history');
    const total = totalRes.recordset[0]?.total || 0;
    const dataRes = await pool.request()
      .input('offset', dbSql.Int, offset)
      .input('limit', dbSql.Int, pageSize)
      .query('SELECT id, type, app_id AS appId, app_name AS app_name, status, created_at FROM dbo.app_history ORDER BY id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY');
    return res.json({ success: true, data: dataRes.recordset || [], pagination: { total, page, pageSize } });
  } catch (err) {
    console.error('Erro ao listar histórico de apps:', err);
    next(err);
  }
});

// Feedback do app (mock)
app.post('/api/apps/:id/feedback', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rating = 5, comment = '' } = req.body || {};
  try {
    const pool = await getConnectionPool();
    // Garante que app existe
    const appRes = await pool.request().input('id', dbSql.Int, id).query('SELECT id, name FROM dbo.apps WHERE id=@id');
    if (!appRes.recordset[0]) return res.status(404).json({ error: 'Aplicativo não encontrado' });
    await pool.request()
      .input('app_id', dbSql.Int, id)
      .input('user_id', dbSql.Int, req.user?.id || null)
      .input('rating', dbSql.Int, Number(rating))
      .input('comment', dbSql.NVarChar, String(comment || ''))
      .query('INSERT INTO dbo.app_feedbacks (app_id, user_id, rating, comment) VALUES (@app_id, @user_id, @rating, @comment)');
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Erro ao registrar feedback:', err);
    return res.status(500).json({ error: 'Erro ao registrar feedback' });
  }
});

const mpFriendlyMessage = (status, detail) => {
  const d = String(detail || '').toLowerCase();
  if (d === 'cc_rejected_high_risk') return 'Pagamento recusado por segurança. Tente outro cartão ou entre em contato com o banco.';
  if (d === 'cc_rejected_insufficient_amount') return 'Pagamento recusado por saldo insuficiente.';
  if (d === 'cc_rejected_bad_filled_card_number') return 'Número do cartão inválido.';
  if (d === 'cc_rejected_bad_filled_date') return 'Data de validade inválida.';
  if (d === 'cc_rejected_bad_filled_other') return 'Dados do cartão incompletos.';
  if (d === 'cc_rejected_blacklist') return 'Pagamento recusado por segurança.';
  if (d === 'cc_rejected_call_for_authorize') return 'Autorização necessária junto ao banco.';
  if (d === 'cc_rejected_card_disabled') return 'Cartão desativado.';
  if (d === 'cc_rejected_duplicated_payment') return 'Pagamento duplicado.';
  if (d === 'cc_rejected_invalid_installments') return 'Parcelamento inválido.';
  if (d === 'cc_rejected_max_attempts') return 'Número de tentativas excedido.';
  if (d === 'cc_rejected_other_reason') return 'Pagamento recusado.';
  if (d === 'pending_contingency') return 'Pagamento pendente por contingência.';
  if (d === 'pending_review_manual') return 'Pagamento em análise.';
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'Pagamento aprovado.';
  if (s === 'pending') return 'Pagamento pendente.';
  return 'Pagamento não aprovado. Verifique os dados e tente novamente.';
};

const normalizeMpPaymentResponse = (json) => {
  const status = json?.status || 'pending';
  const detail = json?.status_detail || null;
  const message = mpFriendlyMessage(status, detail);
  return {
    sucesso: status === 'approved',
    status,
    status_detail: detail,
    mensagem_usuario: message,
  };
};

app.post('/api/apps/:id/payment/direct', sensitiveLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Buscar app no banco
    let appItem = null;
    try {
      const pool = await getConnectionPool();
      const dataRes = await pool.request()
        .input('id', dbSql.Int, id)
        .query(`SELECT id, owner_id AS ownerId, name, main_feature AS mainFeature, description, status, price, thumbnail, executable_url AS executableUrl, created_at FROM dbo.apps WHERE id = @id`);
      appItem = dataRes.recordset[0] || null;
    } catch (dbErr) {
      console.error('Erro ao buscar app para pagamento direto:', dbErr?.message || dbErr);
      return res.status(500).json({ error: 'Erro interno ao buscar aplicativo' });
    }
    if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });

    const rawBody = req.body;
    let parsedBody = rawBody;
    if (typeof rawBody === 'string') {
      try { parsedBody = JSON.parse(rawBody); } catch { parsedBody = {}; }
    }
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
    } = parsedBody || {};

    if (parsedBody && parsedBody.payer && typeof parsedBody.payer === 'object') {
      try { delete parsedBody.payer.name; } catch { /* noop */ }
    }

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

    const safePayer = (() => {
      const p = typeof payer === 'object' ? payer : {};
      const email = typeof p.email === 'string' ? p.email : undefined;
      const first_name = typeof p.first_name === 'string' ? p.first_name : undefined;
      const last_name = typeof p.last_name === 'string' ? p.last_name : undefined;
      const idObj = (p.identification && typeof p.identification === 'object') ? p.identification : {};
      const idNumber = typeof idObj.number === 'string' ? idObj.number : undefined;
      const idType = typeof idObj.type === 'string' ? idObj.type : (idNumber ? (idNumber.replace(/\D/g,'').length > 11 ? 'CNPJ' : 'CPF') : undefined);
      const identification = (idType && idNumber) ? { type: idType, number: idNumber } : undefined;
      return { email, first_name, last_name, ...(identification ? { identification } : {}) };
    })();

    // Corpo da requisição de pagamento
    const amount = Number(appItem.price || 0);
    const envProcessingMode = String(process.env.MERCADO_PAGO_PROCESSING_MODE || process.env.MP_PROCESSING_MODE || 'aggregator').toLowerCase();
    const finalProcessingMode = ['aggregator','gateway'].includes(envProcessingMode) ? envProcessingMode : 'aggregator';
    const finalBinaryMode = (typeof binary_mode === 'boolean') ? binary_mode : false;

      const payload = {
        description: description || `Pagamento do app ${appItem.name}`,
        external_reference: String(external_reference || id),
        transaction_amount: amount,
        payment_method_id,
        ...(typeof installments === 'number' && installments > 0 ? { installments } : {}),
        ...(parsedBody && parsedBody.issuer_id ? { issuer_id: parsedBody.issuer_id } : {}),
        ...(token ? { token } : {}),
        payer: {
          email: safePayer.email,
          ...(safePayer.first_name ? { first_name: safePayer.first_name } : {}),
          ...(safePayer.last_name ? { last_name: safePayer.last_name } : {}),
          ...(safePayer.identification ? { identification: safePayer.identification } : {}),
        },
      additional_info: {
        ...(additional_info || {}),
        items,
        payer: {
          first_name: safePayer.first_name,
          last_name: safePayer.last_name,
        },
        ip_address: String((req.headers['x-forwarded-for'] || '').split(',')[0] || req.ip || ''),
      },
      binary_mode: finalBinaryMode,
      processing_mode: finalProcessingMode,
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
          ...(req.headers['x-device-id'] ? { 'X-Device-Id': String(req.headers['x-device-id']) } : {}),
          ...(req.headers['x-mp-device-id'] ? { 'X-Device-Id': String(req.headers['x-mp-device-id']) } : {}),
          ...(req.headers['x-tracking-id'] ? { 'X-Tracking-Id': String(req.headers['x-tracking-id']) } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      console.error('ERRO DETALHADO DO FETCH (netErr):', netErr);
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
      console.warn('Falha na criação de pagamento direto', resp.status, { message: json?.message, error: json?.error, cause: json?.cause });
      const normalized = json && typeof json === 'object' ? normalizeMpPaymentResponse(json) : null;
      return res.status(resp.status).json({ error: 'Falha ao criar pagamento direto', mp_status: resp.status, details: json, ...(normalized ? { normalized } : {}) });
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

    console.info('Pagamento Mercado Pago', { payment_id, status, status_detail: statusDetail, external_reference: String(payload.external_reference || id), amount });
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
        .input('mp_response_json', dbSql.NVarChar(dbSql.MAX), JSON.stringify(json))
        .query("UPDATE dbo.app_payments SET payment_id=@pid, status=@status, amount=@amount, currency=@currency, payer_email=@payer_email, status_detail=@status_detail, payment_type_id=@payment_type_id, issuer_id=@issuer_id, net_received_amount=@net_received_amount, installment_amount=@installment_amount, payer_document_type=@payer_document_type, payer_document_number=@payer_document_number, mp_response_json=@mp_response_json, updated_at=SYSUTCDATETIME() WHERE app_id=@app_id AND status='pending'");

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
          .input('mp_response_json', dbSql.NVarChar(dbSql.MAX), JSON.stringify(json))
          .query('INSERT INTO dbo.app_payments (payment_id, app_id, user_id, status, amount, currency, payer_email, source, status_detail, payment_type_id, issuer_id, net_received_amount, installment_amount, payer_document_type, payer_document_number, mp_response_json) VALUES (@pid, @app_id, @user_id, @status, @amount, @currency, @payer_email, @source, @status_detail, @payment_type_id, @issuer_id, @net_received_amount, @installment_amount, @payer_document_type, @payer_document_number, @mp_response_json)');
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

    const normalized = normalizeMpPaymentResponse(json);
    return res.status(201).json({ success: true, payment_id, status, friendly_message: normalized.mensagem_usuario, normalized, result: json });
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
app.post('/api/apps/webhook', webhookLimiter, async (req, res) => {
  try {
    const { type, data } = req.body || {};
    if (type === 'payment' && data?.id) {
      await handlePaymentWebhook(data.id);
    }
    res.status(200).json({ received: true });
  } catch {
    res.status(500).json({ error: 'Webhook POST error' });
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
app.get('/api/admin/app-payments', authenticate, authorizeAdmin, async (req, res) => {
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
app.get('/api/admin/app-payments/:pid', authenticate, authorizeAdmin, async (req, res) => {
  const pid = String(req.params?.pid || '').trim();
  if (!pid) return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'pid é obrigatório' });
  try {
    const pool = await getConnectionPool();
    const req1 = pool.request().input('pid', dbSql.NVarChar, pid);
    const paymentResp = await req1.query(`SELECT TOP(1)
      payment_id, app_id, preference_id, status, amount, currency, payer_email, source, updated_at,
      status_detail, payment_type_id, issuer_id, net_received_amount, installment_amount, payer_document_type, payer_document_number, metadata, mp_response_json
      FROM dbo.app_payments WHERE payment_id=@pid`);
    const payment = paymentResp?.recordset?.[0] || null;
    const auditResp = await pool.request().input('pid', dbSql.NVarChar, pid)
      .query(`SELECT TOP(200)
        payment_id,
        app_id,
        action AS event,
        to_status AS status,
        created_at,
        CAST(NULL AS NVARCHAR(255)) AS notes,
        action,
        from_status,
        to_status,
        from_payment_id,
        to_payment_id,
        amount,
        currency,
        payer_email
      FROM dbo.app_payments_audit
      WHERE payment_id=@pid
      ORDER BY created_at DESC`);
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
  await ensureProjetosOptionalColumns();
  await ensurePaymentsAuditPatch();
  await ensureAppPaymentsSchema();
  await ensurePasswordResetsSchema();
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
async function ensurePasswordResetsSchema() {
  try {
    const pool = await getConnectionPool();
    const existsQ = await pool.request().query("SELECT 1 AS found FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='password_resets'");
    if ((existsQ.recordset || []).length === 0) {
      await pool.request().query(`
        CREATE TABLE dbo.password_resets (
          id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT NOT NULL,
          email NVARCHAR(256) NOT NULL,
          token_hash NVARCHAR(256) NOT NULL,
          expires_at DATETIME2 NOT NULL,
          used BIT NOT NULL DEFAULT 0,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          consumed_at DATETIME2 NULL
        )
      `);
      await pool.request().query("CREATE INDEX IX_password_resets_user ON dbo.password_resets(user_id, used, expires_at)");
      await pool.request().query("CREATE INDEX IX_password_resets_token ON dbo.password_resets(token_hash)");
      console.log('✅ Tabela dbo.password_resets criada');
    }
  } catch (e) {
    console.error('Falha ao garantir schema password_resets:', e?.message || e);
  }
}
app.get('/api/admin/projetos', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const result = await pool.request().query(`
      SELECT 
        p.id, p.titulo, p.nome, p.descricao, p.status, p.tecnologias, p.data_inicio,
        p.thumb_url, p.mentor_id, p.created_at, p.updated_at, p.preco, COALESCE(p.progresso, 0) AS progresso
      FROM dbo.projetos p
      ORDER BY p.created_at DESC
    `);
    logEvent('admin_projects_view', { admin_id: req.user?.id, count: (result.recordset || []).length });
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Erro em /api/admin/projetos:', err);
    logEvent('admin_projects_view_error', { admin_id: req.user?.id, message: err?.message || String(err) });
    next(err);
  }
});
async function handlePaymentWebhook(paymentId) {
  if (!mpClient) return;
  const payment = new Payment(mpClient);
  let pay = null;
  try {
    pay = await payment.get({ id: paymentId });
  } catch (e) {
    console.warn('Webhook: falha ao obter pagamento:', e?.message || e);
    return;
  }
  const appId = parseInt(pay?.external_reference || '0', 10);
  if (!appId) return;
  paymentsByApp.set(appId, { payment_id: String(paymentId), status: pay?.status || 'pending' });
  if (pay?.status !== 'approved') return;
  let appItem = null;
  try {
    const pool = await getConnectionPool();
    const dataRes = await pool.request().input('id', dbSql.Int, appId).query('SELECT id, name, price FROM dbo.apps WHERE id=@id');
    appItem = dataRes.recordset[0] || null;
  } catch (dbErr) {
    console.warn('Webhook: erro ao buscar app no banco:', dbErr?.message || dbErr);
  }
  try {
    const tx = {
      amount: Number(pay?.transaction_amount || appItem?.price || 0),
      products: [{ title: appItem?.name || String(appId), quantity: 1, unit_price: Number(appItem?.price || 0) }],
      customer: { email: pay?.payer?.email || undefined, name: undefined },
    };
    await mercadoLivre.sendTransaction(tx, { external_reference: String(appId), metadata: { payment_id: String(paymentId), source: 'webhook' } });
  } catch (syncErr) {
    console.warn('Webhook: falha ao sincronizar com Mercado Livre:', syncErr?.message || syncErr);
  }
  try {
    const pool = await getConnectionPool();
    await pool.request()
      .input('type', dbSql.NVarChar, 'purchase')
      .input('app_id', dbSql.Int, appId)
      .input('app_name', dbSql.NVarChar, appItem?.name || String(appId))
      .input('status', dbSql.NVarChar, 'approved')
      .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');

    const payerEmail = pay?.payer?.email || null;
    const amountVal = Number(pay?.transaction_amount || appItem?.price || 0);
    const currencyVal = pay?.currency_id || 'BRL';
    const statusDetail = pay?.status_detail || null;
    const paymentTypeId = pay?.payment_type_id || null;
    const issuerId = String(pay?.issuer_id || pay?.card?.issuer_id || pay?.transaction_details?.issuer_id || '') || null;
    const netReceived = (pay?.transaction_details?.net_received_amount !== undefined) ? Number(pay.transaction_details.net_received_amount) : null;
    const installmentAmount = (pay?.transaction_details?.installment_amount !== undefined) ? Number(pay.transaction_details.installment_amount) : null;
    const docType = pay?.payer?.identification?.type || null;
    const docNumber = pay?.payer?.identification?.number || null;

    const updByPid = await pool.request()
      .input('pid', dbSql.NVarChar, String(paymentId))
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
      .input('mp_response_json', dbSql.NVarChar(dbSql.MAX), JSON.stringify(pay))
      .query('UPDATE dbo.app_payments SET status=@status, amount=@amount, currency=@currency, payer_email=@payer_email, status_detail=@status_detail, payment_type_id=@payment_type_id, issuer_id=@issuer_id, net_received_amount=@net_received_amount, installment_amount=@installment_amount, payer_document_type=@payer_document_type, payer_document_number=@payer_document_number, mp_response_json=@mp_response_json, updated_at=SYSUTCDATETIME() WHERE payment_id=@pid');

    let affected = updByPid?.rowsAffected?.[0] || 0;
    if (affected === 0) {
      const updPending = await pool.request()
        .input('pid', dbSql.NVarChar, String(paymentId))
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
        .input('mp_response_json', dbSql.NVarChar(dbSql.MAX), JSON.stringify(pay))
        .query("UPDATE dbo.app_payments SET payment_id=@pid, status=@status, amount=@amount, currency=@currency, payer_email=@payer_email, status_detail=@status_detail, payment_type_id=@payment_type_id, issuer_id=@issuer_id, net_received_amount=@net_received_amount, installment_amount=@installment_amount, payer_document_type=@payer_document_type, payer_document_number=@payer_document_number, mp_response_json=@mp_response_json, updated_at=SYSUTCDATETIME() WHERE app_id=@app_id AND status='pending'");
      affected = updPending?.rowsAffected?.[0] || 0;
      if (affected > 0) {
        await pool.request()
          .input('payment_id', dbSql.NVarChar, String(paymentId))
          .input('preference_id', dbSql.NVarChar, null)
          .input('app_id', dbSql.Int, appId)
          .input('user_id', dbSql.Int, null)
          .input('action', dbSql.NVarChar, 'pid_correction')
          .input('from_status', dbSql.NVarChar, 'pending')
          .input('to_status', dbSql.NVarChar, 'approved')
          .input('from_payment_id', dbSql.NVarChar, null)
          .input('to_payment_id', dbSql.NVarChar, String(paymentId))
          .input('amount', dbSql.Decimal(18, 2), amountVal)
          .input('currency', dbSql.NVarChar, currencyVal)
          .input('payer_email', dbSql.NVarChar, payerEmail)
          .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
      }
    }
    if (affected === 0) {
      await pool.request()
        .input('pid', dbSql.NVarChar, String(paymentId))
        .input('app_id', dbSql.Int, appId)
        .input('user_id', dbSql.Int, null)
        .input('status', dbSql.NVarChar, 'approved')
        .input('amount', dbSql.Decimal(18, 2), amountVal)
        .input('currency', dbSql.NVarChar, currencyVal)
        .input('payer_email', dbSql.NVarChar, payerEmail)
        .input('source', dbSql.NVarChar, 'mercado_pago')
        .input('mp_response_json', dbSql.NVarChar(dbSql.MAX), JSON.stringify(pay))
        .query('INSERT INTO dbo.app_payments (payment_id, app_id, user_id, status, amount, currency, payer_email, source, mp_response_json) VALUES (@pid, @app_id, @user_id, @status, @amount, @currency, @payer_email, @source, @mp_response_json)');
      await pool.request()
        .input('payment_id', dbSql.NVarChar, String(paymentId))
        .input('preference_id', dbSql.NVarChar, null)
        .input('app_id', dbSql.Int, appId)
        .input('user_id', dbSql.Int, null)
        .input('action', dbSql.NVarChar, 'insert_missing')
        .input('from_status', dbSql.NVarChar, null)
        .input('to_status', dbSql.NVarChar, 'approved')
        .input('from_payment_id', dbSql.NVarChar, null)
        .input('to_payment_id', dbSql.NVarChar, String(paymentId))
        .input('amount', dbSql.Decimal(18, 2), amountVal)
        .input('currency', dbSql.NVarChar, currencyVal)
        .input('payer_email', dbSql.NVarChar, payerEmail)
        .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
    }
  } catch (dbErr) {
    console.warn('Webhook: falha ao persistir atualização de pagamento no banco:', dbErr?.message || dbErr);
  }
}