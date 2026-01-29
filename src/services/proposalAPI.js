// src/services/proposalAPI.js
import { apiRequest } from '../lib/apiConfig.js';

/**
 * List all proposals with optional filters
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status
 * @param {string} params.search - Search by company/contact/email
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} Proposals list with pagination
 */
export async function listProposals({ status, search, page = 1, limit = 20 } = {}) {
  const qp = new URLSearchParams();
  qp.set('page', String(page));
  qp.set('limit', String(limit));
  if (status) qp.set('status', status);
  if (search) qp.set('search', search);

  const resp = await apiRequest(`/api/proposals?${qp.toString()}`, { method: 'GET' });
  return resp?.data ?? resp;
}

/**
 * Get a single proposal by ID
 * @param {string} id - Proposal ID
 * @returns {Promise<Object>} Proposal data
 */
export async function getProposalById(id) {
  if (!id) throw new Error('id é obrigatório');
  const resp = await apiRequest(`/api/proposals/${encodeURIComponent(id)}`, { method: 'GET' });
  return resp?.data ?? resp;
}

/**
 * Create a new proposal
 * @param {Object} data - Proposal data
 * @returns {Promise<Object>} Created proposal
 */
export async function createProposal(data) {
  const resp = await apiRequest('/api/proposals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return resp?.data ?? resp;
}

/**
 * Update an existing proposal
 * @param {string} id - Proposal ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Updated proposal
 */
export async function updateProposal(id, data) {
  if (!id) throw new Error('id é obrigatório');
  const resp = await apiRequest(`/api/proposals/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return resp?.data ?? resp;
}

/**
 * Update only the status of a proposal
 * @param {string} id - Proposal ID
 * @param {string} status - New status
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Updated proposal
 */
export async function updateProposalStatus(id, status, notes) {
  if (!id) throw new Error('id é obrigatório');
  if (!status) throw new Error('status é obrigatório');
  const resp = await apiRequest(`/api/proposals/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
  return resp?.data ?? resp;
}

/**
 * Delete a proposal
 * @param {string} id - Proposal ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteProposal(id) {
  if (!id) throw new Error('id é obrigatório');
  return apiRequest(`/api/proposals/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * Get proposal statistics
 * @returns {Promise<Object>} Proposal stats
 */
export async function getProposalStats() {
  const resp = await apiRequest('/api/proposals/stats', { method: 'GET' });
  return resp?.data ?? resp;
}
