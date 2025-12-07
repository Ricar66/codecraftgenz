/**
 * =========================================================================================
 * SERVER.JS - Backend API Principal
 * =========================================================================================
 * Este arquivo configura o servidor Express, middlewares, conexão com banco de dados e
 * define todas as rotas da API (Autenticação, Projetos, Finanças, Licenças, etc.).
 *
 * Módulos Principais:
 * - Autenticação: JWT, BCrypt, MFA (TOTP).
 * - Banco de Dados: MSSQL (via pool connection).
 * - Pagamentos: Integração com Mercado Pago.
 * - Segurança: Helmet, Rate Limit, CORS.
 *
 * Manutenção:
 * - Certifique-se de que as variáveis de ambiente (.env) estão carregadas corretamente.
 * - Logs de auditoria são gravados via `logEvent` e `auditLicense`.
 */

import * as nodeCrypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

// Middlewares e Utilitários de Terceiros
import bcrypt from 'bcrypt';          // Hashing de senhas
import compression from 'compression'; // Compressão GZIP de respostas
import cookieParser from 'cookie-parser'; // Parser de cookies para JWT
import cors from 'cors';              // Cross-Origin Resource Sharing
import dotenv from 'dotenv';          // Gerenciamento de variáveis de ambiente
import express from 'express';        // Framework Web
import rateLimit from 'express-rate-limit'; // Proteção contra DDoS/Brute-force
import helmet from 'helmet';          // Headers de segurança HTTP
import jwt from 'jsonwebtoken';       // Tokens de autenticação
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'; // SDK Mercado Pago
import multer from 'multer';          // Upload de arquivos (se utilizado)
import sharp from 'sharp';            // Processamento de imagens (logo generation)
import { z } from 'zod';              // Validação de schemas de dados

// Módulos Locais
import { mercadoLivre } from './src/integrations/mercadoLivre.js';
import { getConnectionPool, dbSql } from './src/lib/db.js';

// -----------------------------------------------------------------------------------------
// 1. Configuração de Variáveis de Ambiente
// -----------------------------------------------------------------------------------------
// Carrega variáveis de ambiente com prioridade por ambiente (production > staging > development > .env)
// Garante que segredos e configurações sensíveis estejam disponíveis antes de iniciar.
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

// -----------------------------------------------------------------------------------------
// 2. Configuração do Servidor Express
// -----------------------------------------------------------------------------------------
const app = express();
app.disable('x-powered-by'); // Remove header X-Powered-By para segurança
app.set('trust proxy', 1);   // Necessário para rate limiters funcionarem atrás de proxies (Nginx/Cloudflare)

// Porta do servidor e segredos obrigatórios
const PORT = process.env.PORT_OVERRIDE || process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_RESET_TOKEN = process.env.ADMIN_RESET_TOKEN;

// Validação crítica de configuração
if (!JWT_SECRET || !ADMIN_RESET_TOKEN) {
  console.error('ERRO FATAL: JWT_SECRET ou ADMIN_RESET_TOKEN não definidos no .env');
  process.exit(1);
}
console.log('🔐 Segredos essenciais definidos (valores não exibidos)');

// -----------------------------------------------------------------------------------------
// 3. Middlewares Globais
// -----------------------------------------------------------------------------------------
// Segurança (helmet), CORS dinâmico por ambiente, compressão, parsers

// Helmet: Define headers de segurança HTTP (CSP desativado pois frontend é servido separadamente ou lida com isso)
app.use(helmet({
  contentSecurityPolicy: false,
}));
const isProd = (process.env.NODE_ENV === 'production');

// CORS: Controle de acesso a recursos de origens diferentes
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
    // Em produção: Permite origens listadas + hostname do site (se definido)
    // Em dev: Permite localhost + origens listadas
    const list = isProd ? [...allowedOrigins, ...(process.env.WEBSITE_HOSTNAME ? [`https://${String(process.env.WEBSITE_HOSTNAME).trim()}`] : [])] : [devOrigin, devOriginAlt, ...allowedOrigins];
    const normalizedOrigin = origin ? origin.replace(/\/$/, '') : origin;
    const normalizedList = list.map(o => o.replace(/\/$/, ''));
    
    // Requisições sem origem (server-to-server) são permitidas
    if (!normalizedOrigin) return callback(null, true);
    
    // Valida regex para localhost em desenvolvimento
    const devRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
    if (!isProd && devRegex.test(normalizedOrigin)) return callback(null, true);
    
    if (normalizedList.includes(normalizedOrigin)) return callback(null, true);
    
    console.error('CORS bloqueado para origem', normalizedOrigin, 'permitidos', normalizedList);
    return callback(new Error('CORS origin não permitido'), false);
  },
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE'],
  allowedHeaders: ['Content-Type','Authorization','x-csrf-token','x-admin-reset-token','X-Device-Id','x-device-id','X-Tracking-Id','x-tracking-id'],
  credentials: true, // Permite envio de cookies
}));

// HSTS: Força HTTPS em produção
if (isProd) {
  app.use(helmet.hsts({ maxAge: 15552000 }));
}
app.use(compression()); // Melhora performance comprimindo respostas

// Parsers de corpo de requisição
app.use(express.text({ limit: '10mb', type: 'text/plain' })); // Para webhooks que enviam raw text
app.use(express.json({ limit: '10mb' })); // Para APIs JSON
app.use(cookieParser()); // Para ler token JWT dos cookies

// -----------------------------------------------------------------------------------------
// 4. Rate Limiters (Proteção contra abuso)
// -----------------------------------------------------------------------------------------

// Limite de tentativas de login por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login, tente novamente em 15 minutos.' },
  keyGenerator: (req) => {
    const ip = req.ip || 'unknown';
    const portIndex = ip.lastIndexOf(':');
    if (portIndex > -1 && ip.includes('.')) {
      return ip.substring(0, portIndex);
    }
    if (portIndex > -1 && ip.includes(']:')) {
      const bracketIndex = ip.lastIndexOf(']');
      return ip.substring(0, bracketIndex + 1);
    }
    return ip;
  }
});

// Validação de corpo com Zod; popula req.validated
function validateBody(schema) {
  return (req, res, next) => {
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = {}; }
    }
    const parsed = schema.safeParse(payload || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    }
    req.validated = parsed.data;
    next();
  };
}
// Limite para rotas sensíveis (licença, pagamentos)
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || 'unknown';
    const portIndex = ip.lastIndexOf(':');
    if (portIndex > -1 && ip.includes('.')) {
      return ip.substring(0, portIndex);
    }
    if (portIndex > -1 && ip.includes(']:')) {
      const bracketIndex = ip.lastIndexOf(']');
      return ip.substring(0, bracketIndex + 1);
    }
    return ip;
  }
});
// Limite para webhooks externos
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

// -----------------------------------------------------------------------------------------
// 5. Helpers & Utilitários (Logging, Sanitização, Validação)
// -----------------------------------------------------------------------------------------

function logEvent(type, details) {
  try {
    const entry = { type, time: new Date().toISOString(), ...details };
    console.log(JSON.stringify(entry));
  } catch {
    console.log(`[LOG] ${type}`, details);
  }
}

/**
 * Sanitiza uma string removendo tags HTML e limitando o tamanho.
 *
 * @param {string} s - String de entrada.
 * @param {number} [maxLen=2048] - Tamanho máximo permitido.
 * @returns {string} String sanitizada.
 */
function sanitizeString(s, maxLen = 2048) {
  if (typeof s !== 'string') return s;
  const trimmed = s.trim().slice(0, maxLen);
  // Se for uma Data URL, não remove tags HTML pois pode quebrar o formato (embora base64 use +, /, =)
  // Base64 não contém < ou > exceto se for SVG malformado inline, mas Data URIs começam com data:
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  return trimmed.replace(/<[^>]*>/g, '');
}

/**
 * Valida o formato de um endereço de e-mail.
 *
 * @param {string} email - O e-mail a ser validado.
 * @returns {boolean} True se o formato for válido, false caso contrário.
 */
function validateEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPcId(id) {
  return /^[a-zA-Z0-9\-_]{6,64}$/.test(String(id || ''));
}

async function resolveAppId(pool, rawApp, rawName) {
  const n = Number(rawApp);
  if (Number.isFinite(n) && n > 0) return n;
  const name = String(rawName || '').trim().toLowerCase();
  if (!name) return null;
  const r = await pool.request().input('name', dbSql.NVarChar, name)
    .query("SELECT TOP 1 id FROM dbo.apps WHERE LOWER(name)=@name");
  return r.recordset[0]?.id || null;
}

// -----------------------------------------------------------------------------------------
// 6. Funções de Auditoria e Estatísticas
// -----------------------------------------------------------------------------------------

async function auditLicense(pool, { app_id, email, hardware_id, license_id, action, status, message, ip, ua }) {
  await pool.request()
    .input('app_id', dbSql.Int, app_id)
    .input('email', dbSql.NVarChar, email)
    .input('hardware_id', dbSql.NVarChar, hardware_id)
    .input('license_id', dbSql.Int, license_id)
    .input('action', dbSql.NVarChar, action)
    .input('status', dbSql.NVarChar, status)
    .input('message', dbSql.NVarChar, message)
    .input('ip', dbSql.NVarChar, String(ip || ''))
    .input('ua', dbSql.NVarChar, String(ua || ''))
    .query('INSERT INTO dbo.license_activations (app_id, email, hardware_id, license_id, action, status, message, ip, user_agent) VALUES (@app_id, @email, @hardware_id, @license_id, @action, @status, @message, @ip, @ua)');
}

async function auditPaymentAction(pool, { payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email }) {
  // Registra mudanças de estado de pagamentos em dbo.app_payments_audit
  // Utilizado para rastreabilidade de eventos (inserção mock, transições de status, etc.)
  await pool.request()
    .input('payment_id', dbSql.NVarChar, payment_id)
    .input('preference_id', dbSql.NVarChar, preference_id ?? null)
    .input('app_id', dbSql.Int, app_id)
    .input('user_id', dbSql.Int, user_id ?? null)
    .input('action', dbSql.NVarChar, action)
    .input('from_status', dbSql.NVarChar, from_status ?? null)
    .input('to_status', dbSql.NVarChar, to_status ?? null)
    .input('from_payment_id', dbSql.NVarChar, from_payment_id ?? null)
    .input('to_payment_id', dbSql.NVarChar, to_payment_id ?? null)
    .input('amount', dbSql.Decimal(18, 2), amount ?? null)
    .input('currency', dbSql.NVarChar, currency ?? null)
    .input('payer_email', dbSql.NVarChar, payer_email ?? null)
    .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
}

async function getApprovedPurchasesCount(pool, email, appId) {
  // Conta compras aprovadas para o par (email, appId) em dbo.app_payments
  const r = await pool.request()
    .input('email', dbSql.NVarChar, email)
    .input('app_id', dbSql.Int, appId)
    .query('SELECT COUNT(*) AS total FROM dbo.app_payments WHERE payer_email=@email AND app_id=@app_id AND status=\'approved\'');
  return r.recordset[0]?.total || 0;
}

async function getUsedLicensesCount(pool, email, appId) {
  // Conta licenças já vinculadas (hardware_id não vazio) para o par (email, appId)
  // Importante: ignora slots livres (hardware_id='' ou NULL)
  const r = await pool.request()
    .input('email', dbSql.NVarChar, email)
    .input('app_id', dbSql.Int, appId)
    .query("SELECT COUNT(*) AS total FROM dbo.user_licenses l JOIN dbo.users u ON l.user_id=u.id WHERE u.email=@email AND l.app_id=@app_id AND l.hardware_id IS NOT NULL AND LTRIM(RTRIM(l.hardware_id)) <> ''");
  return r.recordset[0]?.total || 0;
}

// -----------------------------------------------------------------------------------------
// 7. Schemas de Validação (Zod) e Helpers de Segurança
// -----------------------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  mfa_code: z.string().optional(),
});

const userCreateSchema = z.object({
  nome: z.string().min(1).max(128),
  email: z.string().email().max(128),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: z.enum(['admin','editor','viewer']).optional(),
});

/**
 * Valida a força de uma senha.
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos uma letra minúscula
 * - Pelo menos um número
 * - Pelo menos um caractere especial
 *
 * @param {string} pwd - A senha a ser validada.
 * @returns {boolean} True se a senha for forte, false caso contrário.
 */
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
  return nodeCrypto.randomBytes(32).toString('hex');
}

