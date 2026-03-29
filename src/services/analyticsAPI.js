// src/services/analyticsAPI.js
// Serviço de tracking de eventos com buffer e envio em batch para o backend
import { apiRequest } from '../lib/apiConfig.js';

// ── Session ID ──────────────────────────────────────────────
function getSessionId() {
  let sid = sessionStorage.getItem('cc_session_id');
  if (!sid) {
    sid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('cc_session_id', sid);
  }
  return sid;
}

// ── UTM Params ──────────────────────────────────────────────
function getUtmParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
    };
  } catch { return {}; }
}

// ── Device Info ─────────────────────────────────────────────
function getDeviceType() {
  if (typeof window === 'undefined') return 'unknown';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

// ── Definição dos Funis ─────────────────────────────────────
export const FUNNELS = {
  purchase_funnel: {
    label: 'Funil de Compra',
    steps: [
      { name: 'app_viewed', label: 'App Visualizado' },
      { name: 'app_buy_clicked', label: 'Clicou Comprar' },
      { name: 'checkout_started', label: 'Iniciou Checkout' },
      { name: 'checkout_info_completed', label: 'Preencheu Dados' },
      { name: 'payment_method_selected', label: 'Escolheu Pagamento' },
      { name: 'payment_initiated', label: 'Pagamento Iniciado' },
      { name: 'payment_completed', label: 'Pagamento Aprovado' },
      { name: 'app_downloaded', label: 'Download Realizado' },
    ],
    errorEvents: ['payment_failed', 'payment_pending', 'checkout_abandoned'],
  },
  crafter_funnel: {
    label: 'Funil de Crafter',
    steps: [
      { name: 'crafter_cta_clicked', label: 'Clicou CTA' },
      { name: 'crafter_modal_opened', label: 'Modal Aberto' },
      { name: 'crafter_form_submitted', label: 'Formulário Enviado' },
    ],
  },
  feedback_funnel: {
    label: 'Funil de Feedback',
    steps: [
      { name: 'feedback_page_viewed', label: 'Página Visualizada' },
      { name: 'feedback_form_started', label: 'Começou a Preencher' },
      { name: 'feedback_form_submitted', label: 'Feedback Enviado' },
    ],
  },
};

// ── Buffer de Eventos ───────────────────────────────────────
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL_MS = 5000;

let eventBuffer = [];
let flushTimer = null;

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS);
}

function stopFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

async function flushEvents() {
  if (eventBuffer.length === 0) return;
  const batch = [...eventBuffer];
  eventBuffer = [];

  try {
    await apiRequest('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({ events: batch }),
      suppressLog: true,
    });
  } catch {
    // Se falhar, re-adiciona os eventos no buffer para reenviar
    eventBuffer.unshift(...batch);
  }
}

// Flush com sendBeacon na saída da página (beforeunload)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventBuffer.length === 0) return;
    const body = JSON.stringify({ events: eventBuffer });
    const blob = new Blob([body], { type: 'application/json' });
    try {
      const { API_BASE_URL } = require('../lib/apiConfig.js');
      navigator.sendBeacon?.(`${API_BASE_URL}/api/analytics/events`, blob);
    } catch { /* silently fail */ }
    eventBuffer = [];
  });
}

// ── API Pública ─────────────────────────────────────────────

/**
 * Envia um evento de analytics com contexto completo.
 * Eventos são bufferizados e enviados em batch.
 */
export function trackEvent(eventName, properties = {}, category = 'general') {
  const event = {
    event_name: eventName,
    event_category: category,
    session_id: getSessionId(),
    page_url: window.location.href,
    page_path: window.location.pathname,
    referrer: document.referrer,
    device_type: getDeviceType(),
    ...getUtmParams(),
    properties,
    timestamp: new Date().toISOString(),
  };

  eventBuffer.push(event);

  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${category}/${eventName}`, properties);
  }

  if (eventBuffer.length >= BUFFER_SIZE) {
    flushEvents();
  } else {
    startFlushTimer();
  }
}

/**
 * Rastreia um passo de funil com contexto
 */
export function trackFunnelStep(funnelName, stepName, properties = {}) {
  trackEvent(stepName, { funnel: funnelName, ...properties }, funnelName);
}

/**
 * Rastreia page view
 */
export function trackPageView(pageName, properties = {}) {
  trackEvent('page_view', { page_name: pageName, ...properties }, 'navigation');
}

// ── APIs de leitura (para o Dashboard) ──────────────────────

/**
 * Busca dados de funil para o dashboard
 */
export async function getFunnelData(funnelName, period = '30d') {
  return apiRequest(`/api/analytics/funnel?funnel=${funnelName}&period=${period}`);
}

/**
 * Busca lista de eventos com paginação
 */
export async function getAnalyticsEvents(params = {}) {
  const query = new URLSearchParams({
    limit: String(params.limit || 50),
    offset: String(params.offset || 0),
    ...(params.category ? { category: params.category } : {}),
    ...(params.period ? { period: params.period } : {}),
    ...(params.event_name ? { event_name: params.event_name } : {}),
  }).toString();
  return apiRequest(`/api/analytics/events?${query}`);
}

/**
 * Busca resumo geral de analytics
 */
export async function getAnalyticsSummary(period = '30d') {
  return apiRequest(`/api/analytics/summary?period=${period}`);
}
