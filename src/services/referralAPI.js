import { apiRequest } from '../lib/apiConfig.js';

/**
 * Retorna (ou gera) o código de indicação do usuário autenticado.
 */
export async function getMyReferralCode() {
  return apiRequest('/api/referral/my-code');
}

/**
 * Retorna estatísticas de indicação do usuário autenticado.
 */
export async function getReferralStats() {
  return apiRequest('/api/referral/stats');
}

/**
 * Processa um código de indicação para um novo usuário (chamado após cadastro).
 */
export async function useReferralCode(code, newUserId) {
  return apiRequest('/api/referral/use', {
    method: 'POST',
    body: JSON.stringify({ code, newUserId }),
  });
}