function hashResetToken(token) {
  const pepper = process.env.PASSWORD_RESET_PEPPER || '';
  return nodeCrypto.createHash('sha256').update(String(token) + pepper).digest('hex');
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

// -----------------------------------------------------------------------------------------
// 8. Inicialização de Serviços Externos (Logo, MP, Mercado Livre)
// -----------------------------------------------------------------------------------------

// Geração dinâmica do logo PNG (para uso em emails/meta tags)
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

// -----------------------------------------------------------------------------------------
// 8.1. Nota: Mock Data Removido
// -----------------------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------------------
// 9. Middlewares de Autenticação e Autorização
// -----------------------------------------------------------------------------------------

/**
 * Middleware de autenticação via JWT.
 * Verifica a presença e validade do token no header Authorization ou em cookies.
 * Adiciona o objeto `req.user` com os dados do usuário decodificados.
 *
 * @param {import('express').Request} req - Objeto de requisição do Express.
 * @param {import('express').Response} res - Objeto de resposta do Express.
 * @param {import('express').NextFunction} next - Função para passar para o próximo middleware.
 * @returns {void} Retorna 401 se não autenticado ou token inválido.
 */
function authenticate(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const [type, bearerToken] = header.split(' ');
    const cookieToken = req.cookies?.token || null;
    const token = (type === 'Bearer' && bearerToken) ? bearerToken : cookieToken;
    if (!token) return res.status(401).json({ error: 'Não autenticado' });
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

/**
 * Middleware de autorização para administradores.
 * Deve ser usado após o middleware `authenticate`.
 * Verifica se `req.user.role` é 'admin'.
 *
 * @param {import('express').Request} req - Objeto de requisição do Express.
 * @param {import('express').Response} res - Objeto de resposta do Express.
 * @param {import('express').NextFunction} next - Função para passar para o próximo middleware.
 * @returns {void} Retorna 403 se não for admin.
 */
function authorizeAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

// -----------------------------------------------------------------------------------------
// 10. Gerenciamento de Schema do Banco de Dados (Migrações Automáticas)
// -----------------------------------------------------------------------------------------

/**
 * Garante que a tabela `dbo.users` possua as colunas necessárias.
 * Adiciona colunas como `password_hash`, `role`, `status`, `mfa_enabled`, `mfa_secret` caso não existam.
 * Aplica normalizações de dados (defaults para role e status).
 *
 * @returns {Promise<void>}
 */
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

/**
 * Garante que a tabela `dbo.projetos` possua colunas opcionais usadas pelo frontend.
 * Adiciona colunas `preco` e `progresso` com defaults caso não existam.
 *
 * @returns {Promise<void>}
 */
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

/**
 * Mapeia uma linha bruta do banco de dados (tabela users) para o objeto de usuário da API.
 *
 * @param {Object} row - Linha do banco de dados (recordset).
 * @returns {Object} Objeto de usuário formatado ({ id, nome, email, role, status }).
 */
function mapUserRow(row) {
  return {
    id: row.id,
    nome: row.name,
    email: row.email,
    role: row.role || 'viewer',
    status: row.status || 'ativo',
  };
}

function parseJsonSafe(s, fallback) {
  try {
    if (s == null) return fallback;
    const t = typeof s === 'string' ? s : String(s);
    const v = t.trim();
    if (!v) return fallback;
    return JSON.parse(v);
  } catch { return fallback; }
}

function mapChallengeRow(row) {
  const tags = parseJsonSafe(row.tags_json, null);
  const tagsArr = Array.isArray(tags) ? tags : (String(row.tags || '').split(',').map(s => s.trim()).filter(Boolean));
  return {
    id: row.id,
    name: row.name,
    objective: row.objective,
    description: row.description,
    deadline: row.deadline,
    difficulty: row.difficulty,
    tags: tagsArr,
    reward: row.reward,
    base_points: Number(row.base_points || 0),
    delivery_type: row.delivery_type,
    thumb_url: row.thumb_url,
    status: row.status,
    visible: row.visible !== false && row.visible !== 0,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Garante que a tabela `dbo.app_payments` possua a coluna `mp_response_json`.
 * Utilizada para armazenar o JSON bruto de resposta do Mercado Pago.
 *
 * @returns {Promise<void>}
 */
async function ensureAppPaymentsSchema() {
  try {
    const pool = await getConnectionPool();
    await pool.request().query(`IF COL_LENGTH('dbo.app_payments', 'mp_response_json') IS NULL BEGIN ALTER TABLE dbo.app_payments ADD mp_response_json NVARCHAR(MAX) NULL; END;`);
    console.log('✅ Esquema de dbo.app_payments verificado/ajustado (mp_response_json)');
  } catch (err) {
    console.error('Erro ao garantir esquema de dbo.app_payments (mp_response_json):', err);
  }
}

// -----------------------------------------------------------------------------------------
// 10.1. Garantia de Tabela de Licenças
// -----------------------------------------------------------------------------------------
async function ensureUserLicensesSchema() {
  try {
    const pool = await getConnectionPool();
    // Cria tabela dbo.user_licenses caso não exista e garante colunas/índices necessários
    await pool.request().query(`
      IF OBJECT_ID('dbo.user_licenses', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.user_licenses (
          id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT NULL,
          app_id INT NOT NULL,
          email NVARCHAR(256) NOT NULL,
          hardware_id NVARCHAR(256) NULL,
          license_key NVARCHAR(MAX) NULL,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          updated_at DATETIME2 NULL,
          CONSTRAINT FK_user_licenses_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
          CONSTRAINT FK_user_licenses_app FOREIGN KEY (app_id) REFERENCES dbo.apps(id)
        );
        CREATE INDEX IX_user_licenses_user_app ON dbo.user_licenses(user_id, app_id);
        CREATE INDEX IX_user_licenses_hardware ON dbo.user_licenses(hardware_id);
        CREATE INDEX IX_user_licenses_app_email ON dbo.user_licenses(app_id, email);
      END;
    `);
    // Garantias incrementais: email, activated_at e flexibilização de colunas
    await pool.request().query(`IF COL_LENGTH('dbo.user_licenses', 'email') IS NULL BEGIN ALTER TABLE dbo.user_licenses ADD email NVARCHAR(256) NOT NULL CONSTRAINT DF_user_licenses_email DEFAULT ''; END;`);
    await pool.request().query(`IF COL_LENGTH('dbo.user_licenses', 'activated_at') IS NULL BEGIN ALTER TABLE dbo.user_licenses ADD activated_at DATETIME2 NULL; END;`);
    await pool.request().query(`
      BEGIN TRY
        ALTER TABLE dbo.user_licenses ALTER COLUMN user_id INT NULL;
        ALTER TABLE dbo.user_licenses ALTER COLUMN hardware_id NVARCHAR(256) NULL;
        ALTER TABLE dbo.user_licenses ALTER COLUMN license_key NVARCHAR(MAX) NULL;
      END TRY
      BEGIN CATCH
      END CATCH
    `);
    await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_user_licenses_app_email' AND object_id=OBJECT_ID('dbo.user_licenses')) BEGIN CREATE INDEX IX_user_licenses_app_email ON dbo.user_licenses(app_id, email); END;`);
    await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_user_licenses_app_email_hwid' AND object_id=OBJECT_ID('dbo.user_licenses')) BEGIN CREATE INDEX IX_user_licenses_app_email_hwid ON dbo.user_licenses(app_id, email, hardware_id); END;`);
    // Nova coluna para relatórios por software e backfill com dbo.apps.name
    await pool.request().query(`IF COL_LENGTH('dbo.user_licenses', 'app_name') IS NULL BEGIN ALTER TABLE dbo.user_licenses ADD app_name NVARCHAR(256) NULL; END;`);
    await pool.request().query(`UPDATE l SET app_name = a.name FROM dbo.user_licenses l JOIN dbo.apps a ON l.app_id = a.id WHERE l.app_name IS NULL OR LTRIM(RTRIM(l.app_name)) = ''`);
    console.log('✅ Esquema de dbo.user_licenses verificado/criado');
  } catch (err) {
    console.error('Erro ao garantir esquema de dbo.user_licenses:', err);
  }
}

async function ensureLicenseActivationsSchema() {
  try {
    const pool = await getConnectionPool();
    // Cria tabela de auditoria de ativações de licença
    await pool.request().query(`
      IF OBJECT_ID('dbo.license_activations', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.license_activations (
          id INT IDENTITY(1,1) PRIMARY KEY,
          app_id INT NOT NULL,
          email NVARCHAR(256) NULL,
          hardware_id NVARCHAR(256) NULL,
          license_id INT NULL,
          action NVARCHAR(32) NOT NULL,
          status NVARCHAR(16) NOT NULL,
          message NVARCHAR(256) NULL,
          ip NVARCHAR(64) NULL,
          user_agent NVARCHAR(512) NULL,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
        CREATE INDEX IX_license_activations_app_email ON dbo.license_activations(app_id, email);
        CREATE INDEX IX_license_activations_hwid ON dbo.license_activations(hardware_id);
      END;
    `);
    console.log('✅ Esquema de dbo.license_activations verificado/criado');
  } catch (err) {
    console.error('Erro ao garantir esquema de dbo.license_activations:', err);
  }
}

// -----------------------------------------------------------------------------------------
// 10.2. Garantia de Tabela de Auditoria e Índices
// -----------------------------------------------------------------------------------------
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

async function ensureCoinCraftInstallerUrl() {
  // Atualiza/exige a URL do instalador do CoinCraft no registro de apps
  try {
    const pool = await getConnectionPool();
    await pool.request()
      .input('url', dbSql.NVarChar, '/downloads/InstalarCoinCraft.exe')
      .query("UPDATE dbo.apps SET executable_url=@url, updated_at=SYSUTCDATETIME() WHERE LOWER(name)='coincraft'");
  } catch (err) {
    console.warn('Falha ao garantir executable_url do CoinCraft:', err?.message || err);
  }
}

// -----------------------------------------------------------------------------------------
// 11. Rotas de Sistema e Health Checks (Diagnóstico)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/health Health Check
 * @apiDescription Verifica o status básico de funcionamento do servidor.
 * @apiGroup System
 * @apiSuccess {string} status Status da aplicação ("OK").
 * @apiSuccess {string} timestamp Timestamp da requisição.
 * @apiSuccess {number} uptime Tempo de atividade do servidor em segundos.
 * @apiSuccess {string} environment Ambiente de execução.
 */
app.get('/api/health', (req, res) => {
  // Saúde básica do servidor (uptime, ambiente)
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @api {get} /api/health/mercadopago Health Check Mercado Pago
 * @apiDescription Diagnóstico detalhado da integração com Mercado Pago/Mercado Livre.
 * @apiGroup System
 * @apiPermission Admin
 * @apiSuccess {string} status Status do diagnóstico ("OK" ou "ERROR").
 * @apiSuccess {boolean} mp_public_key_present Indica presença da chave pública.
 * @apiSuccess {boolean} mp_access_token_present Indica presença do token de acesso.
 * @apiSuccess {boolean} oauth_configured Indica configuração completa de OAuth.
 * @apiSuccess {boolean} can_ensure_access_token Indica se o token pode ser validado/renovado.
 */
app.get('/api/health/mercadopago', async (req, res) => {
  // Health detalhado da integração de pagamentos: verifica chaves, OAuth e renovação de token
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

/**
 * @api {get} /api/health/mp-env Ambiente Mercado Pago
 * @apiDescription Diagnóstico do ambiente configurado para Mercado Pago (Sandbox vs Produção).
 * @apiGroup System
 * @apiSuccess {string} status Status da verificação.
 * @apiSuccess {string} backend_mode_hint Indicação do ambiente do backend (sandbox/production).
 * @apiSuccess {string} frontend_mode_hint Indicação do ambiente do frontend.
 */
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

/**
 * @api {get} /api/config/mp-public-key Configuração Pública MP
 * @apiDescription Retorna a chave pública do Mercado Pago para uso no frontend.
 * @apiGroup Config
 * @apiSuccess {string} public_key Chave pública do Mercado Pago.
 * @apiSuccess {boolean} present Indica se a chave está configurada.
 */
app.get('/api/config/mp-public-key', (req, res) => {
  try {
    const publicKey = process.env.VITE_MERCADO_PAGO_PUBLIC_KEY || process.env.MERCADO_PAGO_PUBLIC_KEY || '';
    return res.json({ public_key: publicKey, present: !!publicKey });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

/**
 * @api {get} /api/health/db Health Check Banco de Dados
 * @apiDescription Verifica conectividade e integridade do schema do banco de dados.
 * @apiGroup System
 * @apiPermission Admin
 * @apiSuccess {string} status Status da verificação.
 * @apiSuccess {boolean} database_url_present Indica presença da string de conexão.
 * @apiSuccess {Object} analytic_columns Status das colunas analíticas necessárias.
 * @apiSuccess {Object} indexes Status dos índices necessários.
 */
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

// -----------------------------------------------------------------------------------------
// 12. Rotas de Autenticação (Login, MFA, Registro)
// -----------------------------------------------------------------------------------------

/**
 * @api {post} /api/auth/login Login de usuário
 * @apiDescription Autentica um usuário com email e senha. Verifica MFA se habilitado.
 * @apiParam {string} email Email do usuário.
 * @apiParam {string} password Senha do usuário.
 * @apiParam {string} [mfa_code] Código MFA (se MFA estiver ativado).
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} user Dados do usuário (id, email, name, role).
 * @apiError {string} error Mensagem de erro (ex: "Credenciais inválidas").
 */
app.post('/api/auth/login', loginLimiter, validateBody(loginSchema), (req, res) => {
  const { email, password, mfa_code } = req.validated;

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
          const mfaCode = String(mfa_code || '').trim();
          const secret = String(row.mfa_secret || '');
          const valid = verifyTotp(secret, mfaCode);
          if (!valid) {
            return res.status(401).json({ error: 'MFA requerido' });
          }
        }

      const user = { id: row.id, email: row.email, name: row.name, role: row.role || 'viewer' };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
        ...(process.env.COOKIE_DOMAIN ? { domain: String(process.env.COOKIE_DOMAIN).trim() } : {}),
      });
      logEvent('auth_login_success', { user_id: user.id, role: user.role });
      return res.json({ success: true, user });
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

/**
 * @api {get} /api/auth/me Dados do usuário logado
 * @apiDescription Retorna as informações do usuário autenticado com base no token JWT.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} user Dados do usuário.
 * @apiError {string} error Mensagem de erro se não autenticado.
 */
app.get('/api/auth/me', (req, res) => {
  try {
    const token = req.cookies?.token || null;
    if (!token) return res.status(401).json({ error: 'Não autenticado' });
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ success: true, user: { id: payload.id, email: payload.email, name: payload.name, role: payload.role || 'viewer' } });
  } catch {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
});

/**
 * @api {post} /api/auth/logout Logout
 * @apiDescription Encerra a sessão do usuário removendo o cookie do token.
 * @apiSuccess {boolean} success Indica sucesso (sempre true).
 */
app.post('/api/auth/logout', (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      ...(process.env.COOKIE_DOMAIN ? { domain: String(process.env.COOKIE_DOMAIN).trim() } : {}),
    });
    return res.json({ success: true });
  } catch {
    return res.status(200).json({ success: true });
  }
});

/**
 * @api {post} /api/auth/password-reset/request Solicitar reset de senha
 * @apiDescription Gera um token de recuperação e envia por e-mail (ou retorna em dev).
 * @apiParam {string} email Email do usuário.
 * @apiSuccess {boolean} success Indica sucesso (mesmo se email não existir, por segurança).
 * @apiSuccess {string} [reset_link] Link de reset (apenas em desenvolvimento).
 */
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
    const top3Res = await pool.request().query(
      "SELECT rt.crafter_id, rt.position, rt.reward, c.nome AS name, c.pontos AS points, c.avatar_url FROM dbo.ranking_top3 rt LEFT JOIN dbo.crafters c ON c.id = rt.crafter_id WHERE rt.position IN (1,2,3) ORDER BY rt.position ASC"
    );
    return res.json({ success: true, data: { top3: top3Res.recordset } });
  } catch (err) {
    console.error('Erro em password-reset/request:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * @api {post} /api/auth/password-reset/confirm Confirmar reset de senha
 * @apiDescription Define uma nova senha usando um token de recuperação válido.
 * @apiParam {string} token Token de recuperação recebido por e-mail.
 * @apiParam {string} new_password Nova senha (deve cumprir requisitos de força).
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiError {string} error Mensagem de erro (token inválido, expirado ou senha fraca).
 */
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

// -----------------------------------------------------------------------------------------
// Helpers MFA (TOTP) - Algoritmos de Time-Based One-Time Password
// -----------------------------------------------------------------------------------------

/**
 * Codifica um buffer em Base32.
 * Utilizado para gerar segredos compatíveis com aplicativos autenticadores (Google Authenticator).
 *
 * @param {Buffer} buf - O buffer de dados a ser codificado.
 * @returns {string} A string codificada em Base32.
 */
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

/**
 * Gera um segredo aleatório para MFA em formato Base32.
 *
 * @returns {string} O segredo gerado (20 bytes de entropia).
 */
function generateMfaSecret() {
  const bytes = nodeCrypto.randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Verifica um token TOTP contra um segredo Base32.
 * Aceita uma janela de tempo de +/- 1 período (30s) para compensar desvios de relógio.
 *
 * @param {string} base32Secret - O segredo compartilhado em Base32.
 * @param {string} token - O token de 6 dígitos fornecido pelo usuário.
 * @returns {boolean} True se o token for válido, False caso contrário.
 */
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

/**
 * Decodifica uma string Base32 para um Buffer.
 * Remove padding '=' e ignora caracteres inválidos.
 *
 * @param {string} str - A string Base32.
 * @returns {Buffer} O buffer decodificado.
 */
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

/**
 * Gera um código TOTP de 6 dígitos para um dado contador.
 * Utiliza HMAC-SHA1 conforme RFC 6238.
 *
 * @param {Buffer} secretBuf - O segredo em formato Buffer.
 * @param {number} counter - O valor do contador de tempo.
 * @returns {string} O código TOTP de 6 dígitos (com zeros à esquerda).
 */
function totpCode(secretBuf, counter) {
  const ctr = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    ctr[i] = counter & 0xff;
    counter = counter >>> 8;
  }
  const hmac = nodeCrypto.createHmac('sha1', secretBuf).update(ctr).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  const otp = (binCode % 1e6).toString().padStart(6, '0');
  return otp;
}

/**
 * @api {post} /api/auth/mfa/setup Iniciar configuração de MFA
 * @apiDescription Gera um segredo TOTP e retorna a URL otpauth para geração de QR Code.
 * @apiPermission Autenticado
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {string} secret Segredo em base32.
 * @apiSuccess {string} otpauth URL para QR Code (compatível com Google Authenticator).
 */
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

/**
 * @api {post} /api/auth/mfa/enable Ativar MFA
 * @apiDescription Confirma o código TOTP e ativa o MFA para o usuário.
 * @apiPermission Autenticado
 * @apiParam {string} code Código TOTP de 6 dígitos gerado pelo app autenticador.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiError {string} error "Código 2FA inválido" se incorreto.
 */
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

/**
 * @api {post} /api/auth/mfa/disable Desativar MFA
 * @apiDescription Remove a proteção MFA da conta do usuário.
 * @apiPermission Autenticado
 * @apiSuccess {boolean} success Indica sucesso.
 */
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

// -----------------------------------------------------------------------------------------
// 13. Rotas de Administração de Usuários (CRUD)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/auth/users Listar usuários
 * @apiDescription Retorna a lista de todos os usuários cadastrados (apenas para administradores).
 * @apiGroup Admin
 * @apiPermission Admin
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object[]} data Lista de usuários.
 */
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

/**
 * @api {post} /api/auth/users Criar usuário
 * @apiDescription Cria um novo usuário manualmente (apenas para administradores).
 * @apiGroup Admin
 * @apiPermission Admin
 * @apiParam {string} nome Nome do usuário.
 * @apiParam {string} email Email do usuário.
 * @apiParam {string} senha Senha do usuário.
 * @apiParam {string} [role='viewer'] Papel do usuário (ex: 'admin', 'viewer').
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} user Dados do usuário criado.
 * @apiError {string} error Mensagem de erro.
 */
app.post('/api/auth/users', authenticate, authorizeAdmin, validateBody(userCreateSchema), async (req, res, next) => {
  try {
    const { nome, email, senha, role } = req.validated;
    // Validação adicional de força de senha (mantida por segurança)
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

/**
 * @api {put} /api/auth/users/:id Atualizar usuário
 * @apiDescription Atualiza dados de um usuário existente (apenas para administradores).
 * @apiGroup Admin
 * @apiPermission Admin
 * @apiParam {number} id ID do usuário.
 * @apiParam {string} [nome] Novo nome.
 * @apiParam {string} [email] Novo email.
 * @apiParam {string} [role] Novo papel.
 * @apiParam {string} [status] Novo status.
 * @apiParam {string} [senha] Nova senha (opcional).
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} user Dados atualizados do usuário.
 */
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

/**
 * @api {patch} /api/auth/users/:id/toggle-status Alternar status do usuário
 * @apiDescription Alterna o status do usuário entre 'ativo' e 'inativo' (apenas para administradores).
 * @apiGroup Admin
 * @apiPermission Admin
 * @apiParam {number} id ID do usuário.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} user Dados do usuário com status atualizado.
 */
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

// -----------------------------------------------------------------------------------------
// 14. Lógica de Negócios (Finanças)
// -----------------------------------------------------------------------------------------

/**
 * Sincroniza as informações financeiras de um projeto com a tabela de finanças.
 * Cria ou atualiza um registro financeiro baseado no status, preço e progresso do projeto.
 *
 * @param {number} projectId - ID do projeto.
 * @param {Object} projeto - Objeto contendo os dados do projeto.
 * @param {string} [projeto.titulo] - Título do projeto.
 * @param {string} [projeto.nome] - Nome alternativo do projeto.
 * @param {number} [projeto.preco] - Preço/Valor do projeto.
 * @param {string} [projeto.status] - Status do projeto (ex: 'finalizado', 'ativo').
 * @param {number} [projeto.progresso] - Progresso do projeto em porcentagem (0-100).
 * @param {string|Date} [projeto.data_inicio] - Data de início do projeto.
 * @returns {Promise<void>}
 */
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

// -----------------------------------------------------------------------------------------
// 15. Rotas de Gerenciamento de Projetos (CRUD)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/projetos Listar projetos
 * @apiDescription Retorna uma lista paginada de projetos. Suporta filtros e ordenação.
 * @apiGroup Projetos
 * @apiParam {number} [page=1] Número da página.
 * @apiParam {number} [limit=10] Itens por página.
 * @apiParam {string} [sortBy='created_at'] Coluna para ordenação.
 * @apiParam {string} [sortOrder='desc'] Direção da ordenação (asc/desc).
 * @apiParam {string} [visivel] Se 'true', filtra apenas projetos ativos/finalizados (para view pública).
 * @apiParam {string} [all] Se '1', ignora filtros de status (para admin).
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object[]} data Lista de projetos.
 * @apiSuccess {Object} pagination Metadados de paginação.
 */
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

/**
 * @api {get} /api/projetos/:id Obter projeto por ID
 * @apiDescription Retorna os detalhes de um projeto específico.
 * @apiGroup Projetos
 * @apiParam {number} id ID do projeto.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Dados do projeto.
 * @apiError {string} error Mensagem de erro (ex: "Projeto não encontrado").
 */
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

/**
 * @api {post} /api/projetos Criar projeto
 * @apiDescription Cria um novo projeto e sincroniza com finanças (apenas para administradores).
 * @apiGroup Projetos
 * @apiPermission Admin
 * @apiParam {string} titulo Título do projeto.
 * @apiParam {string} [descricao] Descrição detalhada.
 * @apiParam {string[]} [tecnologias] Array de tecnologias usadas.
 * @apiParam {string} [status='rascunho'] Status do projeto.
 * @apiParam {string|Date} [data_inicio] Data de início.
 * @apiParam {number} [preco=0] Preço do projeto.
 * @apiParam {number} [progresso=0] Progresso atual (0-100).
 * @apiParam {string} [thumb_url] URL da imagem de capa.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} project Dados do projeto criado.
 */
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

/**
 * @api {put} /api/projetos/:id Atualizar projeto
 * @apiDescription Atualiza um projeto existente e sincroniza com finanças (apenas para administradores).
 * @apiGroup Projetos
 * @apiPermission Admin
 * @apiParam {number} id ID do projeto.
 * @apiParam {string} titulo Título do projeto.
 * @apiParam {string} [descricao] Descrição detalhada.
 * @apiParam {string[]} [tecnologias] Array de tecnologias.
 * @apiParam {string} [status] Novo status.
 * @apiParam {string|Date} [data_inicio] Nova data de início.
 * @apiParam {number} [preco] Novo preço.
 * @apiParam {number} [progresso] Novo progresso.
 * @apiParam {string} [thumb_url] Nova URL da capa.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} project Dados do projeto atualizado.
 */
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

/**
 * @api {delete} /api/projetos/:id Excluir projeto
 * @apiDescription Remove um projeto e seus registros financeiros associados (apenas para administradores).
 * @apiGroup Projetos
 * @apiPermission Admin
 * @apiParam {number} id ID do projeto.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {number} removed ID do projeto removido.
 */
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

/**
 * @api {get} /api/projetos/column/progresso Verificar coluna progresso
 * @apiDescription Retorna metadados da coluna 'progresso' na tabela 'projetos' (debug/admin).
 * @apiGroup Projetos
 * @apiPermission Admin
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} column Metadados da coluna (tipo, tamanho, precisão).
 */
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

// -----------------------------------------------------------------------------------------
// 16. Rotas de Mentores
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/mentores Listar mentores
 * @apiDescription Retorna a lista de mentores. Por padrão, retorna apenas os visíveis.
 * @apiGroup Mentores
 * @apiParam {string} [all] Se '1', retorna todos os mentores (incluindo ocultos).
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object[]} data Lista de mentores.
 */
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

/**
 * @api {get} /api/mentores/:id Obter mentor por ID
 * @apiDescription Retorna os detalhes de um mentor específico.
 * @apiGroup Mentores
 * @apiParam {number} id ID do mentor.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} mentor Dados do mentor.
 * @apiError {string} error Mensagem de erro (ex: "Mentor não encontrado").
 */
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
/**
 * @api {post} /api/mentores Criar mentor
 * @apiDescription Cria um novo mentor (apenas para administradores).
 * @apiGroup Mentores
 * @apiPermission Admin
 * @apiParam {string} nome Nome do mentor.
 * @apiParam {string} email Email do mentor.
 * @apiParam {string} [telefone] Telefone do mentor.
 * @apiParam {string} [bio] Biografia.
 * @apiParam {string} [avatar_url] URL da foto.
 * @apiParam {boolean} [visible=true] Se o mentor está visível.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} mentor Dados do mentor criado.
 * @apiError {string} error Mensagem de erro.
 */
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
      .input('avatar_url', dbSql.NVarChar(dbSql.MAX), avatar_url ? sanitizeString(String(avatar_url), 10485760) : null)
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
/**
 * @api {put} /api/mentores/:id Atualizar mentor
 * @apiDescription Atualiza os dados de um mentor existente (apenas para administradores).
 * @apiGroup Mentores
 * @apiPermission Admin
 * @apiParam {number} id ID do mentor.
 * @apiParam {string} [nome] Nome do mentor.
 * @apiParam {string} [email] Email do mentor.
 * @apiParam {string} [telefone] Telefone do mentor.
 * @apiParam {string} [bio] Biografia.
 * @apiParam {string} [avatar_url] URL da foto.
 * @apiParam {boolean} [visible] Se o mentor está visível.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} mentor Dados do mentor atualizado.
 */
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
      .input('avatar_url', dbSql.NVarChar(dbSql.MAX), avatar_url ? sanitizeString(String(avatar_url), 10485760) : null)
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
/**
 * @api {delete} /api/mentores/:id Remover mentor
 * @apiDescription Remove um mentor do sistema (apenas para administradores).
 * @apiGroup Mentores
 * @apiPermission Admin
 * @apiParam {number} id ID do mentor.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {boolean} removed Indica que a remoção foi efetuada.
 */
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

// -----------------------------------------------------------------------------------------
// 16.1. Rotas de Crafters (Gestão de Profissionais)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/crafters Listar crafters
 * @apiDescription Retorna lista paginada de crafters (alunos).
 * @apiGroup Crafters
 * @apiParam {number} [page=1] Número da página.
 * @apiParam {number} [limit=10] Itens por página.
 * @apiParam {string} [search] Termo de busca (nome ou email).
 * @apiParam {boolean} [active_only] Filtrar por status ativo/inativo.
 * @apiParam {string} [order_by='nome'] Ordenar por (nome, email, points, active).
 * @apiParam {string} [order_direction='asc'] Direção da ordenação (asc/desc).
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object[]} data Lista de crafters.
 * @apiSuccess {Object} pagination Metadados de paginação.
 */
app.get('/api/crafters', async (req, res, next) => {
  // Rota usada pelo AdminCrafters e Ranking
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      active_only,
      order_by = 'nome',
      order_direction = 'asc',
      nivel,
      min_points,
      max_points
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Mapeamento e proteção de colunas de ordenação
    const allowedSortColumns = {'nome': 'nome', 'email': 'email', 'points': 'pontos', 'active': 'ativo', 'nivel': 'nivel'};
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
    if (nivel) {
      whereClauses.push("nivel LIKE @nivel");
      request.input('nivel', dbSql.NVarChar, `%${nivel}%`);
    }
    const minPts = parseInt(min_points);
    const maxPts = parseInt(max_points);
    if (!isNaN(minPts)) {
      whereClauses.push("pontos >= @minPts");
      request.input('minPts', dbSql.Int, minPts);
    }
    if (!isNaN(maxPts)) {
      whereClauses.push("pontos <= @maxPts");
      request.input('maxPts', dbSql.Int, maxPts);
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
/**
 * @api {post} /api/crafters Criar crafter
 * @apiDescription Cria um novo crafter (apenas para administradores).
 * @apiGroup Crafters
 * @apiPermission Admin
 * @apiParam {string} nome Nome do crafter.
 * @apiParam {string} [email] Email do crafter.
 * @apiParam {string} [avatar_url] URL do avatar.
 * @apiParam {number} [pontos=0] Pontuação inicial.
 * @apiParam {string} [nivel] Nível do crafter.
 * @apiParam {boolean} [ativo=true] Status do crafter.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Dados do crafter criado.
 */
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
/**
 * @api {get} /api/crafters/:id Obter crafter por ID
 * @apiDescription Retorna os detalhes de um crafter específico.
 * @apiGroup Crafters
 * @apiParam {number} id ID do crafter.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Dados do crafter.
 */
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
/**
 * @api {put} /api/crafters/:id Atualizar crafter
 * @apiDescription Atualiza dados de um crafter (apenas para administradores).
 * @apiGroup Crafters
 * @apiPermission Admin
 * @apiParam {number} id ID do crafter.
 * @apiParam {string} [nome] Nome do crafter.
 * @apiParam {string} [email] Email do crafter.
 * @apiParam {string} [avatar_url] URL do avatar.
 * @apiParam {number} [pontos] Pontuação.
 * @apiParam {string} [nivel] Nível.
 * @apiParam {boolean} [ativo] Status.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Dados do crafter atualizado.
 */
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
/**
 * @api {delete} /api/crafters/:id Excluir crafter
 * @apiDescription Remove um crafter e suas associações (equipes, ranking) (apenas para administradores).
 * @apiGroup Crafters
 * @apiPermission Admin
 * @apiParam {number} id ID do crafter.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {boolean} removed Indica que a remoção foi efetuada.
 */
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

// -----------------------------------------------------------------------------------------
// 17. Rotas de Ranking (Gamificação)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/ranking Obter ranking
 * @apiDescription Retorna o ranking atual dos crafters e o Top 3.
 * @apiGroup Ranking
 * @apiSuccess {Object[]} crafters Lista completa de crafters ordenada por pontos.
 * @apiSuccess {Object[]} top3 Lista dos 3 primeiros colocados com metadados de pódio.
 * @apiSuccess {Object[]} all Alias para lista de crafters.
 */
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
      .query("SELECT crafter_id, position, reward FROM dbo.ranking_top3 WHERE position IN (1, 2, 3) ORDER BY position ASC");
    
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

/**
 * @api {put} /api/ranking/points/:crafterId Atualizar pontos
 * @apiDescription Atualiza a pontuação de um crafter (apenas para administradores).
 * @apiGroup Ranking
 * @apiPermission Admin
 * @apiParam {number} crafterId ID do crafter.
 * @apiParam {number} [delta] Valor a adicionar/subtrair (ex: 10, -5).
 * @apiParam {number} [set] Valor exato para definir.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {string} message Mensagem de feedback.
 */
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

app.put('/api/ranking/top3', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = {}; }
    }
    const arr = Array.isArray(payload?.top3) ? payload.top3 : (Array.isArray(payload) ? payload : []);
    if (!Array.isArray(arr) || arr.length !== 3) {
      return res.status(400).json({ error: 'Top3 inválido' });
    }
    const positions = arr.map(x => Number(x.position));
    const ids = arr.map(x => Number(x.crafter_id));
    if (positions.some(p => ![1,2,3].includes(p)) || new Set(positions).size !== 3) {
      return res.status(400).json({ error: 'Posições inválidas' });
    }
    if (ids.some(id => !id || isNaN(id)) || new Set(ids).size !== 3) {
      return res.status(400).json({ error: 'Crafters inválidos ou duplicados' });
    }

    const pool = await getConnectionPool();
    await pool.request().query('DELETE FROM dbo.ranking_top3 WHERE position IN (1,2,3)');

    for (const item of arr) {
      const r = pool.request()
        .input('crafter_id', dbSql.Int, Number(item.crafter_id))
        .input('position', dbSql.Int, Number(item.position))
        .input('reward', dbSql.NVarChar, String(item.reward || ''));
      await r.query('INSERT INTO dbo.ranking_top3 (crafter_id, position, reward) VALUES (@crafter_id, @position, @reward)');
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar top3:', err);
    next(err);
  }
});

// -----------------------------------------------------------------------------------------
// 18. Rotas de Equipes (Gestão de Times)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/equipes Listar equipes
 * @apiDescription Retorna a lista de equipes formadas, com detalhes de projeto, mentor e crafter.
 * @apiGroup Equipes
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object[]} data Lista de equipes com joins.
 */
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

/**
 * @api {post} /api/equipes Criar equipe
 * @apiDescription Associa um crafter a um projeto e mentor (apenas para administradores).
 * @apiGroup Equipes
 * @apiPermission Admin
 * @apiParam {number} projeto_id ID do projeto.
 * @apiParam {number} mentor_id ID do mentor.
 * @apiParam {number} crafter_id ID do crafter.
 * @apiParam {string} [status_inscricao='inscrito'] Status inicial.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Dados da equipe criada.
 */
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

/**
 * @api {delete} /api/equipes/:id Remover equipe
 * @apiDescription Remove uma associação de equipe (apenas para administradores).
 * @apiGroup Equipes
 * @apiPermission Admin
 * @apiParam {number} id ID da equipe.
 * @apiSuccess {boolean} success Indica sucesso.
 */
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

/**
 * @api {put} /api/equipes/:id/status Atualizar status equipe
 * @apiDescription Atualiza o status de inscrição de um membro na equipe (apenas para administradores).
 * @apiGroup Equipes
 * @apiPermission Admin
 * @apiParam {number} id ID da equipe.
 * @apiParam {string} status_inscricao Novo status.
 * @apiSuccess {boolean} success Indica sucesso.
 */
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

/**
 * @api {post} /api/projetos/:id/mentor Associar mentor a projeto
 * @apiDescription Vincula um mentor a um projeto específico (apenas para administradores).
 * @apiGroup Projetos
 * @apiPermission Admin
 * @apiParam {number} id ID do projeto.
 * @apiParam {number} mentor_id ID do mentor.
 * @apiSuccess {boolean} success Indica sucesso.
 */
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

// -----------------------------------------------------------------------------------------
// 19. Rotas de Inscrições (Interesse Público)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/inscricoes Listar inscrições
 * @apiDescription Retorna a lista de inscrições recebidas.
 * @apiGroup Inscrições
 * @apiParam {string} [status] Filtrar por status (ex: 'pendente').
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object[]} data Lista de inscrições.
 */
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

/**
 * @api {post} /api/inscricoes Criar inscrição
 * @apiDescription Cria uma nova inscrição de interesse (público).
 * @apiGroup Inscrições
 * @apiParam {string} nome Nome do interessado.
 * @apiParam {string} email Email de contato.
 * @apiParam {string} [telefone] Telefone.
 * @apiParam {string} [cidade] Cidade.
 * @apiParam {string} [estado] Estado.
 * @apiParam {string} [area_interesse] Área de interesse.
 * @apiParam {string} [mensagem] Mensagem ou observações.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Dados da inscrição criada.
 */
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

// -----------------------------------------------------------------------------------------
// 19.1. Atualizar Status de Inscrição
// -----------------------------------------------------------------------------------------

/**
 * @api {put} /api/inscricoes/:id/status Atualizar status inscrição
 * @apiDescription Atualiza o status de uma inscrição (apenas para administradores).
 * @apiGroup Inscrições
 * @apiPermission Admin
 * @apiParam {number} id ID da inscrição.
 * @apiParam {string} status Novo status ('pendente', 'contato_realizado', 'confirmado', 'rejeitado').
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Dados atualizados da inscrição.
 */
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

// -----------------------------------------------------------------------------------------
// 19.2. Remover Inscrição
// -----------------------------------------------------------------------------------------

/**
 * @api {delete} /api/inscricoes/:id Remover inscrição
 * @apiDescription Remove uma inscrição do sistema (apenas para administradores).
 * @apiGroup Inscrições
 * @apiPermission Admin
 * @apiParam {number} id ID da inscrição.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {boolean} removed Indica que a remoção foi efetuada.
 */
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

// -----------------------------------------------------------------------------------------
// 20. Rotas de Finanças (Gestão Financeira)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/financas Listar finanças
 * @apiDescription Retorna registros financeiros. Pode filtrar por projeto.
 * @apiGroup Finanças
 * @apiPermission Admin
 * @apiParam {number} [project_id] Filtrar por ID do projeto.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object[]} data Lista de registros financeiros.
 */
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

// -----------------------------------------------------------------------------------------
// 21. Rotas de Dashboard (KPIs e Métricas)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/dashboard/resumo Resumo do dashboard
 * @apiDescription Retorna KPIs e dados de evolução para o dashboard administrativo.
 * @apiGroup Dashboard
 * @apiPermission Admin
 * @apiSuccess {Object} totais KPIs consolidados (projetos ativos, receita, etc).
 * @apiSuccess {Object[]} evolucao_mensal Dados de receita agrupados por mês.
 */
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


// -----------------------------------------------------------------------------------------
// 22. Rotas de Aplicativos (Gestão de Aplicativos)
// -----------------------------------------------------------------------------------------
// Lista apps do usuário (permite acesso sem autenticação no ambiente atual)

/**
 * @api {get} /api/apps/mine Listar meus aplicativos
 * @apiDescription Retorna os aplicativos do usuário logado (ou usuário default se não logado).
 * @apiGroup Apps
 * @apiPermission Authenticated
 * @apiParam {number} [page=1] Página atual.
 * @apiParam {number} [pageSize=12] Tamanho da página.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object[]} data Lista de aplicativos.
 * @apiSuccess {Object} pagination Metadados de paginação.
 */
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

/**
 * @api {get} /api/apps Listar todos aplicativos
 * @apiDescription Retorna lista paginada de todos os aplicativos (apenas para administradores).
 * @apiGroup Apps
 * @apiPermission Admin
 * @apiParam {number} [page=1] Página atual.
 * @apiParam {number} [pageSize=50] Tamanho da página.
 * @apiParam {string} [sortBy='created_at'] Coluna de ordenação.
 * @apiParam {string} [sortOrder='desc'] Direção da ordenação.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object[]} data Lista de aplicativos.
 * @apiSuccess {Object} pagination Metadados de paginação.
 */
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
  if (!Number.isFinite(id)) {
    return next();
  }
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

/**
 * @api {put} /api/apps/:id Editar aplicativo
 * @apiDescription Atualiza as informações de um aplicativo existente (apenas admin).
 * @apiGroup Apps
 * @apiPermission Admin
 * @apiParam {number} id ID do aplicativo.
 * @apiBody {string} [name] Nome do aplicativo.
 * @apiBody {string} [mainFeature] Funcionalidade principal.
 * @apiBody {number} [price] Preço do aplicativo.
 * @apiBody {string} [thumbnail] URL da thumbnail.
 * @apiBody {string} [executableUrl] URL do executável.
 * @apiBody {string} [status] Status do aplicativo.
 * @apiBody {number} [ownerId] ID do proprietário.
 * @apiBody {string} [description] Descrição do aplicativo.
 * @apiSuccess {Object} data Dados atualizados do aplicativo.
 */
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

// Upload de executável – configuração de armazenamento (declarado antes da rota)
const downloadsDir = path.join(__dirname, 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  try { fs.mkdirSync(downloadsDir, { recursive: true }); } catch (err) { void err }
}
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, downloadsDir),
  filename: (req, file, cb) => {
    const id = parseInt(req.params.id || '0', 10);
    const original = file.originalname || 'arquivo.exe';
    const ext = path.extname(original).toLowerCase();
    const base = path.basename(original, ext).replace(/[^a-z0-9\-_.]/gi, '_').slice(0, 64) || 'instalador';
    const stamp = Date.now();
    cb(null, `${base}-${id}-${stamp}${ext || '.exe'}`);
  }
});
const upload = multer({ storage: uploadStorage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB

/**
 * @api {post} /api/apps/:id/executable/upload Upload de executável
 * @apiDescription Realiza upload do arquivo executável de um aplicativo e atualiza a URL (apenas admin).
 * @apiGroup Apps
 * @apiPermission Admin
 * @apiParam {number} id ID do aplicativo.
 * @apiBody {File} file Arquivo executável (multipart/form-data).
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {string} download_url URL relativa para download.
 */
app.post('/api/apps/:id/executable/upload', authenticate, authorizeAdmin, upload.single('file'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado (campo file)' });

    const relUrl = `/downloads/${req.file.filename}`;
    const pool = await getConnectionPool();
    try {
      await pool.request()
        .input('id', dbSql.Int, id)
        .input('url', dbSql.NVarChar, relUrl)
        .query('UPDATE dbo.apps SET executable_url=@url, updated_at=SYSUTCDATETIME() WHERE id=@id');
    } catch {
      try {
        await pool.request()
          .input('id', dbSql.Int, id)
          .input('url', dbSql.NVarChar, relUrl)
          .query('UPDATE dbo.apps SET executable_url=@url WHERE id=@id');
      } catch (e2) {
        console.error('Falha ao atualizar executable_url:', e2?.message || e2);
        return res.status(500).json({ error: 'Erro ao atualizar aplicativo com URL do executável' });
      }
    }

    return res.status(201).json({ success: true, download_url: relUrl, filename: req.file.filename, size: req.file.size });
  } catch (err) {
    console.error('Erro no upload de executável:', err);
    return res.status(500).json({ error: err?.message || 'Falha no upload' });
  }
});

/**
 * @api {delete} /api/apps/:id Excluir aplicativo
 * @apiDescription Remove um aplicativo do sistema (apenas admin).
 * @apiGroup Apps
 * @apiPermission Admin
 * @apiParam {number} id ID do aplicativo.
 * @apiSuccess {boolean} success Indica sucesso.
 */
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


// -----------------------------------------------------------------------------------------
// 23. Rotas de Mercado Pago (Integração de Pagamentos)
// -----------------------------------------------------------------------------------------

/**
 * @api {post} /api/apps/:id/purchase Criar preferência de pagamento (MP)
 * @apiDescription Cria uma preferência de pagamento no Mercado Pago para o aplicativo selecionado.
 * @apiGroup MercadoPago
 * @apiParam {number} id ID do aplicativo.
 * @apiBody {Object} [payment_methods] Configurações de métodos de pagamento.
 * @apiBody {string} [statement_descriptor] Descrição na fatura.
 * @apiBody {Object} [payer] Dados do pagador (email, nome, identificação).
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {string} preference_id ID da preferência criada.
 * @apiSuccess {string} init_point URL para checkout.
 */
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

/**
 * @api {get} /api/apps/:id/purchase/status Consultar status de pagamento
 * @apiDescription Consulta o status de um pagamento do Mercado Pago e libera o download se aprovado.
 * @apiGroup MercadoPago
 * @apiParam {number} id ID do aplicativo.
 * @apiQuery {string} [payment_id] ID do pagamento no MP.
 * @apiQuery {string} [status] Status forçado (mock/debug).
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {string} status Status do pagamento (approved, pending, etc).
 * @apiSuccess {string} [download_url] URL de download se aprovado.
 */
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
      const fallbackUrl = String(appItem.name || '').toLowerCase() === 'coincraft' ? '/downloads/InstalarCoinCraft.exe' : null;
      const download_url = status === 'approved' ? (appItem.executableUrl || fallbackUrl) : null;
      paymentsByApp.set(id, { payment_id, status });
      if (status === 'approved') {
        try {
          const meta = paymentsByApp.get(id) || {};
          const tx = {
            amount: Number(appItem.price || data?.transaction_amount || 0),
            products: meta.products || [{ title: appItem.name, quantity: 1, unit_price: Number(appItem.price || 0) }],
            customer: { email: req.user?.email, name: req.user?.name },
          };
          await mercadoLivre.sendTransaction(tx, { external_reference: String(payment_id), metadata: { payment_id } });
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
      await mercadoLivre.sendTransaction(tx, { external_reference: String(paymentsByApp.get(id)?.payment_id || id), metadata: { source: 'status_check', payment_id: paymentsByApp.get(id)?.payment_id } });
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

/**
 * @api {post} /api/feedbacks Enviar feedback geral
 * @apiDescription Envia um feedback, sugestão ou contato geral.
 * @apiGroup Feedbacks
 * @apiBody {string} [nome] Nome do remetente.
 * @apiBody {string} [email] E-mail do remetente.
 * @apiBody {string} mensagem Conteúdo da mensagem.
 * @apiBody {string} [origem] Origem do feedback (ex: web).
 * @apiSuccess {boolean} success Indica sucesso.
 */
app.post('/api/feedbacks', sensitiveLimiter, async (req, res) => {
  try {
    const { nome, email, mensagem, origem } = req.body || {};
    if (!mensagem || String(mensagem).trim().length < 2) {
      return res.status(400).json({ error: 'Mensagem é obrigatória.' });
    }

    const pool = await getConnectionPool();
    let userId = null;
    
    // Tenta identificar usuário pelo email se fornecido (se não autenticado)
    if (req.user && req.user.id) {
      userId = req.user.id;
    } else if (email) {
       const uRes = await pool.request().input('em', dbSql.NVarChar, email).query('SELECT id FROM dbo.users WHERE email = @em');
       if (uRes.recordset[0]) userId = uRes.recordset[0].id;
    }

    await pool.request()
      .input('uid', dbSql.Int, userId)
      .input('name', dbSql.NVarChar, String(nome || 'Anônimo'))
      .input('email', dbSql.NVarChar, String(email || ''))
      .input('msg', dbSql.NVarChar, String(mensagem))
      .input('origin', dbSql.NVarChar, String(origem || 'web'))
      .query('INSERT INTO dbo.feedbacks (user_id, name, email, message, origin) VALUES (@uid, @name, @email, @msg, @origin)');

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar feedback:', err);
    return res.status(500).json({ error: 'Erro interno ao salvar feedback.' });
  }
});

/**
 * @api {post} /api/apps/:id/download Registrar download
 * @apiDescription Registra um download e retorna a URL do executável se permitido (grátis ou pago aprovado).
 * @apiGroup Apps
 * @apiPermission Authenticated
 * @apiParam {number} id ID do aplicativo.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {string} download_url URL do executável.
 */
app.post('/api/apps/:id/download', authenticate, sensitiveLimiter, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  let appItem = null;
  try {
    const pool = await getConnectionPool();
    const dataRes = await pool.request()
      .input('id', dbSql.Int, id)
      .query(`SELECT id, name, price, executable_url AS executableUrl FROM dbo.apps WHERE id=@id`);
    appItem = dataRes.recordset[0] || null;
    
    if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });

    // Verifica permissão: Gratuito ou Pago Aprovado
    const isFree = !appItem.price || appItem.price <= 0;
    let allowed = isFree;
    
    if (!allowed) {
      // Verifica pagamento no banco
      const payRes = await pool.request()
        .input('uid', dbSql.Int, req.user.id)
        .input('aid', dbSql.Int, id)
        .query("SELECT TOP 1 status FROM dbo.app_payments WHERE user_id = @uid AND app_id = @aid AND status = 'approved'");
      if (payRes.recordset.length > 0) allowed = true;
    }
    
    // Permite também se for admin
    if (!allowed && req.user.role === 'admin') allowed = true;

    if (!allowed) return res.status(403).json({ error: 'Download não liberado. Pagamento não aprovado.' });

    const fallbackUrl = String(appItem.name || '').toLowerCase() === 'coincraft' ? '/downloads/InstalarCoinCraft.exe' : null;
    const url = appItem.executableUrl || fallbackUrl;
    
    if (!url) return res.status(400).json({ error: 'Aplicativo sem URL de executável configurada' });

    // Registra histórico
    try {
        await pool.request()
        .input('type', dbSql.NVarChar, 'download')
        .input('app_id', dbSql.Int, id)
        .input('app_name', dbSql.NVarChar, appItem.name)
        .input('status', dbSql.NVarChar, 'done')
        .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
    } catch (e) { console.warn('Erro ao registrar historico download', e); }

    return res.json({ success: true, download_url: url });
  } catch (err) {
    console.error('Erro no download:', err);
    return res.status(500).json({ error: 'Erro interno ao processar download.' });
  }
});

