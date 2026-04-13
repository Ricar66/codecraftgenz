// src/services/leadsAPI.js
// Serviço para captura de leads via API backend

const LEADS_API_URL = import.meta.env.VITE_LEADS_API_URL || '';
const LEADS_API_KEY = import.meta.env.VITE_LEADS_API_KEY || '';

/**
 * Extrai parâmetros UTM da URL atual
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
 * Captura um lead e envia para a API
 */
export async function captureLead(leadData) {
  if (!LEADS_API_URL) return { success: false, error: 'LEADS_API_URL não configurada' };

  try {
    const utmParams = getUtmParams();

    const payload = {
      name: leadData.name || '',
      email: leadData.email || '',
      phone: leadData.phone || '',
      custom: {
        form_id: leadData.formId || 'unknown',
        ...(leadData.customFields || {}),
      },
      ...utmParams,
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
    return { success: true, ...result };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[LeadsAPI] Erro ao capturar lead:', error.message);
    }
    return { success: false, error: error.message };
  }
}

export async function captureCrafterLead(data) {
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

export async function captureAppPurchaseLead(data, appId, appName) {
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

export async function captureFeedbackLead(data) {
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

export async function captureContactLead(data) {
  return captureLead({
    formId: 'contact',
    name: data.name || data.nome,
    email: data.email,
    phone: data.phone || data.telefone,
    customFields: data.customFields,
  });
}
