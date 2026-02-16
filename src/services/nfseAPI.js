// src/services/nfseAPI.js
// Servicos de API para NFS-e (Nota Fiscal de Servico Eletronica)

import { apiRequest } from '../lib/apiConfig.js';

// Listar invoices com paginacao e filtros
export async function listInvoices(params = {}) {
  const qp = new URLSearchParams();
  if (params.page) qp.set('page', params.page);
  if (params.limit) qp.set('limit', params.limit);
  if (params.status) qp.set('status', params.status);
  if (params.cnpj) qp.set('cnpj', params.cnpj);
  if (params.dataInicio) qp.set('dataInicio', params.dataInicio);
  if (params.dataFim) qp.set('dataFim', params.dataFim);
  return apiRequest(`/api/nfse?${qp.toString()}`, { method: 'GET' });
}

// Buscar invoice por ID
export async function getInvoiceById(id) {
  if (!id) throw new Error('id é obrigatório');
  return apiRequest(`/api/nfse/${encodeURIComponent(id)}`, { method: 'GET' });
}

// Gerar nova invoice (a partir de dados de venda)
export async function gerarInvoice(data) {
  return apiRequest('/api/nfse/gerar', { method: 'POST', body: JSON.stringify(data) });
}

// Enviar RPS para prefeitura
export async function enviarInvoice(id) {
  return apiRequest(`/api/nfse/${encodeURIComponent(id)}/enviar`, { method: 'POST' });
}

// Consultar status do lote na prefeitura
export async function consultarInvoice(id) {
  return apiRequest(`/api/nfse/${encodeURIComponent(id)}/consultar`, { method: 'GET' });
}

// Cancelar NFS-e
export async function cancelarInvoice(id, motivo) {
  const body = motivo ? JSON.stringify({ motivo }) : '{}';
  return apiRequest(`/api/nfse/${encodeURIComponent(id)}/cancelar`, { method: 'POST', body });
}

// Obter XML da invoice
export async function getInvoiceXml(id) {
  return apiRequest(`/api/nfse/${encodeURIComponent(id)}/xml`, { method: 'GET' });
}