app.post('/api/apps/:id/download/by-email', sensitiveLimiter, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String(body?.email || '').trim();
    if (!email || !validateEmail(email)) return res.status(400).json({ error: 'Email inválido' });

    const pool = await getConnectionPool();
    const dataRes = await pool.request().input('id', dbSql.Int, id).query('SELECT id, name, price, executable_url AS executableUrl FROM dbo.apps WHERE id=@id');
    const appItem = dataRes.recordset[0] || null;
    if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });

    const isFree = !appItem.price || appItem.price <= 0;
    let allowed = isFree;

    if (!allowed) {
      const uRes = await pool.request().input('email', dbSql.NVarChar, email).query('SELECT TOP 1 id FROM dbo.users WHERE email=@email');
      const uid = uRes.recordset[0]?.id || null;
      const reqPay = pool.request().input('aid', dbSql.Int, id).input('email', dbSql.NVarChar, email);
      let sql = "SELECT TOP 1 status FROM dbo.app_payments WHERE app_id=@aid AND status='approved' AND payer_email=@email";
      if (uid) { reqPay.input('uid', dbSql.Int, uid); sql = "SELECT TOP 1 status FROM dbo.app_payments WHERE app_id=@aid AND status='approved' AND (payer_email=@email OR user_id=@uid)"; }
      const payRes = await reqPay.query(sql);
      if (payRes.recordset.length > 0) allowed = true;
    }

    if (!allowed) return res.status(403).json({ error: 'Download não liberado para este e-mail.' });

    try {
      await pool.request()
        .input('email', dbSql.NVarChar, email)
        .input('aid', dbSql.Int, id)
        .query("MERGE dbo.user_licenses AS T USING (SELECT @email AS email, @aid AS aid) AS S ON (T.email = S.email AND T.app_id = S.aid AND T.hardware_id IS NULL) WHEN NOT MATCHED THEN INSERT (email, app_id, created_at) VALUES (S.email, S.aid, SYSUTCDATETIME());");
    } catch (e) { void e }

    const fallbackUrl = String(appItem.name || '').toLowerCase() === 'coincraft' ? '/downloads/InstalarCoinCraft.exe' : null;
    const url = appItem.executableUrl || fallbackUrl;
    if (!url) return res.status(400).json({ error: 'Aplicativo sem URL de executável configurada' });

    try {
      await pool.request()
        .input('type', dbSql.NVarChar, 'download')
        .input('app_id', dbSql.Int, id)
        .input('app_name', dbSql.NVarChar, appItem.name)
        .input('status', dbSql.NVarChar, 'done')
        .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
    } catch (e) { void e }

    return res.json({ success: true, download_url: url });
  } catch (err) {
    console.error('Erro interno ao processar download por e-mail:', err);
    return res.status(500).json({ error: 'Erro interno ao processar download por e-mail.' });
  }
});

