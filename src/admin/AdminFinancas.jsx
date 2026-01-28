// src/admin/AdminFinancas.jsx
// Refatorado para usar Design System CodeCraft
import React, { useState, useMemo } from 'react';
import {
  FaDollarSign, FaPlus, FaEdit, FaSave, FaTimes, FaDownload,
  FaTable, FaTh, FaCheck, FaClock, FaPercent, FaChartBar,
  FaChevronLeft, FaChevronRight, FaTrash, FaProjectDiagram
} from 'react-icons/fa';

import { useFinance, FinanceRepo, useProjects } from '../hooks/useAdminRepo';
import { apiRequest } from '../lib/apiConfig';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminFinancas.module.css';

export default function AdminFinancas() {
  const { data: list, loading, error, refresh } = useFinance();
  const { data: projects } = useProjects();
  const [form, setForm] = useState({
    item: '', valor: 0, status: 'pending', type: 'other', project_id: '', progress: 0
  });
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState({ status: '', type: '', project: '' });
  const [view, setView] = useState('table');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');
  const pageSize = 10;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const filtered = useMemo(() =>
    (list || []).filter(f => {
      const matchQuery = !query ||
        (f.item || '').toLowerCase().includes(query.toLowerCase()) ||
        (f.status || '').toLowerCase().includes(query.toLowerCase());
      const matchStatus = !filter.status || f.status === filter.status;
      const matchType = !filter.type || f.type === filter.type;
      const matchProject = !filter.project || f.project_id === filter.project;
      return matchQuery && matchStatus && matchType && matchProject;
    }), [list, query, filter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => ({
    total: (list || []).reduce((acc, f) => acc + Number(f.valor || 0), 0),
    paid: (list || []).filter(f => f.status === 'paid').reduce((acc, f) => acc + Number(f.valor || 0), 0),
    pending: (list || []).filter(f => f.status === 'pending').reduce((acc, f) => acc + Number(f.valor || 0), 0),
    discount: (list || []).filter(f => f.status === 'discount').reduce((acc, f) => acc + Number(f.valor || 0), 0),
    count: (list || []).length
  }), [list]);

  const onSave = async () => {
    setBusy(true);
    try {
      const payload = { ...form };
      payload.valor = Number(payload.valor);
      payload.progress = Number(payload.progress);
      payload.date = new Date().toISOString();

      if (editingId) {
        await FinanceRepo.update(editingId, payload);
      } else {
        await apiRequest('/api/financas', { method: 'POST', body: JSON.stringify(payload) });
      }

      setForm({ item: '', valor: 0, status: 'pending', type: 'other', project_id: '', progress: 0 });
      setEditingId(null);
      showToast(editingId ? 'Registro atualizado!' : 'Registro criado!');
      refresh();
    } catch (err) {
      showToast('Erro ao salvar: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const onEdit = (f) => {
    setEditingId(f.id);
    setForm({
      item: f.item || '',
      valor: Number(f.valor || 0),
      status: f.status || 'pending',
      type: f.type || 'other',
      project_id: f.project_id || '',
      progress: Number(f.progress || 0)
    });
    document.getElementById('finance-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Confirma a exclusão deste registro financeiro?')) return;
    try {
      await apiRequest(`/api/financas/${id}`, { method: 'DELETE' });
      showToast('Registro excluído!');
      refresh();
    } catch (err) {
      showToast('Erro ao excluir: ' + err.message);
    }
  };

  const onToggleStatus = async (f) => {
    const newStatus = f.status === 'paid' ? 'pending' : 'paid';
    await FinanceRepo.update(f.id, { status: newStatus });
    showToast(`Status alterado para ${newStatus === 'paid' ? 'Pago' : 'Pendente'}`);
    refresh();
  };

  const onExport = () => {
    const csv = FinanceRepo.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getProjectName = (projectId) => {
    const project = (projects || []).find(p => p.id === projectId);
    return project ? (project.title || project.titulo || project.nome) : 'Projeto não encontrado';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'paid': return styles.statusPaid;
      case 'discount': return styles.statusDiscount;
      case 'cancelled': return styles.statusCancelled;
      default: return '';
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'discount': return 'info';
      case 'cancelled': return 'error';
      default: return 'neutral';
    }
  };

  const typeLabels = {
    project: 'Projeto',
    discount: 'Desconto',
    other: 'Outros'
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ item: '', valor: 0, status: 'pending', type: 'other', project_id: '', progress: 0 });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <FaDollarSign className={styles.headerIcon} />
          <div>
            <h1>Gestão Financeira</h1>
            <p>Gerencie receitas, despesas e integrações com projetos</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setView(view === 'table' ? 'cards' : 'table')} className={styles.viewBtn}>
            {view === 'table' ? <><FaTh /> Cards</> : <><FaTable /> Tabela</>}
          </button>
          <button onClick={onExport} className={styles.exportBtn}>
            <FaDownload /> Exportar CSV
          </button>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={styles.toast}>
          <FaCheck /> {toast}
        </div>
      )}

      {/* KPIs */}
      <div className={styles.kpisGrid}>
        <AdminCard variant="outlined" className={styles.kpiCard}>
          <h3><FaDollarSign /> Total</h3>
          <p className={`${styles.kpiValue} ${styles.kpiTotal}`}>
            R$ {stats.total.toLocaleString('pt-BR')}
          </p>
        </AdminCard>
        <AdminCard variant="outlined" className={styles.kpiCard}>
          <h3><FaCheck /> Pago</h3>
          <p className={`${styles.kpiValue} ${styles.kpiPaid}`}>
            R$ {stats.paid.toLocaleString('pt-BR')}
          </p>
        </AdminCard>
        <AdminCard variant="outlined" className={styles.kpiCard}>
          <h3><FaClock /> Pendente</h3>
          <p className={`${styles.kpiValue} ${styles.kpiPending}`}>
            R$ {stats.pending.toLocaleString('pt-BR')}
          </p>
        </AdminCard>
        <AdminCard variant="outlined" className={styles.kpiCard}>
          <h3><FaPercent /> Descontos</h3>
          <p className={`${styles.kpiValue} ${styles.kpiDiscount}`}>
            R$ {stats.discount.toLocaleString('pt-BR')}
          </p>
        </AdminCard>
        <AdminCard variant="outlined" className={styles.kpiCard}>
          <h3><FaChartBar /> Registros</h3>
          <p className={`${styles.kpiValue} ${styles.kpiCount}`}>
            {stats.count}
          </p>
        </AdminCard>
      </div>

      {/* Filters */}
      <AdminCard variant="elevated" className={styles.filtersCard}>
        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Buscar item ou status..."
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            className={styles.searchInput}
          />
          <select
            value={filter.status}
            onChange={e => { setFilter({ ...filter, status: e.target.value }); setPage(1); }}
            className={styles.filterSelect}
          >
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="discount">Desconto</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <select
            value={filter.type}
            onChange={e => { setFilter({ ...filter, type: e.target.value }); setPage(1); }}
            className={styles.filterSelect}
          >
            <option value="">Todos os Tipos</option>
            <option value="project">Projeto</option>
            <option value="discount">Desconto</option>
            <option value="other">Outros</option>
          </select>
          <select
            value={filter.project}
            onChange={e => { setFilter({ ...filter, project: e.target.value }); setPage(1); }}
            className={styles.filterSelect}
          >
            <option value="">Todos os Projetos</option>
            {(projects || []).map(p => (
              <option key={p.id} value={p.id}>{p.title || p.titulo || p.nome}</option>
            ))}
          </select>
          <div className={styles.pagination}>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className={styles.pageBtn}>
              <FaChevronLeft />
            </button>
            <span>Página {page} de {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={styles.pageBtn}>
              <FaChevronRight />
            </button>
          </div>
        </div>
      </AdminCard>

      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {/* Cards View */}
      {view === 'cards' && (
        <div className={styles.cardsGrid}>
          {pageItems.length === 0 ? (
            <AdminCard variant="outlined" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
              <p>Nenhum registro encontrado</p>
            </AdminCard>
          ) : pageItems.map(f => (
            <AdminCard
              key={f.id}
              variant="elevated"
              className={styles.financeCard}
              style={{ borderColor: f.status === 'paid' ? '#10B981' : f.status === 'pending' ? '#F59E0B' : f.status === 'discount' ? '#D12BF2' : '#666' }}
            >
              <div className={styles.cardHeader}>
                <div>
                  <h3>{f.item}</h3>
                  <p className={styles.cardType}>
                    <FaProjectDiagram /> {typeLabels[f.type] || f.type}
                  </p>
                </div>
                <StatusBadge variant={getStatusVariant(f.status)}>{f.status}</StatusBadge>
              </div>

              <p className={styles.cardValue}>
                R$ {Number(f.valor || 0).toLocaleString('pt-BR')}
              </p>

              {f.project_id && (
                <p className={styles.cardProject}>
                  <FaProjectDiagram /> {getProjectName(f.project_id)}
                </p>
              )}

              {f.progress > 0 && (
                <div className={styles.progressContainer}>
                  <div className={styles.progressHeader}>
                    <span>Progresso</span>
                    <span>{f.progress}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${f.progress}%` }} />
                  </div>
                </div>
              )}

              <div className={styles.cardActions}>
                <button onClick={() => onEdit(f)} className={styles.editBtn} title="Editar">
                  <FaEdit />
                </button>
                <button onClick={() => onToggleStatus(f)} className={styles.toggleBtn} title={f.status === 'paid' ? 'Marcar pendente' : 'Marcar pago'}>
                  {f.status === 'paid' ? <FaClock /> : <FaCheck />}
                </button>
                <button onClick={() => onDelete(f.id)} className={styles.deleteBtn} title="Excluir">
                  <FaTrash />
                </button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <AdminCard variant="elevated" className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Tipo</th>
                <th>Projeto</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Progresso</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className={styles.emptyRow}>
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : pageItems.map(f => (
                <tr key={f.id}>
                  <td className={styles.itemCell}>{f.item}</td>
                  <td>{typeLabels[f.type] || f.type}</td>
                  <td>{f.project_id ? getProjectName(f.project_id) : '—'}</td>
                  <td className={styles.valueCell}>
                    R$ {Number(f.valor || 0).toLocaleString('pt-BR')}
                  </td>
                  <td>
                    <StatusBadge variant={getStatusVariant(f.status)}>{f.status}</StatusBadge>
                  </td>
                  <td>
                    {f.progress > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={styles.progressBar} style={{ width: 60 }}>
                          <div className={styles.progressFill} style={{ width: `${f.progress}%` }} />
                        </div>
                        <span style={{ fontSize: '0.8rem' }}>{f.progress}%</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td>{f.date ? new Date(f.date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>
                    <div className={styles.cardActions} style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                      <button onClick={() => onEdit(f)} className={styles.editBtn} title="Editar">
                        <FaEdit />
                      </button>
                      <button onClick={() => onToggleStatus(f)} className={styles.toggleBtn} title={f.status === 'paid' ? 'Marcar pendente' : 'Marcar pago'}>
                        {f.status === 'paid' ? <FaClock /> : <FaCheck />}
                      </button>
                      <button onClick={() => onDelete(f.id)} className={styles.deleteBtn} title="Excluir">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {/* Form */}
      <AdminCard variant="elevated" className={styles.formCard} id="finance-form">
        <h2 className={styles.formTitle}>
          {editingId ? <><FaEdit /> Editar Registro</> : <><FaPlus /> Novo Registro Financeiro</>}
        </h2>

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nome do item/serviço *</label>
              <input
                type="text"
                placeholder="Ex: Desenvolvimento do app"
                value={form.item}
                onChange={e => setForm({ ...form, item: e.target.value })}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Valor (R$) *</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.valor}
                onChange={e => setForm({ ...form, valor: Number(e.target.value) })}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className={styles.select}
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="discount">Desconto</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Tipo</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className={styles.select}
              >
                <option value="other">Outros</option>
                <option value="project">Projeto</option>
                <option value="discount">Desconto</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Projeto (opcional)</label>
              <select
                value={form.project_id}
                onChange={e => setForm({ ...form, project_id: e.target.value })}
                className={styles.select}
              >
                <option value="">Selecionar projeto</option>
                {(projects || []).map(p => (
                  <option key={p.id} value={p.id}>{p.title || p.titulo || p.nome}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Progresso</label>
              <div className={styles.progressInput}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.progress}
                  onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
                />
                <span>{form.progress}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            onClick={onSave}
            disabled={busy || !form.item || !form.valor}
            className={styles.saveBtn}
          >
            <FaSave /> {editingId ? 'Atualizar' : 'Criar'} Registro
          </button>
          {editingId && (
            <button onClick={cancelEdit} className={styles.cancelBtn}>
              <FaTimes /> Cancelar
            </button>
          )}
        </div>
      </AdminCard>
    </div>
  );
}
