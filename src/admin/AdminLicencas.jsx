// src/admin/AdminLicencas.jsx
// Gestao de Licencas - Permite listar, criar e remover licencas manualmente
import React, { useState, useEffect, useCallback } from 'react';
import { FaKey, FaPlus, FaSearch, FaSync, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

import { apiRequest } from '../lib/apiConfig.js';
import { getAllApps } from '../services/appsAPI.js';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminLicencas.module.css';

const ADMIN_TOKEN = 'codecraftgenz';

async function fetchLicenses({ app_id, email, page = 1, limit = 50 } = {}) {
  const qp = new URLSearchParams();
  if (app_id) qp.set('app_id', app_id);
  if (email) qp.set('email', email);
  qp.set('page', String(page));
  qp.set('limit', String(limit));
  return apiRequest(`/health/admin/licenses?${qp.toString()}`, {
    method: 'GET',
    headers: { 'x-admin-token': ADMIN_TOKEN },
  });
}

async function provisionLicense({ app_id, email, name }) {
  return apiRequest('/health/admin/provision-license', {
    method: 'POST',
    headers: { 'x-admin-token': ADMIN_TOKEN },
    body: JSON.stringify({ app_id, email, name }),
  });
}

async function removeLicense(licenseId) {
  return apiRequest(`/health/admin/licenses/${licenseId}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': ADMIN_TOKEN },
  });
}

export default function AdminLicencas() {
  const [licenses, setLicenses] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filtros
  const [filterAppId, setFilterAppId] = useState('');
  const [filterEmail, setFilterEmail] = useState('');

  // Form nova licenca
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ app_id: '', email: '', name: '' });
  const [creating, setCreating] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadApps = useCallback(async () => {
    try {
      const json = await getAllApps({ page: 1, pageSize: 100 });
      const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      setApps(list);
    } catch { /* ignore */ }
  }, []);

  const loadLicenses = useCallback(async (pg = page) => {
    try {
      setLoading(true);
      setError('');
      const resp = await fetchLicenses({
        app_id: filterAppId || undefined,
        email: filterEmail || undefined,
        page: pg,
      });
      const data = resp?.data || resp;
      setLicenses(data?.licenses || []);
      setTotal(data?.total || 0);
      setPage(data?.page || pg);
      setPages(data?.pages || 1);
    } catch (e) {
      setError(e.message || 'Erro ao carregar licencas');
    } finally {
      setLoading(false);
    }
  }, [filterAppId, filterEmail, page]);

  useEffect(() => { loadApps(); }, [loadApps]);
  useEffect(() => { loadLicenses(1); }, [filterAppId, filterEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    loadLicenses(1);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.app_id || !form.email) {
      setError('App e email sao obrigatorios');
      return;
    }
    try {
      setCreating(true);
      setError('');
      const resp = await provisionLicense(form);
      const data = resp?.data || resp;
      showToast(`Licenca criada! Chave: ${data?.license_key || 'N/A'}`);
      setForm({ app_id: '', email: '', name: '' });
      setShowForm(false);
      loadLicenses(1);
    } catch (e) {
      setError(e.message || 'Erro ao criar licenca');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (license) => {
    if (!confirm(`Remover licenca #${license.id} (${license.email})?`)) return;
    try {
      await removeLicense(license.id);
      showToast('Licenca removida');
      loadLicenses(page);
    } catch (e) {
      setError(e.message || 'Erro ao remover licenca');
    }
  };

  const getAppName = (appId) => {
    const app = apps.find(a => a.id === appId);
    return app?.name || `App #${appId}`;
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <FaKey className={styles.headerIcon} />
          <div>
            <h1>Gestao de Licencas</h1>
            <p>{total} licencas encontradas</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setShowForm(!showForm)} className={styles.newBtn}>
            <FaPlus /> Nova Licenca
          </button>
          <button onClick={() => loadLicenses(page)} className={styles.refreshBtn}>
            <FaSync /> Atualizar
          </button>
        </div>
      </header>

      {/* Toast & Error */}
      {toast && <div className={styles.toast}><FaSave /> {toast}</div>}
      {error && <div className={styles.error}><FaTimes /> {error}</div>}

      {/* Form Nova Licenca */}
      {showForm && (
        <AdminCard variant="elevated" className={styles.formCard}>
          <h2 className={styles.formTitle}><FaPlus /> Provisionar Nova Licenca</h2>
          <form onSubmit={handleCreate} className={styles.formGrid}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Aplicativo *</label>
                <select
                  value={form.app_id}
                  onChange={e => setForm({ ...form, app_id: e.target.value })}
                  className={styles.select}
                  required
                >
                  <option value="">Selecione o app...</option>
                  {apps.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (ID: {a.id})</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Email do Cliente *</label>
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Nome (opcional)</label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" disabled={creating} className={styles.saveBtn}>
                {creating ? 'Criando...' : <><FaKey /> Gerar Licenca</>}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={styles.cancelBtn}>
                <FaTimes /> Cancelar
              </button>
            </div>
          </form>
        </AdminCard>
      )}

      {/* Filtros */}
      <AdminCard variant="outlined" className={styles.filterCard}>
        <form onSubmit={handleSearch} className={styles.filterRow}>
          <div className={styles.formGroup}>
            <label>Filtrar por App</label>
            <select
              value={filterAppId}
              onChange={e => setFilterAppId(e.target.value)}
              className={styles.select}
            >
              <option value="">Todos os apps</option>
              {apps.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Filtrar por Email</label>
            <input
              type="text"
              placeholder="Buscar por email..."
              value={filterEmail}
              onChange={e => setFilterEmail(e.target.value)}
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.searchBtn}>
            <FaSearch /> Buscar
          </button>
        </form>
      </AdminCard>

      {/* Tabela de Licencas */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando licencas...</p>
        </div>
      ) : licenses.length === 0 ? (
        <AdminCard variant="outlined">
          <div className={styles.emptyState}>
            <FaKey className={styles.emptyIcon} />
            <p>Nenhuma licenca encontrada</p>
          </div>
        </AdminCard>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>App</th>
                <th>Email</th>
                <th>Chave</th>
                <th>Hardware ID</th>
                <th>Status</th>
                <th>Criada em</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map(l => (
                <tr key={l.id}>
                  <td>#{l.id}</td>
                  <td>{l.app_name || getAppName(l.app_id)}</td>
                  <td className={styles.emailCell}>{l.email}</td>
                  <td className={styles.keyCell}>
                    <code>{l.license_key || '—'}</code>
                  </td>
                  <td className={styles.hwCell}>
                    {l.hardware_id ? <code>{l.hardware_id.slice(0, 12)}...</code> : <span className={styles.muted}>Nao ativada</span>}
                  </td>
                  <td>
                    <StatusBadge variant={l.activated_at ? 'success' : 'warning'}>
                      {l.activated_at ? 'Ativada' : 'Pendente'}
                    </StatusBadge>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(l.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(l)}
                      className={styles.deleteBtn}
                      title="Remover licenca"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginacao */}
      {pages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => loadLicenses(page - 1)}
            disabled={page <= 1}
            className={styles.pageBtn}
          >
            Anterior
          </button>
          <span className={styles.pageInfo}>
            Pagina {page} de {pages}
          </span>
          <button
            onClick={() => loadLicenses(page + 1)}
            disabled={page >= pages}
            className={styles.pageBtn}
          >
            Proxima
          </button>
        </div>
      )}
    </div>
  );
}