// -----------------------------------------------------------------------------------------
// 26. Rotas de Histórico e Feedback de Apps (Gestão de Apps)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/apps/history Histórico de apps
 * @apiDescription Lista o histórico global de downloads e compras de aplicativos.
 * @apiGroup Apps
 * @apiQuery {number} [page=1] Número da página.
 * @apiQuery {number} [pageSize=20] Itens por página.
 * @apiSuccess {Object[]} data Lista de eventos.
 * @apiSuccess {Object} pagination Metadados de paginação.
 */
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

/**
 * @api {post} /api/apps/:id/feedback Enviar feedback de app
 * @apiDescription Registra uma avaliação e comentário para um aplicativo específico.
 * @apiGroup Apps
 * @apiPermission Authenticated
 * @apiParam {number} id ID do aplicativo.
 * @apiBody {number} [rating=5] Nota de 1 a 5.
 * @apiBody {string} [comment] Comentário.
 * @apiSuccess {boolean} success Indica sucesso.
 */
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

// -----------------------------------------------------------------------------------------
// 24. Rotas de Licenças (Ativação e Validação)
// -----------------------------------------------------------------------------------------
// Fluxo público para clientes não autenticados vincularem um novo hardware.
// Valida e-mail/hardware, verifica compras aprovadas e atualiza/inserta licença.
// Aceita payload em camelCase ou snake_case para compatibilidade com diferentes clientes.
app.post('/api/public/license/activate-device', sensitiveLimiter, async (req, res) => {
  let emailForLog = null;
  let appIdForLog = null;
  let hwidForLog = null;
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String(body?.email || '').trim();
    const rawAppPub = body?.app_id ?? body?.appId ?? process.env.COINCRAFT_APP_ID ?? 1;
    const app_id = Number(rawAppPub);
    const hardware_id = String(body?.hardware_id ?? body?.hardwareId ?? '');
    emailForLog = email;
    appIdForLog = app_id;
    hwidForLog = hardware_id;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'E-mail inválido ou não informado.' });
    }
    if (!app_id || !hardware_id) {
      return res.status(400).json({ success: false, message: 'ID do App e Hardware ID são obrigatórios.' });
    }

    const pool = await getConnectionPool();

    const comprasQuery = await pool.request()
      .input('email', dbSql.NVarChar, email)
      .input('app_id', dbSql.Int, Number(app_id))
      .query(`
        SELECT COUNT(*) as total
        FROM dbo.app_payments
        WHERE payer_email = @email
          AND app_id = @app_id
          AND status = 'approved'
      `);
    const totalCompras = comprasQuery.recordset[0]?.total || 0;

    const devBypass = ((process.env.NODE_ENV || 'development') === 'development') && String(process.env.ALLOW_DEV_LICENSE || '').toLowerCase() === 'true';
    if (totalCompras === 0 && !devBypass) {
      const ownerCheck = await pool.request()
        .input('email', dbSql.NVarChar, email)
        .input('app_id', dbSql.Int, Number(app_id))
        .query(`
          SELECT 1 FROM dbo.apps a
          JOIN dbo.users u ON a.owner_id = u.id
          WHERE a.id = @app_id AND u.email = @email
        `);
      if (!ownerCheck.recordset.length) {
        return res.status(403).json({ success: false, licensed: false, message: 'Nenhuma compra confirmada encontrada para este e-mail.' });
      }
    }

    let userId = null;
    const payUserRes = await pool.request()
      .input('email', dbSql.NVarChar, email)
      .input('app_id', dbSql.Int, Number(app_id))
      .query(`SELECT TOP 1 user_id FROM dbo.app_payments WHERE app_id=@app_id AND status='approved' AND payer_email=@email ORDER BY updated_at DESC`);
    userId = payUserRes.recordset[0]?.user_id || null;
    if (userId !== null) {
      const chkPayUid = await pool.request().input('id', dbSql.Int, userId).query('SELECT id FROM dbo.users WHERE id=@id');
      if (!chkPayUid.recordset[0]) userId = null;
    }
    if (userId === null) {
      const ownerRes = await pool.request().input('id', dbSql.Int, Number(app_id)).query('SELECT owner_id AS ownerId FROM dbo.apps WHERE id=@id');
      const ownerId = ownerRes.recordset[0]?.ownerId ?? null;
      if (ownerId !== null) {
        const chkOwner = await pool.request().input('id', dbSql.Int, ownerId).query('SELECT id FROM dbo.users WHERE id=@id');
        userId = chkOwner.recordset[0]?.id ?? null;
      }
    }
    if (userId === null) {
      const userByEmail = await pool.request().input('email', dbSql.NVarChar, email).query('SELECT TOP 1 id FROM dbo.users WHERE email=@email');
      userId = userByEmail.recordset[0]?.id ?? null;
    }
    if (userId === null) {
      const anyUser = await pool.request().query('SELECT TOP 1 id FROM dbo.users ORDER BY id ASC');
      userId = anyUser.recordset[0]?.id ?? null;
    }

    const licensesQuery = await pool.request()
      .input('email', dbSql.NVarChar, email)
      .input('app_id', dbSql.Int, Number(app_id))
      .query(`SELECT id, hardware_id FROM dbo.user_licenses WHERE app_id = @app_id AND email = @email`);

  const existingLicenses = licensesQuery.recordset || [];
  const isSameHardware = existingLicenses.find(l => l.hardware_id === String(hardware_id));

    if (isSameHardware) {
      const ua = String(req.headers['user-agent'] || '');
      const ip = req.ip || req.connection?.remoteAddress || '';
      await pool.request()
        .input('app_id', dbSql.Int, Number(app_id))
        .input('email', dbSql.NVarChar, String(email))
        .input('hardware_id', dbSql.NVarChar, String(hardware_id))
        .input('license_id', dbSql.Int, isSameHardware.id)
        .input('action', dbSql.NVarChar, 'activate')
        .input('status', dbSql.NVarChar, 'ok')
        .input('message', dbSql.NVarChar, 'VALIDATED')
        .input('ip', dbSql.NVarChar, String(ip))
        .input('ua', dbSql.NVarChar, ua)
        .query('INSERT INTO dbo.license_activations (app_id, email, hardware_id, license_id, action, status, message, ip, user_agent) VALUES (@app_id, @email, @hardware_id, @license_id, @action, @status, @message, @ip, @ua)');
      return res.json({ success: true, licensed: true, message: 'Licença ativa verificada.', license_key: `VALID-${userId}-${app_id}` });
    }

    const allowedActivations = devBypass ? Math.max(1, totalCompras) : totalCompras;
    const usedCount = existingLicenses.filter(l => l.hardware_id && String(l.hardware_id).trim() !== '').length;
    if (allowedActivations > usedCount) {
      const appNameRes = await pool.request().input('id', dbSql.Int, Number(app_id)).query('SELECT name FROM dbo.apps WHERE id=@id');
      const appName = appNameRes.recordset[0]?.name || null;
      const upd = await pool.request()
        .input('app_id', dbSql.Int, Number(app_id))
        .input('email', dbSql.NVarChar, String(email))
        .input('hwid', dbSql.NVarChar, String(hardware_id))
        .input('appname', dbSql.NVarChar, appName)
        .input('key', dbSql.NVarChar, `LIC-${Date.now()}-${userId ?? 'anon'}`)
        .query("UPDATE dbo.user_licenses SET hardware_id=@hwid, license_key=@key, app_name=@appname, activated_at=ISNULL(activated_at, SYSUTCDATETIME()), updated_at=SYSUTCDATETIME() WHERE app_id=@app_id AND email=@email AND (hardware_id IS NULL OR LTRIM(RTRIM(hardware_id))='')");
      if ((upd.rowsAffected?.[0] || 0) === 0) {
        await pool.request()
          .input('user_id', dbSql.Int, userId)
          .input('app_id', dbSql.Int, Number(app_id))
          .input('email', dbSql.NVarChar, String(email))
          .input('hwid', dbSql.NVarChar, String(hardware_id))
          .input('appname', dbSql.NVarChar, appName)
          .input('key', dbSql.NVarChar, `LIC-${Date.now()}-${userId ?? 'anon'}`)
          .query('INSERT INTO dbo.user_licenses (user_id, app_id, app_name, email, hardware_id, license_key, activated_at, created_at) VALUES (@user_id, @app_id, @appname, @email, @hwid, @key, SYSUTCDATETIME(), SYSUTCDATETIME())');
      }
      const ua = String(req.headers['user-agent'] || '');
      const ip = req.ip || req.connection?.remoteAddress || '';
      const licRow = await pool.request()
        .input('app_id', dbSql.Int, Number(app_id))
        .input('email', dbSql.NVarChar, String(email))
        .input('hwid', dbSql.NVarChar, String(hardware_id))
        .query('SELECT TOP 1 id FROM dbo.user_licenses WHERE app_id=@app_id AND email=@email AND hardware_id=@hwid ORDER BY id DESC');
      const licId = licRow.recordset[0]?.id || null;
      await auditLicense(pool, { app_id: Number(app_id), email: String(email), hardware_id: String(hardware_id), license_id: licId, action: 'activate', status: 'ok', message: 'NEW_ACTIVATION', ip, ua });

      return res.json({ success: true, licensed: true, message: 'Nova licença ativada com sucesso.', new_activation: true });
    }

    return res.status(403).json({ success: false, licensed: false, message: 'Limite de licenças atingido. Compre novamente para usar em outra máquina.' });
  } catch (err) {
    console.error('Erro na ativação:', { email: emailForLog, app_id: appIdForLog, hardware_id: hwidForLog, error: err?.message || err });
    return res.status(500).json({ success: false, message: 'Erro interno ao validar licença.' });
  }
});

