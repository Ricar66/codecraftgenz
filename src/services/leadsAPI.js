// src/services/leadsAPI.js
// Serviço para captura de leads via API externa e TrackPro

// Detecta se está em produção (não localhost)
const isProduction = typeof window !== 'undefined' &&
  !window.location.hostname.includes('localhost') &&
  !window.location.hostname.includes('127.0.0.1');

// URL da API de leads - TrackPro webhook (sempre usa TrackPro em produção)
const TRACKPRO_WEBHOOK_URL = 'https://app.trackpro.com.br/api/v1/public/leads/webhook';
const envLeadsUrl = import.meta.env.VITE_LEADS_API_URL;

// Se está em produção e a URL configurada é localhost, ignora e usa TrackPro
const LEADS_API_URL = (() => {
  if (!envLeadsUrl) return TRACKPRO_WEBHOOK_URL;
  if (isProduction && envLeadsUrl.includes('localhost')) return TRACKPRO_WEBHOOK_URL;
  return envLeadsUrl;
})();

const LEADS_API_KEY = import.meta.env.VITE_LEADS_API_KEY || 'tp_d50cddbcae54fc3c57608ca271b2a6470b7b3a7878421a07';

/**
 * Envia evento para TrackPro (se disponível)
 * @param {string} eventName - Nome do evento
 * @param {Object} eventData - Dados do evento
 */
function trackProEvent(eventName, eventData = {}) {
  try {
    if (typeof window !== 'undefined' && window.tpLayer) {
      window.tpLayer.push({
        event: eventName,
        ...eventData,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e) {
    // Silenciosamente ignora erros do TrackPro
    if (import.meta.env.DEV) {
      console.log('[TrackPro] Erro ao enviar evento:', e);
    }
  }
}

/**
 * Extrai parâmetros UTM da URL atual
 * @returns {Object} Objeto com parâmetros UTM
 */
function getUtmParams() {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_term: params.get('utm_term') || '',
    utm_content: params.get('utm_content') || '',
  };
}

/**
 * Captura um lead e envia para a API TrackPro
 * @param {Object} leadData - Dados do lead
 * @param {string} leadData.formId - Identificador do formulário (ex: 'crafter-signup', 'app-purchase')
 * @param {string} leadData.name - Nome do lead
 * @param {string} leadData.email - Email do lead
 * @param {string} [leadData.phone] - Telefone do lead (opcional)
 * @param {Object} [leadData.customFields] - Campos personalizados adicionais
 * @returns {Promise<Object>} Resposta da API
 */
export async function captureLead(leadData) {
  try {
    const utmParams = getUtmParams();

    // Formato compatível com TrackPro webhook
    const payload = {
      name: leadData.name || '',
      email: leadData.email || '',
      phone: leadData.phone || '',
      // Campos extras vão em custom
      custom: {
        form_id: leadData.formId || 'unknown',
        ...(leadData.customFields || {}),
      },
      // UTMs
      ...utmParams,
      // Dados de contexto
      page_url: typeof window !== 'undefined' ? window.location.href : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    };

    if (import.meta.env.DEV) {
      console.log('[LeadsAPI] Enviando lead:', payload);
    }

    const response = await fetch(LEADS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LEADS_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (import.meta.env.DEV) {
      console.log('[LeadsAPI] Lead capturado com sucesso:', result);
    }

    return { success: true, ...result };
  } catch (error) {
    // Não bloqueia o fluxo principal se a captura falhar
    if (import.meta.env.DEV) {
      console.error('[LeadsAPI] Erro ao capturar lead:', error.message);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Captura lead de inscrição de Crafter
 * @param {Object} data - Dados do formulário de Crafter
 */
export async function captureCrafterLead(data) {
  // Envia evento para TrackPro
  trackProEvent('lead_capture', {
    form_id: 'crafter-signup',
    lead_type: 'crafter',
    area_interesse: data.area_interesse,
    cidade: data.cidade,
    estado: data.estado,
  });

  return captureLead({
    formId: 'crafter-signup',
    name: data.nome,
    email: data.email,
    phone: data.telefone,
    customFields: {
      cidade: data.cidade,
      estado: data.estado,
      area_interesse: data.area_interesse,
      mensagem: data.mensagem,
    },
  });
}

/**
 * Captura lead de compra de app
 * @param {Object} data - Dados do comprador
 * @param {number|string} appId - ID do app sendo comprado
 * @param {string} appName - Nome do app
 */
export async function captureAppPurchaseLead(data, appId, appName) {
  // Envia evento para TrackPro
  trackProEvent('lead_capture', {
    form_id: 'app-purchase',
    lead_type: 'purchase_intent',
    app_id: String(appId),
    app_name: appName,
  });

  // Evento específico de intenção de compra
  trackProEvent('purchase_intent', {
    app_id: String(appId),
    app_name: appName,
  });

  return captureLead({
    formId: 'app-purchase',
    name: data.name,
    email: data.email,
    phone: data.phone,
    customFields: {
      appId: String(appId),
      appName: appName,
      cpf: data.identification,
      zip: data.zip,
      streetName: data.streetName,
    },
  });
}

/**
 * Captura lead de feedback
 * @param {Object} data - Dados do feedback
 */
export async function captureFeedbackLead(data) {
  // Envia evento para TrackPro
  trackProEvent('lead_capture', {
    form_id: 'feedback',
    lead_type: 'feedback',
    rating: data.rating,
  });

  return captureLead({
    formId: 'feedback',
    name: data.nome || data.name,
    email: data.email,
    customFields: {
      rating: data.rating,
      comment: data.comment || data.mensagem,
    },
  });
}

/**
 * Captura lead de newsletter/contato genérico
 * @param {Object} data - Dados básicos
 */
export async function captureContactLead(data) {
  return captureLead({
    formId: 'contact',
    name: data.name || data.nome,
    email: data.email,
    phone: data.phone || data.telefone,
    customFields: data.customFields,
  });
}
