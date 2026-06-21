// src/services/reviewAPI.js
import { apiRequest } from '../lib/apiConfig.js';

export const REVIEW_TIPOS = [
  { value: 'elogio', label: 'Elogio', emoji: '💚' },
  { value: 'sugestao', label: 'Sugestão', emoji: '💡' },
  { value: 'reclamacao', label: 'Reclamação', emoji: '⚠️' },
  { value: 'duvida', label: 'Dúvida', emoji: '❓' },
];

const RATE_LIMIT_MS = 30_000;
function canSubmit() {
  const last = Number(localStorage.getItem('site_review_last') || 0);
  return Date.now() - last > RATE_LIMIT_MS;
}
function markSubmitted() {
  localStorage.setItem('site_review_last', String(Date.now()));
}

export async function submitReview({ nome, email, tipo, nota, mensagem, ref, honeypot = '' } = {}) {
  if (honeypot) throw new Error('Submissão inválida.');
  if (!canSubmit()) throw new Error('Você acabou de enviar uma avaliação. Aguarde um momento.');

  const tipoOk = REVIEW_TIPOS.some(t => t.value === tipo);
  if (!tipoOk) throw new Error('Selecione o tipo de avaliação');
  const n = Number(nota);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error('Selecione uma nota de 1 a 5');
  const msg = String(mensagem || '').trim();
  if (msg.length < 5) throw new Error('Escreva pelo menos 5 caracteres');
  if (msg.length > 4000) throw new Error('Mensagem muito longa (máx 4000)');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email inválido');

  const payload = {
    nome: nome ? String(nome).trim() : undefined,
    email: email ? String(email).trim() : undefined,
    tipo,
    nota: n,
    mensagem: msg,
    ref: ref ? String(ref) : undefined,
  };

  const res = await apiRequest('/api/avaliacoes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  markSubmitted();
  return res;
}

export async function listReviews({ limit = 50, tipo, lida } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (tipo) params.append('tipo', tipo);
  if (lida === true) params.append('lida', 'true');
  if (lida === false) params.append('lida', 'false');
  const res = await apiRequest(`/api/avaliacoes?${params.toString()}`);
  return res?.data || res;
}

export async function markReviewLida(id, lida) {
  return apiRequest(`/api/avaliacoes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ lida }),
  });
}

export async function deleteReview(id) {
  return apiRequest(`/api/avaliacoes/${id}`, { method: 'DELETE' });
}