// -----------------------------------------------------------------------------------------
// 25. Rotas de Verificação de Licença (Compatibilidade)
// -----------------------------------------------------------------------------------------
// Verifica se a máquina já está cadastrada; caso não, permite cadastro
// se houver saldo de compras (compras aprovadas > licenças usadas).
// Audita tanto sucessos quanto rejeições em dbo.license_activations.
app.post('/api/verify-license', sensitiveLimiter, async (req, res) => { 
  try { 
    let body = req.body; 
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } } 
    const email = String(body?.email || '').trim(); 
    const hardware_id = String(body?.hardware_id ?? body?.hardwareId ?? ''); 
    const rawApp = body?.app_id ?? body?.appId; 
    const resolvedAppId = Number(rawApp);
    const app_id = Number.isInteger(resolvedAppId) && resolvedAppId > 0 
      ? resolvedAppId 
      : Number(process.env.COINCRAFT_APP_ID || 1);

    // Validações básicas 
    if (!email || !email.includes('@')) { 
      return res.status(400).json({ success: false, licensed: false, message: 'Email inválido' }); 
    } 
    if (!hardware_id || hardware_id.length < 5) { 
      return res.status(400).json({ success: false, licensed: false, message: 'ID do PC inválido' }); 
    } 

    const pool = await getConnectionPool(); 

    // 2. VERIFICAÇÃO DE RECADASTRO (Licença já existente) 
    const checkLicense = await pool.request() 
      .input('email', dbSql.NVarChar, email) 
      .input('hwid', dbSql.NVarChar, hardware_id) 
      .input('app_id', dbSql.Int, app_id) 
      .query(` 
        SELECT TOP 1 l.id 
        FROM dbo.user_licenses l 
        JOIN dbo.users u ON l.user_id = u.id 
        WHERE u.email = @email 
          AND l.hardware_id = @hwid 
          AND l.app_id = @app_id 
      `); 

    if (checkLicense.recordset.length > 0) { 
      console.log(`Acesso validado (Recorrente): ${email}`); 
      const ua = String(req.headers['user-agent'] || '');
      const ip = req.ip || req.connection?.remoteAddress || '';
      const licId = checkLicense.recordset[0].id;
      await auditLicense(pool, { app_id, email, hardware_id, license_id: licId, action: 'verify', status: 'ok', message: 'LICENSE_OK', ip, ua });
      return res.json({ success: true, licensed: true, message: "Acesso validado" }); 
    } 

    // 3. PRIMEIRO CADASTRO (Verifica saldo de compras) 
    const totalPaid = await getApprovedPurchasesCount(pool, email, app_id);
    const totalUsed = await getUsedLicensesCount(pool, email, app_id);

    // Se tiver mais compras que licenças usadas, permite cadastrar a nova máquina 
    if (totalPaid > totalUsed) { 
      let userId = null; 
      const userRes = await pool.request().input('e', dbSql.NVarChar, email).query('SELECT id FROM dbo.users WHERE email = @e'); 
      
      if(userRes.recordset.length > 0) { 
        userId = userRes.recordset[0].id; 
      } else { 
          // Cria usuário rápido se não existir 
          const newUser = await pool.request() 
            .input('n', dbSql.NVarChar, email.split('@')[0]) 
            .input('e', dbSql.NVarChar, email) 
            .query("INSERT INTO dbo.users (name, email, role, status, created_at) OUTPUT Inserted.id VALUES (@n, @e, 'viewer', 'ativo', SYSUTCDATETIME())"); 
          userId = newUser.recordset[0].id; 
      } 

      const ua = String(req.headers['user-agent'] || '');
      const ip = req.ip || req.connection?.remoteAddress || '';
      const appNameRes = await pool.request().input('id', dbSql.Int, app_id).query('SELECT name FROM dbo.apps WHERE id=@id');
      const appName = appNameRes.recordset[0]?.name || null;
      const ins = await pool.request() 
        .input('uid', dbSql.Int, userId) 
        .input('aid', dbSql.Int, app_id) 
        .input('appname', dbSql.NVarChar, appName) 
        .input('email', dbSql.NVarChar, email) 
        .input('hwid', dbSql.NVarChar, hardware_id) 
        .input('key', dbSql.NVarChar, `KEY-${Date.now()}`) 
        .query(` 
          INSERT INTO dbo.user_licenses (user_id, app_id, app_name, email, hardware_id, license_key, activated_at, created_at) 
          OUTPUT Inserted.id 
          VALUES (@uid, @aid, @appname, @email, @hwid, @key, SYSUTCDATETIME(), SYSUTCDATETIME()) 
        `); 
      const licId = ins.recordset[0]?.id || null;
      await auditLicense(pool, { app_id, email, hardware_id, license_id: licId, action: 'activate', status: 'ok', message: 'LICENSE_BOUND', ip, ua });
      console.log(`Novo registro vinculado: ${email} -> ${hardware_id}`); 
      return res.json({ success: true, licensed: true, new_activation: true, message: "Registro atualizado e vinculado" }); 
    } 

    // Se chegou aqui, não tem compra ou todas estão em uso 
    const ua = String(req.headers['user-agent'] || '');
    const ip = req.ip || req.connection?.remoteAddress || '';
    await auditLicense(pool, { app_id, email, hardware_id, license_id: null, action: 'verify', status: 'denied', message: 'LICENSE_LIMIT', ip, ua });
    console.log(`Falha de acesso: ${email} (Sem saldo ou PC incorreto)`); 
    return res.status(403).json({ success: false, licensed: false, message: "Credenciais não encontradas ou limite atingido" }); 

  } catch (error) { 
    console.error("Erro na API de licença:", error); 
    res.status(500).json({ success: false, licensed: false, message: "Erro no servidor" }); 
  } 
});

app.get('/api/compat/license-check', sensitiveLimiter, async (req, res) => {
  try {
    const email = String((req.query?.email || '')).trim().toLowerCase();
    const id_pc = String((req.query?.id_pc || req.query?.hardware_id || req.query?.hardwareId || req.headers['x-device-id'] || req.headers['X-Device-Id'] || '')).trim();
    const pool = await getConnectionPool();
    const app_id = await resolveAppId(pool, (req.query?.app_id ?? req.query?.appId), (req.query?.app ?? req.query?.app_name));

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email inválido' });
    }
    if (!isValidPcId(id_pc)) {
      return res.status(400).json({ success: false, message: 'ID do PC inválido' });
    }
    if (!Number.isFinite(app_id) || app_id <= 0) {
      return res.status(400).json({ success: false, message: 'App inválido' });
    }

    const rec = await pool.request()
      .input('email', dbSql.NVarChar, email)
      .input('hwid', dbSql.NVarChar, id_pc)
      .input('aid', dbSql.Int, app_id)
      .query(`
        SELECT TOP 1 l.id
        FROM dbo.user_licenses l
        JOIN dbo.users u ON l.user_id = u.id
        WHERE u.email = @email AND l.hardware_id = @hwid AND l.app_id = @aid
      `);

    if (rec.recordset.length > 0) {
      const ua = String(req.headers['user-agent'] || '');
      const ip = req.ip || req.connection?.remoteAddress || '';
      const licId = rec.recordset[0].id;
      await auditLicense(pool, { app_id, email, hardware_id: id_pc, license_id: licId, action: 'verify', status: 'ok', message: 'LICENSE_OK', ip, ua });
      return res.json({ success: true, message: 'Acesso validado' });
    }

    const slotQ = await pool.request()
      .input('email', dbSql.NVarChar, email)
      .input('aid', dbSql.Int, app_id)
      .query(`
        SELECT TOP 1 l.id
        FROM dbo.user_licenses l
        JOIN dbo.users u ON l.user_id = u.id
        WHERE u.email = @email AND l.app_id = @aid AND (l.hardware_id IS NULL OR LTRIM(RTRIM(l.hardware_id))='')
        ORDER BY l.id ASC
      `);

    const ua = String(req.headers['user-agent'] || '');
    const ip = req.ip || req.connection?.remoteAddress || '';

    if (slotQ.recordset.length > 0) {
      const licId = slotQ.recordset[0].id;
      await pool.request()
        .input('id', dbSql.Int, licId)
        .input('hwid', dbSql.NVarChar, id_pc)
        .query("UPDATE dbo.user_licenses SET hardware_id=@hwid, activated_at=ISNULL(activated_at, SYSUTCDATETIME()), updated_at=SYSUTCDATETIME() WHERE id=@id");
      await auditLicense(pool, { app_id, email, hardware_id: id_pc, license_id: licId, action: 'activate', status: 'ok', message: 'LICENSE_BOUND', ip, ua });
      return res.json({ success: true, message: 'Registro atualizado' });
    }

    const totalPaid = await getApprovedPurchasesCount(pool, email, app_id);
    const totalUsed = await getUsedLicensesCount(pool, email, app_id);
    if (totalPaid <= totalUsed) {
      await auditLicense(pool, { app_id, email, hardware_id: id_pc, license_id: null, action: 'verify', status: 'denied', message: 'LICENSE_LIMIT', ip, ua });
      return res.json({ success: false, message: 'Credenciais não encontradas' });
    }

    let userId = null;
    const uRes = await pool.request().input('email', dbSql.NVarChar, email).query('SELECT TOP 1 id FROM dbo.users WHERE email=@email');
    userId = uRes.recordset[0]?.id || null;
    if (!userId) {
      const newUser = await pool.request()
        .input('n', dbSql.NVarChar, email.split('@')[0])
        .input('e', dbSql.NVarChar, email)
        .query("INSERT INTO dbo.users (name, email, role, status, created_at) OUTPUT Inserted.id VALUES (@n, @e, 'viewer', 'ativo', SYSUTCDATETIME())");
      userId = newUser.recordset[0]?.id || null;
    }

    const appNameRes = await pool.request().input('id', dbSql.Int, app_id).query('SELECT name FROM dbo.apps WHERE id=@id');
    const appName = appNameRes.recordset[0]?.name || null;
    const ins = await pool.request()
      .input('uid', dbSql.Int, userId)
      .input('aid', dbSql.Int, app_id)
      .input('appname', dbSql.NVarChar, appName)
      .input('email', dbSql.NVarChar, email)
      .input('hwid', dbSql.NVarChar, id_pc)
      .input('key', dbSql.NVarChar, `KEY-${Date.now()}`)
      .query('INSERT INTO dbo.user_licenses (user_id, app_id, app_name, email, hardware_id, license_key, activated_at, created_at) OUTPUT Inserted.id VALUES (@uid, @aid, @appname, @email, @hwid, @key, SYSUTCDATETIME(), SYSUTCDATETIME())');
    const licId = ins.recordset[0]?.id || null;
    await auditLicense(pool, { app_id, email, hardware_id: id_pc, license_id: licId, action: 'activate', status: 'ok', message: 'LICENSE_BOUND', ip, ua });
    return res.json({ success: true, message: 'Registro atualizado' });
  } catch (err) {
    void err;
    return res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
});

