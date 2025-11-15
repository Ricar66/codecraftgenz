// Integração independente com API do Mercado Livre/Mercado Pago
// - OAuth 2.0: troca de código e refresh
// - Validação de dados de transação
// - Logs detalhados por operação
// - Envio de transação para endpoint configurável (fallback Merchant Orders)

import fs from 'fs';
import path from 'path';

const TOKENS_PATH = path.join(process.cwd(), 'src', 'integrations', 'mlTokens.json');

function safeReadJson(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeWriteJson(file, obj) {
  try {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.warn('[MercadoLivre] Falha ao salvar tokens:', err?.message || err);
  }
}

function nowTs() { return Math.floor(Date.now() / 1000); }

function mkLogger(level = 'info') {
  const levels = ['debug', 'info', 'warn', 'error'];
  const idx = levels.indexOf(level);
  return {
    debug: (...a) => { if (idx <= 0) console.debug('[MercadoLivre][DEBUG]', ...a); },
    info:  (...a) => { if (idx <= 1) console.info('[MercadoLivre][INFO]', ...a); },
    warn:  (...a) => { if (idx <= 2) console.warn('[MercadoLivre][WARN]', ...a); },
    error: (...a) => { if (idx <= 3) console.error('[MercadoLivre][ERROR]', ...a); },
  };
}

const state = {
  clientId: '',
  clientSecret: '',
  redirectUri: '',
  oauthUrl: 'https://api.mercadolibre.com/oauth/token',
  syncUrl: 'https://api.mercadopago.com/merchant_orders',
  log: mkLogger('info'),
  tokens: safeReadJson(TOKENS_PATH) || { access_token: null, refresh_token: null, expires_at: 0 },
};

export function init(config = {}) {
  state.clientId = config.clientId || process.env.MELI_CLIENT_ID || '';
  state.clientSecret = config.clientSecret || process.env.MELI_CLIENT_SECRET || '';
  state.redirectUri = config.redirectUri || process.env.MELI_REDIRECT_URI || '';
  state.oauthUrl = config.oauthUrl || process.env.MELI_OAUTH_URL || state.oauthUrl;
  state.syncUrl = config.syncUrl || process.env.MELI_SYNC_URL || state.syncUrl;
  state.log = mkLogger(config.logLevel || process.env.MELI_LOG_LEVEL || 'info');
  state.log.info('Inicializado módulo MercadoLivre', { syncUrl: state.syncUrl });
}

export async function exchangeCode(code) {
  if (!code) throw new Error('Código OAuth ausente');
  if (!state.clientId || !state.clientSecret || !state.redirectUri) {
    throw new Error('Credenciais OAuth incompletas (clientId/clientSecret/redirectUri)');
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: state.clientId,
    client_secret: state.clientSecret,
    code,
    redirect_uri: state.redirectUri,
  });
  state.log.info('Trocando código OAuth por tokens...');
  const resp = await fetch(state.oauthUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!resp.ok) {
    const txt = await resp.text();
    state.log.error('Falha na troca de código', resp.status, txt);
    throw new Error(`OAuth error ${resp.status}`);
  }
  const json = await resp.json();
  const expiresIn = Number(json.expires_in || 0);
  state.tokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: nowTs() + (expiresIn ? expiresIn - 60 : 0), // margem de segurança
  };
  safeWriteJson(TOKENS_PATH, state.tokens);
  state.log.info('Tokens obtidos e salvos.');
  return { success: true };
}

export async function refreshToken() {
  if (!state.tokens.refresh_token) throw new Error('Refresh token ausente');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: state.clientId,
    client_secret: state.clientSecret,
    refresh_token: state.tokens.refresh_token,
  });
  state.log.info('Atualizando access token via refresh_token...');
  const resp = await fetch(state.oauthUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!resp.ok) {
    const txt = await resp.text();
    state.log.error('Falha no refresh', resp.status, txt);
    throw new Error(`OAuth refresh error ${resp.status}`);
  }
  const json = await resp.json();
  const expiresIn = Number(json.expires_in || 0);
  state.tokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token || state.tokens.refresh_token,
    expires_at: nowTs() + (expiresIn ? expiresIn - 60 : 0),
  };
  safeWriteJson(TOKENS_PATH, state.tokens);
  state.log.info('Access token renovado.');
  return { success: true };
}

export async function ensureAccessToken() {
  // 1) Se temos access token válido via OAuth
  if (state.tokens.access_token && nowTs() < state.tokens.expires_at) return state.tokens.access_token;
  // 2) Tentar refresh via OAuth
  if (state.tokens.refresh_token) {
    try {
      await refreshToken();
      if (state.tokens.access_token) return state.tokens.access_token;
    } catch {
      state.log.warn('Falha no refresh OAuth, tentando fallback com MERCADO_PAGO_ACCESS_TOKEN');
    }
  }
  const envRaw = String(process.env.MP_ENV || process.env.MERCADO_PAGO_ENV || '').toLowerCase();
  const isProd = ['prod','production','live'].includes(envRaw);
  const mpAccess = isProd
    ? (process.env.MERCADO_PAGO_ACCESS_TOKEN_PROD || process.env.MP_ACCESS_TOKEN_PROD || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '')
    : (process.env.MERCADO_PAGO_ACCESS_TOKEN_SANDBOX || process.env.MP_ACCESS_TOKEN_SANDBOX || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '');
  if (mpAccess) {
    state.log.info('Usando access token do ambiente', { env: isProd ? 'production' : 'sandbox' });
    return mpAccess;
  }
  // 4) Sem opções válidas
  throw new Error('Sem access token válido (OAuth ou MERCADO_PAGO_ACCESS_TOKEN). Configure as credenciais.');
}

export function validateTransaction(tx) {
  const errors = [];
  if (!tx) return ['Transação não informada'];
  const amount = Number(tx.amount);
  if (!amount || amount <= 0) errors.push('Valor inválido');
  const products = Array.isArray(tx.products) ? tx.products : [];
  if (products.length === 0) errors.push('Lista de produtos vazia');
  products.forEach((p, i) => {
    if (!p || !p.title || !p.quantity || Number(p.unit_price) <= 0) {
      errors.push(`Produto[${i}] inválido`);
    }
  });
  const customer = tx.customer || {};
  if (!customer.email) errors.push('Cliente.email obrigatório');
  return errors;
}

export async function sendTransaction(tx, context = {}) {
  const errors = validateTransaction(tx);
  if (errors.length) {
    state.log.warn('Validação falhou, não enviando:', errors);
    throw new Error('Dados da transação inválidos: ' + errors.join('; '));
  }
  const token = await ensureAccessToken();
  const payload = {
    external_reference: String(context.external_reference || ''),
    payer: { email: tx.customer.email, name: tx.customer.name || undefined },
    items: tx.products.map(p => ({ title: p.title, quantity: p.quantity, unit_price: Number(p.unit_price), currency_id: 'BRL' })),
    transaction_amount: Number(tx.amount),
    metadata: { source: 'codecraft', ...context?.metadata },
  };
  state.log.info('Enviando transação para sync', { url: state.syncUrl, ref: payload.external_reference, amount: payload.transaction_amount });
  const resp = await fetch(state.syncUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!resp.ok) {
    state.log.error('Falha ao sincronizar transação', resp.status, json);
    throw new Error(`Sync error ${resp.status}`);
  }
  state.log.info('Transação sincronizada com sucesso', json?.id || json);
  return { success: true, result: json };
}

export const mercadoLivre = { init, exchangeCode, refreshToken, ensureAccessToken, validateTransaction, sendTransaction };