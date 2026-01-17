// src/services/leadsAPI.js
// Serviço para captura de leads via API externa e TrackPro

// URL da API de leads - configurável via variável de ambiente
const LEADS_API_URL = import.meta.env.VITE_LEADS_API_URL || '';
const LEADS_API_KEY = import.meta.env.VITE_LEADS_API_KEY || '';

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
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    utmTerm: params.get('utm_term') || undefined,
    utmContent: params.get('utm_content') || undefined,
  };
}

/**
 * Captura um lead e envia para a API externa
 * @param {Object} leadData - Dados do lead
 * @param {string} leadData.formId - Identificador do formulário (ex: 'crafter-signup', 'app-purchase')
 * @param {string} leadData.name - Nome do lead
 * @param {string} leadData.email - Email do lead
 * @param {string} [leadData.phone] - Telefone do lead (opcional)
 * @param {Object} [leadData.customFields] - Campos personalizados adicionais
 * @returns {Promise<Object>} Resposta da API
 */
export async function captureLead(leadData) {
  // Se não há API key configurada, apenas loga e retorna
  if (!LEADS_API_KEY) {
    if (import.meta.env.DEV) {
      console.log('[LeadsAPI] API Key não configurada. Lead capturado localmente:', leadData);
    }
    return { success: true, local: true };
  }

  try {
    const utmParams = getUtmParams();

    const payload = {
      formId: leadData.formId || 'unknown',
      name: leadData.name || '',
      email: leadData.email || '',
      phone: leadData.phone || undefined,
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
      ...utmParams,
      // Campos personalizados
      ...(leadData.customFields || {}),
    };

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
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (import.meta.env.DEV) {
      console.log('[LeadsAPI] Lead capturado com sucesso:', result);
    }

    return { success: true, ...result };
  } catch (error) {
    // Não bloqueia o fluxo principal se a captura falhar
    console.error('[LeadsAPI] Erro ao capturar lead:', error.message);
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