app.post('/api/compat/license-check', sensitiveLimiter, async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String((body?.email || '')).trim().toLowerCase();
    const id_pc = String((body?.id_pc || body?.hardware_id || body?.hardwareId || req.headers['x-device-id'] || req.headers['X-Device-Id'] || '')).trim();
    const pool = await getConnectionPool();
    const app_id = await resolveAppId(pool, (body?.app_id ?? body?.appId), (body?.app ?? body?.app_name));

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email inválido' });
    }
    if (!isValidPcId(id_pc)) {
      return res.status(400).json({ success: false, message: 'ID do PC inválido' });
    }
    if (!Number.isFinite(app_id) || app_id <= 0) {
      return res.status(400).json({ success: false, message: 'App inválido' });
    }

    const rec = await pool.request()
      .input('email', dbSql.NVarChar, email)
      .input('hwid', dbSql.NVarChar, id_pc)
      .input('aid', dbSql.Int, app_id)
      .query(`
        SELECT TOP 1 l.id
        FROM dbo.user_licenses l
        JOIN dbo.users u ON l.user_id = u.id
        WHERE u.email = @email AND l.hardware_id = @hwid AND l.app_id = @aid
      `);

    if (rec.recordset.length > 0) {
      const ua = String(req.headers['user-agent'] || '');
      const ip = req.ip || req.connection?.remoteAddress || '';
      const licId = rec.recordset[0].id;
      await auditLicense(pool, { app_id, email, hardware_id: id_pc, license_id: licId, action: 'verify', status: 'ok', message: 'LICENSE_OK', ip, ua });
      return res.json({ success: true, message: 'Acesso validado' });
    }

    const slotQ = await pool.request()
      .input('email', dbSql.NVarChar, email)
      .input('aid', dbSql.Int, app_id)
      .query(`
        SELECT TOP 1 l.id
        FROM dbo.user_licenses l
        JOIN dbo.users u ON l.user_id = u.id
        WHERE u.email = @email AND l.app_id = @aid AND (l.hardware_id IS NULL OR LTRIM(RTRIM(l.hardware_id))='')
        ORDER BY l.id ASC
      `);

    const ua = String(req.headers['user-agent'] || '');
    const ip = req.ip || req.connection?.remoteAddress || '';

    if (slotQ.recordset.length > 0) {
      const licId = slotQ.recordset[0].id;
      await pool.request()
        .input('id', dbSql.Int, licId)
        .input('hwid', dbSql.NVarChar, id_pc)
        .query("UPDATE dbo.user_licenses SET hardware_id=@hwid, activated_at=ISNULL(activated_at, SYSUTCDATETIME()), updated_at=SYSUTCDATETIME() WHERE id=@id");
      await auditLicense(pool, { app_id, email, hardware_id: id_pc, license_id: licId, action: 'activate', status: 'ok', message: 'LICENSE_BOUND', ip, ua });
      return res.json({ success: true, message: 'Registro atualizado' });
    }

    const totalPaid = await getApprovedPurchasesCount(pool, email, app_id);
    const totalUsed = await getUsedLicensesCount(pool, email, app_id);
    if (totalPaid <= totalUsed) {
      await auditLicense(pool, { app_id, email, hardware_id: id_pc, license_id: null, action: 'verify', status: 'denied', message: 'LICENSE_LIMIT', ip, ua });
      return res.json({ success: false, message: 'Credenciais não encontradas' });
    }

    let userId = null;
    const uRes = await pool.request().input('email', dbSql.NVarChar, email).query('SELECT TOP 1 id FROM dbo.users WHERE email=@email');
    userId = uRes.recordset[0]?.id || null;
    if (!userId) {
      const newUser = await pool.request()
        .input('n', dbSql.NVarChar, email.split('@')[0])
        .input('e', dbSql.NVarChar, email)
        .query("INSERT INTO dbo.users (name, email, role, status, created_at) OUTPUT Inserted.id VALUES (@n, @e, 'viewer', 'ativo', SYSUTCDATETIME())");
      userId = newUser.recordset[0]?.id || null;
    }

    const appNameRes = await pool.request().input('id', dbSql.Int, app_id).query('SELECT name FROM dbo.apps WHERE id=@id');
    const appName = appNameRes.recordset[0]?.name || null;
    const ins = await pool.request()
      .input('uid', dbSql.Int, userId)
      .input('aid', dbSql.Int, app_id)
      .input('appname', dbSql.NVarChar, appName)
      .input('email', dbSql.NVarChar, email)
      .input('hwid', dbSql.NVarChar, id_pc)
      .input('key', dbSql.NVarChar, `KEY-${Date.now()}`)
      .query('INSERT INTO dbo.user_licenses (user_id, app_id, app_name, email, hardware_id, license_key, activated_at, created_at) OUTPUT Inserted.id VALUES (@uid, @aid, @appname, @email, @hwid, @key, SYSUTCDATETIME(), SYSUTCDATETIME())');
    const licId = ins.recordset[0]?.id || null;
    await auditLicense(pool, { app_id, email, hardware_id: id_pc, license_id: licId, action: 'activate', status: 'ok', message: 'LICENSE_BOUND', ip, ua });
    return res.json({ success: true, message: 'Registro atualizado' });
  } catch (err) {
    void err;
    return res.status(500).json({ success: false, message: 'Erro no servidor' });
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

/**
 * @api {post} /api/apps/:id/payment/direct Pagamento Transparente
 * @apiDescription Processa um pagamento direto (Card/Pix/etc) via Mercado Pago para um aplicativo.
 * @apiGroup MercadoPago
 * @apiParam {number} id ID do aplicativo.
 * @apiBody {string} token Token do cartão (se aplicável).
 * @apiBody {string} payment_method_id ID do método de pagamento (ex: master, visa, pix).
 * @apiBody {number} installments Número de parcelas.
 * @apiBody {string} [description] Descrição do pagamento.
 * @apiBody {Object} [payer] Dados do pagador.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {string} payment_id ID do pagamento gerado.
 * @apiSuccess {string} status Status do pagamento.
 */
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
    // Usa ensureAccessToken para preferir OAuth; se indisponível, depende do access token direto
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
    // Define cabeçalhos com idempotência e dados de rastreio (device/tracking)
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
    const docType = (
      json?.payer?.identification?.type
      || safePayer?.identification?.type
      || payload?.metadata?.cardholder_identification_type
      || null
    );
    const docNumber = (
      json?.payer?.identification?.number
      || safePayer?.identification?.number
      || payload?.metadata?.cardholder_identification_number
      || null
    );

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

    try {
      const pool = await getConnectionPool();
      const mergeRes = await pool.request()
        .input('pid', dbSql.NVarChar, payment_id)
        .input('app_id', dbSql.Int, id)
        .input('user_id', dbSql.Int, req.user?.id || null)
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
        .query(`MERGE dbo.app_payments AS target
                USING (SELECT @pid AS payment_id) AS source
                ON (target.payment_id = source.payment_id)
                WHEN MATCHED THEN
                  UPDATE SET status=@status, amount=@amount, currency=@currency, payer_email=@payer_email, status_detail=@status_detail, payment_type_id=@payment_type_id, issuer_id=@issuer_id, net_received_amount=@net_received_amount, installment_amount=@installment_amount, payer_document_type=@payer_document_type, payer_document_number=@payer_document_number, mp_response_json=@mp_response_json, updated_at=SYSUTCDATETIME()
                WHEN NOT MATCHED THEN
                  INSERT (payment_id, app_id, user_id, status, amount, currency, payer_email, source, status_detail, payment_type_id, issuer_id, net_received_amount, installment_amount, payer_document_type, payer_document_number, mp_response_json)
                  VALUES (@pid, @app_id, @user_id, @status, @amount, @currency, @payer_email, 'mercado_pago', @status_detail, @payment_type_id, @issuer_id, @net_received_amount, @installment_amount, @payer_document_type, @payer_document_number, @mp_response_json);`);
      const affected = mergeRes?.rowsAffected?.reduce((a, b) => a + b, 0) || 0;

      // Auditoria
      await pool.request()
        .input('payment_id', dbSql.NVarChar, payment_id)
        .input('preference_id', dbSql.NVarChar, null)
        .input('app_id', dbSql.Int, id)
        .input('user_id', dbSql.Int, req.user?.id || null)
        .input('action', dbSql.NVarChar, 'create_payment')
        .input('from_status', dbSql.NVarChar, null)
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
        await mercadoLivre.sendTransaction(tx, { external_reference: String(payment_id), metadata: { payment_id } });
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

/**
 * @api {get} /api/apps/:id/payment/last Último pagamento direto
 * @apiDescription Retorna os dados do último pagamento direto processado para um aplicativo (cache em memória).
 * @apiGroup MercadoPago
 * @apiParam {number} id ID do aplicativo.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Dados do pagamento em cache.
 */
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

/**
 * @api {get} /api/payments/search Buscar pagamentos MP
 * @apiDescription Proxy para buscar pagamentos na API do Mercado Pago (apenas admin).
 * @apiGroup MercadoPago
 * @apiPermission Admin
 * @apiQuery {string} [sort] Ordenação.
 * @apiQuery {string} [criteria] Critério de busca.
 * @apiQuery {string} [external_reference] Referência externa (ID do app).
 * @apiQuery {string} [status] Status do pagamento.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Resultado da busca no MP.
 */
app.get('/api/payments/search', authenticate, authorizeAdmin, async (req, res) => {
  // Proxy de busca de pagamentos no MP: repassa query string do cliente e retorna JSON
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

/**
 * @api {get} /api/payments/:id Obter pagamento MP
 * @apiDescription Proxy para obter detalhes de um pagamento específico na API do Mercado Pago (apenas admin).
 * @apiGroup MercadoPago
 * @apiPermission Admin
 * @apiParam {string} id ID do pagamento.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Dados do pagamento.
 */
app.get('/api/payments/:id', authenticate, authorizeAdmin, async (req, res) => {
  // Proxy de detalhes de pagamento por ID
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

/**
 * @api {put} /api/payments/:id Atualizar pagamento MP
 * @apiDescription Proxy para atualizar um pagamento na API do Mercado Pago (apenas admin).
 * @apiGroup MercadoPago
 * @apiPermission Admin
 * @apiParam {string} id ID do pagamento.
 * @apiBody {Object} ... Campos a atualizar conforme API do MP.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {Object} data Dados atualizados.
 */
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


// -----------------------------------------------------------------------------------------
// 27. Rotas de Webhooks (Integração de Pagamentos)
// -----------------------------------------------------------------------------------------

/**
 * @api {post} /api/apps/webhook Webhook Mercado Pago
 * @apiDescription Recebe notificações de atualizações de pagamento do Mercado Pago.
 * @apiGroup Webhooks
 * @apiParam {string} type Tipo da notificação (ex: 'payment').
 * @apiParam {Object} data Dados da notificação (contém ID do pagamento).
 * @apiSuccess {boolean} received Confirmação de recebimento.
 */
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

/**
 * @api {get} /api/apps/webhook Verificar Webhook
 * @apiDescription Endpoint de verificação para testes de integração do Mercado Pago.
 * @apiGroup Webhooks
 * @apiSuccess {boolean} ok Status do endpoint.
 * @apiSuccess {string} message Mensagem de sucesso.
 */
app.get('/api/apps/webhook', (req, res) => {
  try {
    res.status(200).json({ ok: true, message: 'Webhook endpoint ativo', method: 'GET', echo: req.query || null });
  } catch {
    res.status(500).json({ error: 'Webhook GET error' });
  }
});

// -----------------------------------------------------------------------------------------
// 28. Rotas de Administração Financeira (Pagamentos)
// -----------------------------------------------------------------------------------------
/**
 * @api {get} /api/admin/app-payments Listar Pagamentos (Admin)
 * @apiDescription Lista pagamentos registrados no sistema com filtros opcionais (apenas admin).
 * @apiGroup Financeiro
 * @apiPermission Admin
 * @apiParam {number} [limit=200] Limite de registros.
 * @apiParam {string} [status] Filtrar por status.
 * @apiParam {number} [app_id] Filtrar por ID do aplicativo.
 * @apiParam {string} [payer_email] Filtrar por e-mail do pagador.
 * @apiParam {string} [preference_id] Filtrar por ID da preferência.
 * @apiParam {string} [payment_id] Filtrar por ID do pagamento.
 * @apiSuccess {Object[]} data Lista de pagamentos.
 */
app.get('/api/admin/app-payments', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const pool = await getConnectionPool();
    const request = pool.request();
    const conditions = ['1=1'];
    const { status, app_id, payer_email, preference_id, payment_id } = req.query || {};
    let limit = parseInt(String(req.query?.limit || '200'), 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 200;
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

/**
 * @api {get} /api/admin/app-payments/:pid Detalhes do Pagamento (Admin)
 * @apiDescription Obtém detalhes completos e auditoria de um pagamento específico (apenas admin).
 * @apiGroup Financeiro
 * @apiPermission Admin
 * @apiParam {string} pid ID do pagamento.
 * @apiSuccess {Object} payment Dados do pagamento.
 * @apiSuccess {Object[]} audit Histórico de auditoria do pagamento.
 */
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

app.post('/api/test/mock-approved-payment', sensitiveLimiter, async (req, res) => {
  try {
    if (String(process.env.ENABLE_TEST_PAYMENTS || '').toLowerCase() !== 'true') {
      return res.status(403).json({ error: 'TEST_DISABLED' });
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String(body?.email || '').trim();
    const aid = parseInt(String(body?.app_id || ''), 10);
    if (!email || !validateEmail(email) || !Number.isFinite(aid)) {
      return res.status(400).json({ error: 'BAD_REQUEST' });
    }
    const pool = await getConnectionPool();
    const appRes = await pool.request().input('id', dbSql.Int, aid).query('SELECT id, name, price FROM dbo.apps WHERE id=@id');
    const appItem = appRes.recordset[0] || null;
    if (!appItem) return res.status(404).json({ error: 'APP_NOT_FOUND' });
    const pid = 'mock_' + Date.now();
    const amount = Number(appItem.price || 0);
    await pool.request()
      .input('type', dbSql.NVarChar, 'purchase')
      .input('app_id', dbSql.Int, aid)
      .input('app_name', dbSql.NVarChar, appItem.name)
      .input('status', dbSql.NVarChar, 'approved')
      .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
    await pool.request()
      .input('pid', dbSql.NVarChar, pid)
      .input('aid', dbSql.Int, aid)
      .input('status', dbSql.NVarChar, 'approved')
      .input('amount', dbSql.Decimal(18, 2), amount)
      .input('currency', dbSql.NVarChar, 'BRL')
      .input('email', dbSql.NVarChar, email)
      .input('source', dbSql.NVarChar, 'mock')
      .query('INSERT INTO dbo.app_payments (payment_id, app_id, user_id, status, amount, currency, payer_email, source) VALUES (@pid, @aid, NULL, @status, @amount, @currency, @email, @source)');
    await auditPaymentAction(pool, { payment_id: pid, preference_id: null, app_id: aid, user_id: null, action: 'insert_mock', from_status: null, to_status: 'approved', from_payment_id: null, to_payment_id: pid, amount, currency: 'BRL', payer_email: email });
    return res.json({ success: true, payment_id: pid });
  } catch (e) {
    void e;
    return res.status(500).json({ error: 'MOCK_FAIL' });
  }
});

// Provisiona uma licença disponível (hardware_id vazio) para um e-mail de teste
// Útil para preparar slots antes da ativação, simulando compra mock quando necessário.
app.post('/api/test/provision-license', sensitiveLimiter, async (req, res) => {
  try {
    if (String(process.env.ENABLE_TEST_PAYMENTS || '').toLowerCase() !== 'true') {
      return res.status(403).json({ error: 'TEST_DISABLED' });
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String(body?.email || '').trim();
    const aid = parseInt(String(body?.app_id || process.env.COINCRAFT_APP_ID || ''), 10);
    if (!email || !validateEmail(email) || !Number.isFinite(aid)) {
      return res.status(400).json({ error: 'BAD_REQUEST' });
    }
    const pool = await getConnectionPool();
    const appRes = await pool.request().input('id', dbSql.Int, aid).query('SELECT id, name, price FROM dbo.apps WHERE id=@id');
    const appItem = appRes.recordset[0] || null;
    if (!appItem) return res.status(404).json({ error: 'APP_NOT_FOUND' });

    const purchasesQ = await pool.request()
      .input('email', dbSql.NVarChar, email)
      .input('app_id', dbSql.Int, aid)
      .query(`SELECT COUNT(*) AS total FROM dbo.app_payments WHERE payer_email=@email AND app_id=@app_id AND status='approved'`);
    let totalPaid = purchasesQ.recordset[0]?.total || 0;

    if (totalPaid === 0) {
      const pid = 'mock_' + Date.now();
      const amount = Number(appItem.price || 0);
      await pool.request()
        .input('type', dbSql.NVarChar, 'purchase')
        .input('app_id', dbSql.Int, aid)
        .input('app_name', dbSql.NVarChar, appItem.name)
        .input('status', dbSql.NVarChar, 'approved')
        .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
      await pool.request()
        .input('pid', dbSql.NVarChar, pid)
        .input('aid', dbSql.Int, aid)
        .input('status', dbSql.NVarChar, 'approved')
        .input('amount', dbSql.Decimal(18, 2), amount)
        .input('currency', dbSql.NVarChar, 'BRL')
        .input('email', dbSql.NVarChar, email)
        .input('source', dbSql.NVarChar, 'mock')
        .query('INSERT INTO dbo.app_payments (payment_id, app_id, user_id, status, amount, currency, payer_email, source) VALUES (@pid, @aid, NULL, @status, @amount, @currency, @email, @source)');
      await pool.request()
        .input('payment_id', dbSql.NVarChar, pid)
        .input('preference_id', dbSql.NVarChar, null)
        .input('app_id', dbSql.Int, aid)
        .input('user_id', dbSql.Int, null)
        .input('action', dbSql.NVarChar, 'insert_mock')
        .input('from_status', dbSql.NVarChar, null)
        .input('to_status', dbSql.NVarChar, 'approved')
        .input('from_payment_id', dbSql.NVarChar, null)
        .input('to_payment_id', dbSql.NVarChar, pid)
        .input('amount', dbSql.Decimal(18, 2), amount)
        .input('currency', dbSql.NVarChar, 'BRL')
        .input('payer_email', dbSql.NVarChar, email)
        .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
      totalPaid = 1;
    }

    let userId = null;
    const userRes = await pool.request().input('e', dbSql.NVarChar, email).query('SELECT id FROM dbo.users WHERE email=@e');
    if (userRes.recordset.length) {
      userId = userRes.recordset[0].id;
    } else {
      const newUser = await pool.request()
        .input('n', dbSql.NVarChar, email.split('@')[0])
        .input('e', dbSql.NVarChar, email)
        .query("INSERT INTO dbo.users (name, email, role, status, created_at) OUTPUT Inserted.id VALUES (@n, @e, 'viewer', 'ativo', SYSUTCDATETIME())");
      userId = newUser.recordset[0].id;
    }

    const unbound = await pool.request()
      .input('aid', dbSql.Int, aid)
      .input('email', dbSql.NVarChar, email)
      .query("SELECT TOP 1 id FROM dbo.user_licenses WHERE app_id=@aid AND email=@email AND (hardware_id IS NULL OR LTRIM(RTRIM(hardware_id))='') ORDER BY id DESC");
    if (unbound.recordset.length) {
      return res.json({ success: true, provisioned: true, message: 'Licença já disponível para ativação.' });
    }

    const boundCountQ = await pool.request()
      .input('aid', dbSql.Int, aid)
      .input('email', dbSql.NVarChar, email)
      .query("SELECT COUNT(*) AS total FROM dbo.user_licenses WHERE app_id=@aid AND email=@email AND hardware_id IS NOT NULL AND LTRIM(RTRIM(hardware_id)) <> ''");
    const used = boundCountQ.recordset[0]?.total || 0;
    if (totalPaid > used) {
      const ins = await pool.request()
        .input('uid', dbSql.Int, userId)
        .input('aid', dbSql.Int, aid)
        .input('appname', dbSql.NVarChar, appItem.name)
        .input('email', dbSql.NVarChar, email)
        .input('key', dbSql.NVarChar, `LIC-${Date.now()}-preprov`)
        .query("INSERT INTO dbo.user_licenses (user_id, app_id, app_name, email, hardware_id, license_key, created_at) OUTPUT Inserted.id VALUES (@uid, @aid, @appname, @email, '', @key, SYSUTCDATETIME())");
      const ua = String(req.headers['user-agent'] || '');
      const ip = req.ip || req.connection?.remoteAddress || '';
      const licId = ins.recordset[0]?.id || null;
      await auditLicense(pool, { app_id: aid, email, hardware_id: '', license_id: licId, action: 'provision', status: 'ok', message: 'LICENSE_AVAILABLE', ip, ua });
      return res.json({ success: true, provisioned: true, message: 'Licença disponibilizada para ativação.' });
    }
    return res.status(403).json({ success: false, provisioned: false, message: 'Limite de licenças atingido para este e-mail.' });
  } catch (e) {
    console.error('Falha ao provisionar licença de teste:', e?.message || e);
    return res.status(500).json({ success: false, error: 'PROVISION_FAIL' });
  }
});

app.post('/api/test/release-license', sensitiveLimiter, async (req, res) => {
  try {
    if (String(process.env.ENABLE_TEST_LICENSE_ADMIN || '').toLowerCase() !== 'true') {
      return res.status(403).json({ error: 'ADMIN_TEST_DISABLED' });
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String(body?.email || '').trim();
    const aid = parseInt(String(body?.app_id || process.env.COINCRAFT_APP_ID || ''), 10);
    if (!email || !validateEmail(email) || !Number.isFinite(aid)) {
      return res.status(400).json({ error: 'BAD_REQUEST' });
    }
    const pool = await getConnectionPool();
    const licQ = await pool.request()
      .input('aid', dbSql.Int, aid)
      .input('email', dbSql.NVarChar, email)
      .query('SELECT TOP 1 id, hardware_id FROM dbo.user_licenses WHERE app_id=@aid AND email=@email AND hardware_id IS NOT NULL ORDER BY updated_at DESC');
    const row = licQ.recordset[0] || null;
    if (!row) return res.status(404).json({ success: false, error: 'NO_BOUND_LICENSE' });
    await pool.request()
      .input('id', dbSql.Int, row.id)
      .query("UPDATE dbo.user_licenses SET hardware_id='', activated_at=NULL, updated_at=SYSUTCDATETIME() WHERE id=@id");
    const ua = String(req.headers['user-agent'] || '');
    const ip = req.ip || req.connection?.remoteAddress || '';
    await auditLicense(pool, { app_id: aid, email, hardware_id: '', license_id: row.id, action: 'release', status: 'ok', message: 'LICENSE_RELEASED', ip, ua });
    return res.json({ success: true, released: true });
  } catch (err) {
    console.warn('Falha ao liberar licença de teste:', err?.message || err);
    return res.status(500).json({ success: false, error: 'RELEASE_FAIL' });
  }
});

function startTestLicenseMonitor() {
  const enabled = String(process.env.ENABLE_TEST_LICENSE_MONITOR || '').toLowerCase() === 'true';
  const email = String(process.env.TEST_LICENSE_EMAIL || '').trim();
  const aid = parseInt(String(process.env.TEST_LICENSE_APP_ID || process.env.COINCRAFT_APP_ID || ''), 10);
  const intervalMs = parseInt(String(process.env.TEST_LICENSE_MONITOR_INTERVAL_MS || '300000'), 10);
  if (!enabled || !email || !validateEmail(email) || !Number.isFinite(aid)) return;
  setInterval(async () => {
    try {
      const pool = await getConnectionPool();
      const purchasesQ = await pool.request()
        .input('email', dbSql.NVarChar, email)
        .input('app_id', dbSql.Int, aid)
        .query(`SELECT COUNT(*) AS total FROM dbo.app_payments WHERE payer_email=@email AND app_id=@app_id AND status='approved'`);
      let totalPaid = purchasesQ.recordset[0]?.total || 0;
      if (totalPaid === 0 && String(process.env.ENABLE_TEST_PAYMENTS || '').toLowerCase() === 'true') {
        const appRes = await pool.request().input('id', dbSql.Int, aid).query('SELECT id, name, price FROM dbo.apps WHERE id=@id');
        const appItem = appRes.recordset[0] || null;
        if (appItem) {
          const pid = 'mock_' + Date.now();
          const amount = Number(appItem.price || 0);
          await pool.request()
            .input('type', dbSql.NVarChar, 'purchase')
            .input('app_id', dbSql.Int, aid)
            .input('app_name', dbSql.NVarChar, appItem.name)
            .input('status', dbSql.NVarChar, 'approved')
            .query('INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)');
          await pool.request()
            .input('pid', dbSql.NVarChar, pid)
            .input('aid', dbSql.Int, aid)
            .input('status', dbSql.NVarChar, 'approved')
            .input('amount', dbSql.Decimal(18, 2), amount)
            .input('currency', dbSql.NVarChar, 'BRL')
            .input('email', dbSql.NVarChar, email)
            .input('source', dbSql.NVarChar, 'mock')
            .query('INSERT INTO dbo.app_payments (payment_id, app_id, user_id, status, amount, currency, payer_email, source) VALUES (@pid, @aid, NULL, @status, @amount, @currency, @email, @source)');
          await pool.request()
            .input('payment_id', dbSql.NVarChar, pid)
            .input('preference_id', dbSql.NVarChar, null)
            .input('app_id', dbSql.Int, aid)
            .input('user_id', dbSql.Int, null)
            .input('action', dbSql.NVarChar, 'insert_mock')
            .input('from_status', dbSql.NVarChar, null)
            .input('to_status', dbSql.NVarChar, 'approved')
            .input('from_payment_id', dbSql.NVarChar, null)
            .input('to_payment_id', dbSql.NVarChar, pid)
            .input('amount', dbSql.Decimal(18, 2), amount)
            .input('currency', dbSql.NVarChar, 'BRL')
            .input('payer_email', dbSql.NVarChar, email)
            .query('INSERT INTO dbo.app_payments_audit (payment_id, preference_id, app_id, user_id, action, from_status, to_status, from_payment_id, to_payment_id, amount, currency, payer_email) VALUES (@payment_id, @preference_id, @app_id, @user_id, @action, @from_status, @to_status, @from_payment_id, @to_payment_id, @amount, @currency, @payer_email)');
          totalPaid = 1;
        }
      }

      const boundCountQ = await pool.request()
        .input('aid', dbSql.Int, aid)
        .input('email', dbSql.NVarChar, email)
        .query('SELECT COUNT(*) AS total FROM dbo.user_licenses WHERE app_id=@aid AND email=@email AND hardware_id IS NOT NULL');
      const used = boundCountQ.recordset[0]?.total || 0;
      const unboundQ = await pool.request()
        .input('aid', dbSql.Int, aid)
        .input('email', dbSql.NVarChar, email)
        .query('SELECT TOP 1 id FROM dbo.user_licenses WHERE app_id=@aid AND email=@email AND hardware_id IS NULL ORDER BY id DESC');
      const hasAvailable = unboundQ.recordset.length > 0;

      if (!hasAvailable && totalPaid > used) {
        let userId = null;
        const userRes = await pool.request().input('e', dbSql.NVarChar, email).query('SELECT id FROM dbo.users WHERE email=@e');
        if (userRes.recordset.length) {
          userId = userRes.recordset[0].id;
        } else {
          const newUser = await pool.request()
            .input('n', dbSql.NVarChar, email.split('@')[0])
            .input('e', dbSql.NVarChar, email)
            .query("INSERT INTO dbo.users (name, email, role, status, created_at) OUTPUT Inserted.id VALUES (@n, @e, 'viewer', 'ativo', SYSUTCDATETIME())");
          userId = newUser.recordset[0].id;
        }
        const ins = await pool.request()
          .input('uid', dbSql.Int, userId)
          .input('aid', dbSql.Int, aid)
          .input('email', dbSql.NVarChar, email)
          .input('key', dbSql.NVarChar, `LIC-${Date.now()}-preprov`)
          .query('INSERT INTO dbo.user_licenses (user_id, app_id, email, hardware_id, license_key, created_at) OUTPUT Inserted.id VALUES (@uid, @aid, @email, NULL, @key, SYSUTCDATETIME())');
        const licId = ins.recordset[0]?.id || null;
        await pool.request()
          .input('app_id', dbSql.Int, aid)
          .input('email', dbSql.NVarChar, email)
          .input('hardware_id', dbSql.NVarChar, null)
          .input('license_id', dbSql.Int, licId)
          .input('action', dbSql.NVarChar, 'provision')
          .input('status', dbSql.NVarChar, 'ok')
          .input('message', dbSql.NVarChar, 'LICENSE_AVAILABLE')
          .input('ip', dbSql.NVarChar, '')
          .input('ua', dbSql.NVarChar, '')
          .query('INSERT INTO dbo.license_activations (app_id, email, hardware_id, license_id, action, status, message, ip, user_agent) VALUES (@app_id, @email, @hardware_id, @license_id, @action, @status, @message, @ip, @ua)');
      }
    } catch (err) {
      console.warn('Monitor de licença de teste: falha ao verificar/provisionar', err?.message || err);
    }
  }, isNaN(intervalMs) ? 300000 : intervalMs);
}

app.post('/api/test/seed-license-row', sensitiveLimiter, async (req, res) => {
  try {
    if (String(process.env.ENABLE_TEST_PAYMENTS || '').toLowerCase() !== 'true') {
      return res.status(403).json({ error: 'TEST_DISABLED' });
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String(body?.email || '').trim();
    const aid = parseInt(String(body?.app_id || ''), 10);
    if (!email || !validateEmail(email) || !Number.isFinite(aid)) {
      return res.status(400).json({ error: 'BAD_REQUEST' });
    }
    const pool = await getConnectionPool();
    const appRes = await pool.request().input('id', dbSql.Int, aid).query('SELECT id, owner_id AS ownerId FROM dbo.apps WHERE id=@id');
    const appItem = appRes.recordset[0] || null;
    if (!appItem) return res.status(404).json({ error: 'APP_NOT_FOUND' });
    let uid = appItem.ownerId || null;
    if (uid === null) {
      const anyUser = await pool.request().query('SELECT TOP 1 id FROM dbo.users ORDER BY id ASC');
      uid = anyUser.recordset[0]?.id || null;
    }
    if (uid === null) return res.status(500).json({ error: 'NO_USER_AVAILABLE' });
    await pool.request()
      .input('uid', dbSql.Int, uid)
      .input('aid', dbSql.Int, aid)
      .input('email', dbSql.NVarChar, email)
      .query('MERGE dbo.user_licenses AS T USING (SELECT @uid AS uid, @aid AS aid, @email AS email) AS S ON (T.user_id=S.uid AND T.app_id=S.aid AND T.email=S.email AND T.hardware_id IS NULL) WHEN NOT MATCHED THEN INSERT (user_id, app_id, email, created_at) VALUES (S.uid, S.aid, S.email, SYSUTCDATETIME());');
    return res.json({ success: true });
  } catch (e) {
    void e;
    return res.status(500).json({ error: 'SEED_FAIL' });
  }
});

/**
 * @api {post} /api/licenses/activate Ativar Licença
 * @apiDescription Ativa uma licença para um aplicativo e hardware específico.
 * @apiGroup Licencas
 * @apiPermission Authenticated
 * @apiParam {number} appId ID do aplicativo.
 * @apiParam {string} hardwareId Identificador único do hardware.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {string} license_key Chave de licença gerada.
 */
app.post('/api/licenses/activate', authenticate, async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { appId, hardwareId } = body || {};
    const userId = req.user.id;
    const userEmail = req.user?.email || null;
    if (!appId || !hardwareId) return res.status(400).json({ success: false, message: 'Dados incompletos.' });
    const pool = await getConnectionPool();
    const check = await pool.request()
      .input('uid', dbSql.Int, userId)
      .input('aid', dbSql.Int, appId)
      .query("SELECT id FROM dbo.app_payments WHERE user_id=@uid AND app_id=@aid AND status='approved' UNION SELECT id FROM dbo.apps WHERE id=@aid AND owner_id=@uid");
    if (check.recordset.length === 0) return res.status(403).json({ success: false, message: 'Sem licença válida.' });
    let signature;
    const pem = process.env.PRIVATE_KEY_PEM || '';
    if (pem) {
      try {
        const sign = nodeCrypto.createSign('RSA-SHA256');
        sign.update(String(hardwareId));
        sign.update(String(userId));
        signature = sign.sign(pem, 'base64');
      } catch {
        signature = 'LIC-' + Buffer.from(hardwareId + userId).toString('base64');
      }
    } else {
      signature = 'LIC-' + Buffer.from(hardwareId + userId).toString('base64');
    }
    await pool.request()
      .input('uid', dbSql.Int, userId)
      .input('aid', dbSql.Int, appId)
      .input('em', dbSql.NVarChar, userEmail)
      .input('hwid', dbSql.NVarChar, hardwareId)
      .input('key', dbSql.NVarChar, signature)
      .query("MERGE dbo.user_licenses AS T USING (SELECT @uid AS uid, @aid AS aid, @em AS em, @hwid AS hwid) AS S ON (T.user_id = S.uid AND T.app_id = S.aid AND T.hardware_id = S.hwid) WHEN MATCHED THEN UPDATE SET license_key=@key, email=@em, updated_at=SYSUTCDATETIME() WHEN NOT MATCHED THEN INSERT (user_id, app_id, email, hardware_id, license_key) VALUES (@uid, @aid, @em, @hwid, @key);");
    return res.json({ success: true, license_key: signature });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erro ao gerar licença.' });
  }
});

/**
 * @api {post} /api/licenses/claim-by-email Reivindicar Licença por E-mail
 * @apiDescription Reivindica uma licença usando o e-mail de compra (para usuários não logados na loja).
 * @apiGroup Licencas
 * @apiParam {string} email E-mail utilizado na compra.
 * @apiParam {string} hardwareId Identificador único do hardware.
 * @apiParam {number} appId ID do aplicativo.
 * @apiSuccess {boolean} success Indica sucesso.
 * @apiSuccess {string} license_key Chave de licença gerada.
 */
// Endpoint de recuperação/ativação direta por e-mail de compra.
// Impede duplicidade por (email, hardwareId) e respeita saldo de compras.
// Preenche app_name para facilitar relatórios futuros por software.
app.post('/api/licenses/claim-by-email', sensitiveLimiter, async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String(body?.email || '').trim();
    const hardwareId = String(body?.hardwareId ?? body?.hardware_id ?? '').trim();
    const rawAppClaim = body?.appId ?? body?.app_id ?? process.env.COINCRAFT_APP_ID ?? 1;
    const appId = Number(rawAppClaim);
    if (!email || !hardwareId || !appId) return res.status(400).json({ success: false, message: 'Dados incompletos.' });

    const pool = await getConnectionPool();
    let userId = null;

    const dupRes = await pool.request()
      .input('aid', dbSql.Int, Number(appId))
      .input('hwid', dbSql.NVarChar, String(hardwareId))
      .input('email', dbSql.NVarChar, String(email))
      .query('SELECT TOP 1 id FROM dbo.user_licenses WHERE app_id=@aid AND hardware_id=@hwid AND email=@email');
    if (dupRes.recordset.length > 0) {
      return res.status(409).json({ success: false, message: "Esta máquina já possui uma licença ativa. Use a opção 'Tenho uma Chave'." });
    }

    const approvedCntRes = await pool.request()
      .input('aid', dbSql.Int, Number(appId))
      .input('payer_email', dbSql.NVarChar, String(email))
      .query("SELECT COUNT(*) AS cnt FROM dbo.app_payments WHERE app_id=@aid AND status='approved' AND payer_email=@payer_email");
    const approved = approvedCntRes.recordset[0]?.cnt || 0;
    const usedCntRes = await pool.request()
      .input('email', dbSql.NVarChar, String(email))
      .input('aid', dbSql.Int, Number(appId))
      .query("SELECT COUNT(*) AS cnt FROM dbo.user_licenses WHERE email=@email AND app_id=@aid AND hardware_id IS NOT NULL AND LTRIM(RTRIM(hardware_id)) <> ''");
    const used = usedCntRes.recordset[0]?.cnt || 0;
    if (used >= approved) {
      return res.status(403).json({ success: false, message: 'Limite de licenças atingido para este e-mail. Compre mais no site.' });
    }

    if (userId === null) {
      const ownerRes = await pool.request().input('id', dbSql.Int, Number(appId)).query('SELECT owner_id AS ownerId FROM dbo.apps WHERE id=@id');
      userId = ownerRes.recordset[0]?.ownerId ?? null;
    }
    if (userId === null) {
      const userByEmail = await pool.request().input('email', dbSql.NVarChar, email).query('SELECT TOP 1 id FROM dbo.users WHERE email=@email');
      userId = userByEmail.recordset[0]?.id ?? null;
    }
    if (userId === null) {
      const anyUser = await pool.request().query('SELECT TOP 1 id FROM dbo.users ORDER BY id ASC');
      userId = anyUser.recordset[0]?.id ?? null;
    }
    let signature;
    const pem = process.env.PRIVATE_KEY_PEM || '';
    if (pem) {
      try {
        const sign = nodeCrypto.createSign('RSA-SHA256');
        sign.update(String(hardwareId));
        sign.update(String(email));
        signature = sign.sign(pem, 'base64');
      } catch {
        signature = 'LIC-' + Buffer.from(String(hardwareId) + String(email)).toString('base64');
      }
    } else {
      signature = 'LIC-' + Buffer.from(String(hardwareId) + String(email)).toString('base64');
    }

    const ua = String(req.headers['user-agent'] || '');
    const ip = req.ip || req.connection?.remoteAddress || '';
    const appNameRes = await pool.request().input('id', dbSql.Int, Number(appId)).query('SELECT name FROM dbo.apps WHERE id=@id');
    const appName = appNameRes.recordset[0]?.name || null;
    const ins = await pool.request()
      .input('uid', dbSql.Int, userId)
      .input('aid', dbSql.Int, Number(appId))
      .input('appname', dbSql.NVarChar, appName)
      .input('email', dbSql.NVarChar, String(email))
      .input('hwid', dbSql.NVarChar, String(hardwareId))
      .input('key', dbSql.NVarChar, String(signature))
      .query('INSERT INTO dbo.user_licenses (user_id, app_id, app_name, email, hardware_id, license_key, activated_at, created_at) OUTPUT Inserted.id VALUES (@uid, @aid, @appname, @email, @hwid, @key, SYSUTCDATETIME(), SYSUTCDATETIME())');
    const licId = ins.recordset[0]?.id || null;
    await pool.request()
      .input('app_id', dbSql.Int, Number(appId))
      .input('email', dbSql.NVarChar, String(email))
      .input('hardware_id', dbSql.NVarChar, String(hardwareId))
      .input('license_id', dbSql.Int, licId)
      .input('action', dbSql.NVarChar, 'activate')
      .input('status', dbSql.NVarChar, 'ok')
      .input('message', dbSql.NVarChar, 'CLAIM_OK')
      .input('ip', dbSql.NVarChar, String(ip))
      .input('ua', dbSql.NVarChar, ua)
      .query('INSERT INTO dbo.license_activations (app_id, email, hardware_id, license_id, action, status, message, ip, user_agent) VALUES (@app_id, @email, @hardware_id, @license_id, @action, @status, @message, @ip, @ua)');

    return res.json({ success: true, license_key: signature });
  } catch (err) {
    console.error('Erro em claim-by-email:', err);
    return res.status(500).json({ success: false, message: 'Erro ao ativar licença por e-mail.' });
  }
});

app.get('/api/purchases/by-email', sensitiveLimiter, async (req, res) => {
  try {
    const email = String(req.query?.email || '').trim();
    const appIdRaw = req.query?.appId;
    const appId = appIdRaw !== undefined ? parseInt(String(appIdRaw), 10) : null;
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    const pool = await getConnectionPool();
    const uRes = await pool.request().input('email', dbSql.NVarChar, email).query('SELECT TOP 1 id FROM dbo.users WHERE email=@email');
    const uid = uRes.recordset[0]?.id || null;

    const reqList = pool.request().input('email', dbSql.NVarChar, email);
    let where = "status='approved' AND (payer_email=@email";
    if (uid) {
      reqList.input('uid', dbSql.Int, uid);
      where += ' OR user_id=@uid';
    }
    where += ')';
    if (Number.isFinite(appId)) {
      reqList.input('aid', dbSql.Int, appId);
      where += ' AND app_id=@aid';
    }
    const listSql = `SELECT TOP(200) payment_id, app_id, status, amount, currency, payer_email, updated_at FROM dbo.app_payments WHERE ${where} ORDER BY updated_at DESC`;
    const rows = await reqList.query(listSql);

    let approved = 0;
    if (Number.isFinite(appId)) {
      const cntReq = pool.request().input('email', dbSql.NVarChar, email).input('aid', dbSql.Int, appId);
      if (uid) cntReq.input('uid', dbSql.Int, uid);
      const cntSql = uid
        ? "SELECT COUNT(*) AS cnt FROM dbo.app_payments WHERE app_id=@aid AND status='approved' AND (user_id=@uid OR payer_email=@email)"
        : "SELECT COUNT(*) AS cnt FROM dbo.app_payments WHERE app_id=@aid AND status='approved' AND payer_email=@email";
      const cnt = await cntReq.query(cntSql);
      approved = cnt.recordset[0]?.cnt || 0;
    } else {
      const cntReq = pool.request().input('email', dbSql.NVarChar, email);
      if (uid) cntReq.input('uid', dbSql.Int, uid);
      const cntSql = uid
        ? "SELECT COUNT(*) AS cnt FROM dbo.app_payments WHERE status='approved' AND (user_id=@uid OR payer_email=@email)"
        : "SELECT COUNT(*) AS cnt FROM dbo.app_payments WHERE status='approved' AND payer_email=@email";
      const cnt = await cntReq.query(cntSql);
      approved = cnt.recordset[0]?.cnt || 0;
    }

    let used = 0;
    if (Number.isFinite(appId)) {
      const usedReq = pool.request().input('email', dbSql.NVarChar, email).input('aid', dbSql.Int, appId);
      if (uid) usedReq.input('uid', dbSql.Int, uid);
      const usedRes = await usedReq
        .query('SELECT COUNT(*) AS cnt FROM dbo.user_licenses WHERE app_id=@aid AND hardware_id IS NOT NULL AND (email=@email' + (uid ? ' OR user_id=@uid' : '') + ')');
      used = usedRes.recordset[0]?.cnt || 0;
    } else {
      const usedReq = pool.request().input('email', dbSql.NVarChar, email);
      if (uid) usedReq.input('uid', dbSql.Int, uid);
      const usedRes = await usedReq
        .query('SELECT COUNT(*) AS cnt FROM dbo.user_licenses WHERE hardware_id IS NOT NULL AND (email=@email' + (uid ? ' OR user_id=@uid' : '') + ')');
      used = usedRes.recordset[0]?.cnt || 0;
    }

    return res.json({ success: true, data: rows.recordset || [], summary: { approved, used } });
  } catch (err) {
    console.error('Erro em purchases/by-email:', err);
    return res.status(500).json({ error: 'Erro ao consultar compras por e-mail.' });
  }
});

// -----------------------------------------------------------------------------------------
// 29. Rotas de Gamificação (Desafios)
// -----------------------------------------------------------------------------------------

app.get('/api/desafios', async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const isAdmin = !!req.headers['authorization'];
    const allFlag = String(req.query.all || '').toLowerCase();
    const visibleFlag = String(req.query.visible || '').toLowerCase();
    let where = '';
    if (isAdmin && allFlag === '1') {
      where = '';
    } else if (visibleFlag === 'true') {
      where = 'WHERE visible = 1';
    } else {
      where = "WHERE visible = 1 AND (status = 'active' OR status = 'draft')";
    }
    const result = await pool.request().query(`SELECT id, name, objective, description, deadline, difficulty, tags, reward, base_points, delivery_type, thumb_url, status, visible, created_at, updated_at FROM dbo.desafios ${where} ORDER BY created_at DESC`);
    const list = (result.recordset || []).map(mapChallengeRow);
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

app.get('/api/desafios/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await getConnectionPool();
    const chRes = await pool.request().input('id', dbSql.Int, id).query('SELECT id, name, objective, description, deadline, difficulty, tags, reward, base_points, delivery_type, thumb_url, status, visible, created_at, updated_at FROM dbo.desafios WHERE id=@id');
    if (!chRes.recordset.length) return res.status(404).json({ error: 'Desafio não encontrado' });
    const challenge = mapChallengeRow(chRes.recordset[0]);
    const regsRes = await pool.request().input('id', dbSql.Int, id).query('SELECT id, desafio_id, crafter_id, at FROM dbo.desafio_registrations WHERE desafio_id=@id ORDER BY at DESC');
    const subsRes = await pool.request().input('id', dbSql.Int, id).query('SELECT id, desafio_id, crafter_id, delivery, status, score, review, created_at, updated_at FROM dbo.desafio_submissions WHERE desafio_id=@id ORDER BY created_at DESC');
    const registrations = (regsRes.recordset || []).map(r => ({ id: r.id, desafio_id: r.desafio_id, crafter_id: r.crafter_id, at: r.at }));
    const submissions = (subsRes.recordset || []).map(s => ({ id: s.id, desafio_id: s.desafio_id, crafter_id: s.crafter_id, delivery: parseJsonSafe(s.delivery, {}), status: s.status, score: s.score, review: parseJsonSafe(s.review, {}), created_at: s.created_at, updated_at: s.updated_at }));
    res.json({ success: true, data: { challenge, registrations, submissions } });
  } catch (err) { next(err); }
});

const desafioSchema = z.object({
  name: z.string().min(1),
  objective: z.string().optional(),
  description: z.string().optional(),
  deadline: z.string().optional(),
  difficulty: z.enum(['starter','intermediate','pro']).optional(),
  tags: z.array(z.string()).optional(),
  reward: z.string().optional(),
  base_points: z.number().int().min(0).optional(),
  delivery_type: z.enum(['link','github','file']).optional(),
  thumb_url: z.string().optional(),
  status: z.enum(['draft','active','closed','archived']).optional(),
  visible: z.boolean().optional()
});

app.post('/api/desafios', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    let payload = req.body;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = {}; } }
    const parsed = desafioSchema.safeParse(payload || {});
    if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR' });
    const d = parsed.data;
    const pool = await getConnectionPool();
    const tagsJson = d.tags ? JSON.stringify(d.tags) : null;
    const r = await pool.request()
      .input('name', dbSql.NVarChar, d.name)
      .input('objective', dbSql.NVarChar, d.objective || null)
      .input('description', dbSql.NVarChar, d.description || null)
      .input('deadline', dbSql.DateTime2, d.deadline ? new Date(d.deadline) : null)
      .input('difficulty', dbSql.NVarChar, d.difficulty || null)
      .input('tags', dbSql.NVarChar, Array.isArray(d.tags) ? d.tags.join(',') : null)
      .input('tags_json', dbSql.NVarChar, tagsJson)
      .input('reward', dbSql.NVarChar, d.reward || null)
      .input('base_points', dbSql.Int, Number(d.base_points || 0))
      .input('delivery_type', dbSql.NVarChar, d.delivery_type || null)
      .input('thumb_url', dbSql.NVarChar, d.thumb_url || null)
      .input('status', dbSql.NVarChar, d.status || 'draft')
      .input('visible', dbSql.Bit, d.visible === false ? 0 : 1)
      .input('created_by', dbSql.Int, req.user?.id || null)
      .query(`INSERT INTO dbo.desafios (name, objective, description, deadline, difficulty, tags, tags_json, reward, base_points, delivery_type, thumb_url, status, visible, created_by)
              OUTPUT Inserted.*
              VALUES (@name,@objective,@description,@deadline,@difficulty,@tags,@tags_json,@reward,@base_points,@delivery_type,@thumb_url,@status,@visible,@created_by)`);
    const row = r.recordset[0];
    res.status(201).json({ success: true, data: { challenge: mapChallengeRow(row) } });
  } catch (err) { next(err); }
});

app.put('/api/desafios/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    let payload = req.body;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = {}; } }
    const parsed = desafioSchema.partial().safeParse(payload || {});
    if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR' });
    const d = parsed.data;
    const pool = await getConnectionPool();
    const currRes = await pool.request().input('id', dbSql.Int, id).query('SELECT * FROM dbo.desafios WHERE id=@id');
    if (!currRes.recordset.length) return res.status(404).json({ error: 'Desafio não encontrado' });
    const curr = currRes.recordset[0];
    const next = {
      name: d.name ?? curr.name,
      objective: d.objective ?? curr.objective,
      description: d.description ?? curr.description,
      deadline: d.deadline ? new Date(d.deadline) : curr.deadline,
      difficulty: d.difficulty ?? curr.difficulty,
      tags_str: Array.isArray(d.tags) ? d.tags.join(',') : curr.tags,
      tags_json: Array.isArray(d.tags) ? JSON.stringify(d.tags) : curr.tags_json,
      reward: d.reward ?? curr.reward,
      base_points: d.base_points !== undefined ? Number(d.base_points) : Number(curr.base_points || 0),
      delivery_type: d.delivery_type ?? curr.delivery_type,
      thumb_url: d.thumb_url ?? curr.thumb_url,
      status: d.status ?? curr.status,
      visible: d.visible !== undefined ? (d.visible ? 1 : 0) : (curr.visible ? 1 : 0)
    };
    await pool.request()
      .input('id', dbSql.Int, id)
      .input('name', dbSql.NVarChar, next.name)
      .input('objective', dbSql.NVarChar, next.objective)
      .input('description', dbSql.NVarChar, next.description)
      .input('deadline', dbSql.DateTime2, next.deadline)
      .input('difficulty', dbSql.NVarChar, next.difficulty)
      .input('tags', dbSql.NVarChar, next.tags_str)
      .input('tags_json', dbSql.NVarChar, next.tags_json)
      .input('reward', dbSql.NVarChar, next.reward)
      .input('base_points', dbSql.Int, next.base_points)
      .input('delivery_type', dbSql.NVarChar, next.delivery_type)
      .input('thumb_url', dbSql.NVarChar, next.thumb_url)
      .input('status', dbSql.NVarChar, next.status)
      .input('visible', dbSql.Bit, next.visible)
      .query('UPDATE dbo.desafios SET name=@name, objective=@objective, description=@description, deadline=@deadline, difficulty=@difficulty, tags=@tags, tags_json=@tags_json, reward=@reward, base_points=@base_points, delivery_type=@delivery_type, thumb_url=@thumb_url, status=@status, visible=@visible, updated_at=SYSUTCDATETIME() WHERE id=@id');
    const outRes = await pool.request().input('id', dbSql.Int, id).query('SELECT id, name, objective, description, deadline, difficulty, tags, reward, base_points, delivery_type, thumb_url, status, visible, created_at, updated_at FROM dbo.desafios WHERE id=@id');
    res.json({ success: true, data: { challenge: mapChallengeRow(outRes.recordset[0]) } });
  } catch (err) { next(err); }
});

app.put('/api/desafios/:id/visibility', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    let payload = req.body;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = {}; } }
    const vis = payload && typeof payload.visible === 'boolean' ? (payload.visible ? 1 : 0) : null;
    const pool = await getConnectionPool();
    if (vis === null) {
      const cur = await pool.request().input('id', dbSql.Int, id).query('SELECT visible FROM dbo.desafios WHERE id=@id');
      if (!cur.recordset.length) return res.status(404).json({ error: 'Desafio não encontrado' });
      const next = cur.recordset[0].visible ? 0 : 1;
      await pool.request().input('id', dbSql.Int, id).input('visible', dbSql.Bit, next).query('UPDATE dbo.desafios SET visible=@visible, updated_at=SYSUTCDATETIME() WHERE id=@id');
    } else {
      await pool.request().input('id', dbSql.Int, id).input('visible', dbSql.Bit, vis).query('UPDATE dbo.desafios SET visible=@visible, updated_at=SYSUTCDATETIME() WHERE id=@id');
    }
    const outRes = await pool.request().input('id', dbSql.Int, id).query('SELECT id, name, objective, description, deadline, difficulty, tags, reward, base_points, delivery_type, thumb_url, status, visible, created_at, updated_at FROM dbo.desafios WHERE id=@id');
    res.json({ success: true, data: { challenge: mapChallengeRow(outRes.recordset[0]) } });
  } catch (err) { next(err); }
});

app.put('/api/desafios/:id/status', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    let payload = req.body;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = {}; } }
    const status = String(payload?.status || '').toLowerCase();
    if (!['draft','active','closed','archived'].includes(status)) return res.status(400).json({ error: 'Status inválido' });
    const pool = await getConnectionPool();
    await pool.request().input('id', dbSql.Int, id).input('status', dbSql.NVarChar, status).query('UPDATE dbo.desafios SET status=@status, updated_at=SYSUTCDATETIME() WHERE id=@id');
    const outRes = await pool.request().input('id', dbSql.Int, id).query('SELECT id, name, objective, description, deadline, difficulty, tags, tags_json, reward, base_points, delivery_type, thumb_url, status, visible, created_by, created_at, updated_at FROM dbo.desafios WHERE id=@id');
    res.json({ success: true, data: { challenge: mapChallengeRow(outRes.recordset[0]) } });
  } catch (err) { next(err); }
});

app.post('/api/desafios/:id/inscrever', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    let payload = req.body;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = {}; } }
    const crafterId = Number(payload?.crafter_id || req.user?.id || 0);
    if (!crafterId) return res.status(400).json({ error: 'crafter_id obrigatório' });
    const pool = await getConnectionPool();
    const exists = await pool.request().input('id', dbSql.Int, id).query('SELECT id FROM dbo.desafios WHERE id=@id');
    if (!exists.recordset.length) return res.status(404).json({ error: 'Desafio não encontrado' });
    const dup = await pool.request().input('did', dbSql.Int, id).input('cid', dbSql.Int, crafterId).query('SELECT id FROM dbo.desafio_registrations WHERE desafio_id=@did AND crafter_id=@cid');
    if (dup.recordset.length) return res.json({ success: true, data: { registered: true } });
    const ins = await pool.request().input('did', dbSql.Int, id).input('cid', dbSql.Int, crafterId).query('INSERT INTO dbo.desafio_registrations (desafio_id, crafter_id) OUTPUT Inserted.* VALUES (@did, @cid)');
    res.status(201).json({ success: true, data: ins.recordset[0] });
  } catch (err) { next(err); }
});

app.post('/api/desafios/:id/entregar', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    let payload = req.body;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = {}; } }
    const crafterId = Number(payload?.crafter_id || req.user?.id || 0);
    if (!crafterId) return res.status(400).json({ error: 'crafter_id obrigatório' });
    const delivery = payload?.delivery || {};
    const pool = await getConnectionPool();
    const exists = await pool.request().input('id', dbSql.Int, id).query('SELECT id, base_points FROM dbo.desafios WHERE id=@id');
    if (!exists.recordset.length) return res.status(404).json({ error: 'Desafio não encontrado' });
    const ins = await pool.request()
      .input('did', dbSql.Int, id)
      .input('cid', dbSql.Int, crafterId)
      .input('delivery', dbSql.NVarChar, JSON.stringify(delivery))
      .query('INSERT INTO dbo.desafio_submissions (desafio_id, crafter_id, delivery) OUTPUT Inserted.* VALUES (@did, @cid, @delivery)');
    const row = ins.recordset[0];
    res.status(201).json({ success: true, data: row });
  } catch (err) { next(err); }
});

const reviewSchema = z.object({ status: z.enum(['approved','rejected']).optional(), score: z.number().int().min(0).optional(), review: z.any().optional() });

app.put('/api/submissions/:id/review', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    let payload = req.body;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = {}; } }
    const parsed = reviewSchema.safeParse(payload || {});
    if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR' });
    const r = parsed.data;
    const pool = await getConnectionPool();
    const cur = await pool.request().input('id', dbSql.Int, id).query('SELECT * FROM dbo.desafio_submissions WHERE id=@id');
    if (!cur.recordset.length) return res.status(404).json({ error: 'Submissão não encontrada' });
    const nextStatus = r.status ?? cur.recordset[0].status;
    const nextScore = r.score !== undefined ? Number(r.score) : cur.recordset[0].score;
    const nextReview = r.review !== undefined ? JSON.stringify(r.review) : cur.recordset[0].review;
    await pool.request().input('id', dbSql.Int, id).input('status', dbSql.NVarChar, nextStatus).input('score', dbSql.Int, nextScore).input('review', dbSql.NVarChar, nextReview).query('UPDATE dbo.desafio_submissions SET status=@status, score=@score, review=@review, updated_at=SYSUTCDATETIME() WHERE id=@id');
    const out = await pool.request().input('id', dbSql.Int, id).query('SELECT id, desafio_id, crafter_id, delivery, status, score, review, created_at, updated_at FROM dbo.desafio_submissions WHERE id=@id');
    const row = out.recordset[0];
    res.json({ success: true, data: { submission: { id: row.id, desafio_id: row.desafio_id, crafter_id: row.crafter_id, delivery: parseJsonSafe(row.delivery, {}), status: row.status, score: row.score, review: parseJsonSafe(row.review, {}), created_at: row.created_at, updated_at: row.updated_at } } });
  } catch (err) { next(err); }
});

// -----------------------------------------------------------------------------------------
// 30. Rotas de Arquivos Estáticos e Downloads
// -----------------------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'dist')));
app.get('/downloads/:file', async (req, res) => {
  try {
    const ua = String(req.headers['user-agent'] || 'unknown');
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const safeName = path.basename(String(req.params.file || '').trim());
    const baseDir = path.join(__dirname, 'public', 'downloads');
    const filePath = path.join(baseDir, safeName);
    const exists = fs.existsSync(filePath);
    if (!exists) {
      console.warn('DOWNLOAD 404', { ip, ua, file: safeName });
      return res.status(404).json({ error: 'Arquivo não encontrado', file: safeName });
    }

    const stat = fs.statSync(filePath);
    const size = stat.size;
    const ext = path.extname(safeName).toLowerCase();
    const mimeMap = {
      '.exe': 'application/x-msdownload',
      '.msi': 'application/x-msi',
      '.zip': 'application/zip',
      '.7z': 'application/x-7z-compressed',
    };
    const ctype = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', ctype);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Length', String(size));
    res.setHeader('Cache-Control', 'private, max-age=86400, no-transform');
    res.setHeader('Accept-Ranges', 'bytes');

    const hash = nodeCrypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => {
      try {
        const sha256 = hash.digest('hex');
        res.setHeader('X-File-SHA256', sha256);
        console.log('DOWNLOAD OK', { file: safeName, size, sha256, ip, ua });
      } catch (e) { void e; }
    });
    stream.on('error', (err) => {
      console.error('DOWNLOAD STREAM ERROR', { file: safeName, message: err?.message || String(err) });
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  } catch (err) {
    console.error('DOWNLOAD ERROR', err);
    return res.status(500).json({ error: 'Falha ao enviar arquivo para download' });
  }
});

app.get('/api/downloads/:file/integrity', async (req, res) => {
  // Fornece integridade (SHA-256) e tamanho do arquivo solicitado
  try {
    const safeName = path.basename(String(req.params.file || '').trim());
    const baseDir = path.join(__dirname, 'public', 'downloads');
    const filePath = path.join(baseDir, safeName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado', file: safeName });
    const stat = fs.statSync(filePath);
    const size = stat.size;
    const hash = nodeCrypto.createHash('sha256');
    await new Promise((resolve, reject) => {
      const s = fs.createReadStream(filePath);
      s.on('data', (c) => hash.update(c));
      s.on('end', resolve);
      s.on('error', reject);
    });
    const sha256 = hash.digest('hex');
    return res.json({ success: true, data: { file: safeName, size, sha256 } });
  } catch (err) {
    console.error('INTEGRITY ERROR', err);
    return res.status(500).json({ error: 'Falha ao calcular integridade do arquivo' });
  }
});

// Fallback estático para imagens e outros arquivos que não exigem cabeçalhos especiais
app.use('/downloads', express.static(path.join(__dirname, 'public', 'downloads')));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found' });
  next();
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// -----------------------------------------------------------------------------------------
// 31. Middleware Global de Erros
// -----------------------------------------------------------------------------------------
app.use((err, req, res, next) => {
  void next; // marca como usado para o ESLint mantendo a assinatura de 4 parâmetros
  console.error('Erro no servidor:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// -----------------------------------------------------------------------------------------
// 32. Inicialização do Servidor e Banco de Dados
// -----------------------------------------------------------------------------------------
getConnectionPool().then(async () => {
  // Garantias de schema e patches de migração
  await ensureUserTableSchema();
  await ensureProjetosOptionalColumns();
  await ensurePaymentsAuditPatch();
  await ensureAppPaymentsSchema();
  await ensureUserLicensesSchema();
  await ensureLicenseActivationsSchema();
  await ensurePasswordResetsSchema();
  await ensureFeedbacksSchema();
  await ensureDesafiosSchema();
  await ensureCoinCraftInstallerUrl();
  // Monitor de licenças em ambiente de teste
  startTestLicenseMonitor();
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

// -----------------------------------------------------------------------------------------
// 33. Rotas de Integração OAuth (Mercado Livre)
// -----------------------------------------------------------------------------------------

// OAuth callback Mercado Livre para troca de código por tokens
/**
 * @api {get} /api/mercado-livre/oauth/callback Callback OAuth Mercado Livre
 * @apiDescription Recebe o código de autorização do Mercado Livre e troca por tokens de acesso.
 * @apiGroup Integracoes
 * @apiParam {string} code Código de autorização retornado pelo Mercado Livre.
 * @apiSuccess {boolean} success Indica sucesso na troca de tokens.
 */
app.get('/api/mercado-livre/oauth/callback', async (req, res) => {
  // Callback de OAuth do Mercado Livre: troca código por tokens e persiste internamente
  try {
    const { code } = req.query;
    await mercadoLivre.exchangeCode(code);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro no OAuth callback Mercado Livre:', err);
    res.status(500).json({ error: 'OAuth callback error' });
  }
});

// -----------------------------------------------------------------------------------------
// 34. Funções de Gerenciamento de Schema do Banco de Dados
// -----------------------------------------------------------------------------------------

/**
 * Verifica e cria a tabela de reset de senhas se não existir.
 * @returns {Promise<void>}
 */
async function ensurePasswordResetsSchema() {
  // Cria/garante tabela de resets de senha com índices por usuário e token
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

/**
 * Verifica e cria a tabela de feedbacks se não existir.
 * @returns {Promise<void>}
 */
async function ensureFeedbacksSchema() {
  // Cria/garante tabela de feedbacks (mensagens do usuário) e índice por user_id
  try {
    const pool = await getConnectionPool();
    await pool.request().query(`
      IF OBJECT_ID('dbo.feedbacks', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.feedbacks (
          id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT NULL,
          name NVARCHAR(255) NULL,
          email NVARCHAR(255) NULL,
          message NVARCHAR(MAX) NOT NULL,
          type NVARCHAR(50) DEFAULT 'general',
          origin NVARCHAR(50) DEFAULT 'web',
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          CONSTRAINT FK_feedbacks_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
        );
        CREATE INDEX IX_feedbacks_user ON dbo.feedbacks(user_id);
      END;
    `);
    console.log('✅ Esquema de dbo.feedbacks verificado/criado');
  } catch (err) {
    console.error('Erro ao garantir esquema de dbo.feedbacks:', err);
  }
}

async function ensureDesafiosSchema() {
  // Cria/garante tabela de desafios (conteúdo/funcionalidades gamificadas) se necessário
  try {
    const pool = await getConnectionPool();
    await pool.request().query(`
      IF OBJECT_ID('dbo.desafios','U') IS NULL
      BEGIN
        CREATE TABLE dbo.desafios (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(128) NOT NULL,
          objective NVARCHAR(MAX) NULL,
          description NVARCHAR(MAX) NULL,
          deadline DATETIME2 NULL,
          difficulty NVARCHAR(32) NULL,
          tags NVARCHAR(MAX) NULL,
          tags_json NVARCHAR(MAX) NULL,
          reward NVARCHAR(128) NULL,
          base_points INT NOT NULL CONSTRAINT DF_desafios_base_points DEFAULT 0,
          delivery_type NVARCHAR(32) NULL,
          thumb_url NVARCHAR(256) NULL,
          status NVARCHAR(16) NOT NULL CONSTRAINT DF_desafios_status DEFAULT 'draft',
          visible BIT NOT NULL CONSTRAINT DF_desafios_visible DEFAULT 1,
          created_by INT NULL,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          updated_at DATETIME2 NULL
        );
      END;
    `);
    const addCol = async (name, type, defaults) => {
      await pool.request().query(`
        IF COL_LENGTH('dbo.desafios', '${name}') IS NULL
        BEGIN
          ALTER TABLE dbo.desafios ADD ${name} ${type} ${defaults || ''};
        END;
      `);
    };
    await addCol('tags_json', 'NVARCHAR(MAX) NULL');
    await addCol('created_by', 'INT NULL');
    await addCol('updated_at', 'DATETIME2 NULL');
    await addCol('base_points', 'INT NOT NULL', 'CONSTRAINT DF_desafios_base_points DEFAULT 0');
    await addCol('visible', 'BIT NOT NULL', 'CONSTRAINT DF_desafios_visible DEFAULT 1');
    await addCol('status', "NVARCHAR(16) NOT NULL", "CONSTRAINT DF_desafios_status DEFAULT 'draft'");
    await pool.request().query(`
      IF OBJECT_ID('dbo.desafio_registrations','U') IS NULL
      BEGIN
        CREATE TABLE dbo.desafio_registrations (
          id INT IDENTITY(1,1) PRIMARY KEY,
          desafio_id INT NOT NULL,
          crafter_id INT NOT NULL,
          at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          CONSTRAINT FK_desafio_reg_ch FOREIGN KEY (desafio_id) REFERENCES dbo.desafios(id),
          CONSTRAINT FK_desafio_reg_crafter FOREIGN KEY (crafter_id) REFERENCES dbo.crafters(id)
        );
        CREATE INDEX IX_desafio_reg ON dbo.desafio_registrations(desafio_id, crafter_id);
      END;
    `);
    await pool.request().query(`
      IF OBJECT_ID('dbo.desafio_submissions','U') IS NULL
      BEGIN
        CREATE TABLE dbo.desafio_submissions (
          id INT IDENTITY(1,1) PRIMARY KEY,
          desafio_id INT NOT NULL,
          crafter_id INT NOT NULL,
          delivery NVARCHAR(MAX) NULL,
          status NVARCHAR(16) NOT NULL CONSTRAINT DF_desafio_sub_status DEFAULT 'submitted',
          score INT NULL,
          review NVARCHAR(MAX) NULL,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          updated_at DATETIME2 NULL,
          CONSTRAINT FK_desafio_sub_ch FOREIGN KEY (desafio_id) REFERENCES dbo.desafios(id),
          CONSTRAINT FK_desafio_sub_crafter FOREIGN KEY (crafter_id) REFERENCES dbo.crafters(id)
        );
        CREATE INDEX IX_desafio_sub ON dbo.desafio_submissions(desafio_id, crafter_id);
      END;
    `);
  } catch (err) {
    console.error('Erro ao garantir esquema de desafios:', err);
  }
}

// -----------------------------------------------------------------------------------------
// 35. Rotas de Administração de Projetos (Visualização)
// -----------------------------------------------------------------------------------------

/**
 * @api {get} /api/admin/projetos Listar Projetos (Admin)
 * @apiDescription Retorna a lista de todos os projetos cadastrados (apenas admin).
 * @apiGroup Projetos
 * @apiPermission Admin
 * @apiSuccess {Object[]} data Lista de projetos.
 */
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
// -----------------------------------------------------------------------------------------
// 36. Funções Auxiliares de Webhook e Pagamento
// -----------------------------------------------------------------------------------------

/**
 * Processa webhooks de pagamento do Mercado Pago.
 * @param {string|number} paymentId ID do pagamento no Mercado Pago.
 * @returns {Promise<void>}
 */
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
    await mercadoLivre.sendTransaction(tx, { external_reference: String(paymentId), metadata: { payment_id: String(paymentId), source: 'webhook' } });
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
// -----------------------------------------------------------------------------------------
// 22.1. Upload de Executáveis (Admin) – Configuração antes da rota
// -----------------------------------------------------------------------------------------
