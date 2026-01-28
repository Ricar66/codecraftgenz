// src/admin/AdminDesafios.jsx
// Refatorado para usar Design System CodeCraft
import React, { useState, useEffect, useMemo } from 'react';
import {
  FaBullseye, FaPlus, FaEdit, FaEye, FaEyeSlash, FaLock, FaUnlock,
  FaSearch, FaSave, FaTimes, FaDownload, FaChevronLeft, FaChevronRight,
  FaInfoCircle, FaCheck
} from 'react-icons/fa';

import { useDesafios, DesafiosRepo } from '../hooks/useAdminRepo';
import { apiRequest } from '../lib/apiConfig';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminDesafios.module.css';

export default function AdminDesafios() {
  const { data: list, loading, error, refresh } = useDesafios();
  const [form, setForm] = useState({
    name: '', objective: '', description: '', deadline: '',
    difficulty: 'starter', tags: [], reward: '', base_points: 0,
    delivery_type: 'link', thumb_url: '', status: 'draft', visible: true
  });
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [toast, setToast] = useState('');

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(() =>
    (list || []).filter(d =>
      (d.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (d.objective || '').toLowerCase().includes(query.toLowerCase()) ||
      (d.status || '').toLowerCase().includes(query.toLowerCase())
    ), [list, query]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const onEdit = (d) => {
    setEditingId(d.id);
    setForm({
      id: d.id,
      name: d.name,
      objective: d.objective || '',
      description: d.description || '',
      deadline: d.deadline || '',
      difficulty: d.difficulty || 'starter',
      tags: Array.isArray(d.tags) ? d.tags : [],
      reward: d.reward || '',
      base_points: Number(d.base_points ?? 0),
      delivery_type: d.delivery_type || 'link',
      thumb_url: d.thumb_url || '',
      status: d.status || 'draft',
      visible: !!d.visible
    });
    document.getElementById('desafio-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleVisible = async (d) => {
    setBusy(true);
    try {
      await apiRequest(`/api/desafios/${d.id}/visibility`, {
        method: 'PUT',
        body: JSON.stringify({ visible: !d.visible })
      });
      showToast('Visibilidade atualizada!');
      refresh();
    } finally { setBusy(false); }
  };

  const toggleStatus = async (d) => {
    setBusy(true);
    try {
      const next = d.status === 'closed' ? 'active' : 'closed';
      await DesafiosRepo.setStatus(d.id, next);
      showToast(`Desafio ${next === 'closed' ? 'encerrado' : 'reaberto'}!`);
      refresh();
    } finally { setBusy(false); }
  };

  const fetchDetails = async (id) => {
    setDetailsLoading(true);
    try {
      const json = await apiRequest(`/api/desafios/${id}`, { method: 'GET' });
      setDetails(json?.data?.challenge || json?.challenge || json);
    } catch {
      setDetails(null);
    } finally { setDetailsLoading(false); }
  };

  const openDetails = async (d) => {
    const next = detailsOpen === d.id ? null : d.id;
    setDetailsOpen(next);
    setDetails(null);
    if (next) await fetchDetails(next);
  };

  const onSave = async () => {
    setBusy(true);
    try {
      const payload = editingId ? { ...form, id: editingId } : form;
      await DesafiosRepo.upsert(payload);
      setEditingId(null);
      setForm({
        name: '', objective: '', description: '', deadline: '',
        difficulty: 'starter', tags: [], reward: '', base_points: 0,
        delivery_type: 'link', thumb_url: '', status: 'draft', visible: true
      });
      showToast(editingId ? 'Desafio atualizado!' : 'Desafio criado!');
      refresh();
    } finally { setBusy(false); }
  };

  const reviewSubmission = async (submissionId, status, score) => {
    setBusy(true);
    try {
      await DesafiosRepo.reviewSubmission(submissionId, {
        status,
        score,
        review: { notes: '', criteria_scores: {} }
      });
      await fetchDetails(detailsOpen);
      showToast('Submissão avaliada!');
    } finally { setBusy(false); }
  };

  const exportCSV = () => {
    const headers = 'id,name,objective,status,visible,deadline,base_points\n';
    const rows = filtered.map(d =>
      `${d.id},"${d.name}","${d.objective}",${d.status},${d.visible},${d.deadline || ''},${d.base_points || 0}`
    ).join('\n');
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'desafios.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      name: '', objective: '', description: '', deadline: '',
      difficulty: 'starter', tags: [], reward: '', base_points: 0,
      delivery_type: 'link', thumb_url: '', status: 'draft', visible: true
    });
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'closed': return 'error';
      case 'archived': return 'neutral';
      default: return 'warning';
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando desafios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <FaBullseye className={styles.headerIcon} />
          <div>
            <h1>Gestão de Desafios</h1>
            <p>{(list || []).length} desafios cadastrados</p>
          </div>
        </div>
        <button onClick={exportCSV} className={styles.exportBtn}>
          <FaDownload /> Exportar CSV
        </button>
      </header>

      {/* Toast */}
      {toast && (
        <div className={styles.toast}>
          <FaCheck /> {toast}
        </div>
      )}

      {/* Filters */}
      <AdminCard variant="elevated" className={styles.filtersCard}>
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar (nome/objetivo/status)..."
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              className={styles.searchInput}
            />
          </div>
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

      {/* Desafios Grid */}
      <div className={styles.desafiosGrid}>
        {pageItems.length === 0 ? (
          <AdminCard variant="outlined" className={styles.emptyCard}>
            <div className={styles.emptyState}>
              <FaBullseye className={styles.emptyIcon} />
              <p>Nenhum desafio encontrado</p>
            </div>
          </AdminCard>
        ) : pageItems.map(d => (
          <AdminCard key={d.id} variant="elevated" className={styles.desafioCard}>
            <div className={styles.cardHeader}>
              <h3>{d.name}</h3>
              <StatusBadge variant={getStatusVariant(d.status)}>{d.status}</StatusBadge>
            </div>

            <p className={styles.objective}>{d.objective || 'Sem objetivo definido'}</p>

            <div className={styles.cardMeta}>
              <span><FaBullseye /> {d.base_points ?? 0} pts</span>
              <span>{d.deadline ? new Date(d.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
              <StatusBadge variant={d.visible ? 'info' : 'neutral'} size="sm">
                {d.visible ? 'Visível' : 'Oculto'}
              </StatusBadge>
            </div>

            <div className={styles.cardActions}>
              <button onClick={() => onEdit(d)} className={styles.editBtn} title="Editar">
                <FaEdit />
              </button>
              <button onClick={() => toggleVisible(d)} disabled={busy} className={styles.visibilityBtn} title={d.visible ? 'Ocultar' : 'Exibir'}>
                {d.visible ? <FaEyeSlash /> : <FaEye />}
              </button>
              <button onClick={() => toggleStatus(d)} disabled={busy} className={styles.statusBtn} title={d.status === 'closed' ? 'Reabrir' : 'Encerrar'}>
                {d.status === 'closed' ? <FaUnlock /> : <FaLock />}
              </button>
              <button onClick={() => openDetails(d)} className={styles.detailsBtn} title="Detalhes">
                <FaInfoCircle />
              </button>
            </div>

            {/* Details Section */}
            {detailsOpen === d.id && (
              <div className={styles.detailsSection}>
                {detailsLoading ? (
                  <p>Carregando detalhes...</p>
                ) : details ? (
                  <div className={styles.detailsGrid}>
                    <div>
                      <h4>Inscrições ({details.registrations?.length || 0})</h4>
                      {details.registrations?.length > 0 ? (
                        <ul className={styles.detailsList}>
                          {details.registrations.map(r => (
                            <li key={r.id}>
                              <span>Crafter #{r.crafter_id}</span>
                              <small>{new Date(r.at).toLocaleDateString('pt-BR')}</small>
                            </li>
                          ))}
                        </ul>
                      ) : <p className={styles.muted}>Nenhuma inscrição</p>}
                    </div>
                    <div>
                      <h4>Entregas ({details.submissions?.length || 0})</h4>
                      {details.submissions?.length > 0 ? (
                        <ul className={styles.submissionsList}>
                          {details.submissions.map(s => (
                            <li key={s.id} className={styles.submissionItem}>
                              <div>
                                <strong>Crafter #{s.crafter_id}</strong>
                                <small>{s.delivery?.url || '-'}</small>
                              </div>
                              <StatusBadge variant={s.status === 'approved' ? 'success' : s.status === 'rejected' ? 'error' : 'warning'} size="sm">
                                {s.status || 'submitted'}
                              </StatusBadge>
                              <span className={styles.score}>{s.score ?? 0} pts</span>
                              <div className={styles.reviewActions}>
                                <select defaultValue={s.status || 'submitted'} id={`status-${s.id}`} className={styles.selectSm}>
                                  <option value="approved">Aprovar</option>
                                  <option value="rejected">Reprovar</option>
                                </select>
                                <input type="number" placeholder="pts" defaultValue={s.score ?? details.base_points ?? 0} id={`pts-${s.id}`} className={styles.inputSm} />
                                <button
                                  onClick={() => {
                                    const st = document.getElementById(`status-${s.id}`)?.value || 'approved';
                                    const pts = Number(document.getElementById(`pts-${s.id}`)?.value || 0);
                                    reviewSubmission(s.id, st, pts);
                                  }}
                                  disabled={busy}
                                  className={styles.reviewBtn}
                                >
                                  Revisar
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : <p className={styles.muted}>Nenhuma entrega</p>}
                    </div>
                  </div>
                ) : <p className={styles.muted}>Erro ao carregar detalhes</p>}
              </div>
            )}
          </AdminCard>
        ))}
      </div>

      {/* Form */}
      <AdminCard variant="elevated" className={styles.formCard} id="desafio-form">
        <h2 className={styles.formTitle}>
          {editingId ? <><FaEdit /> Editar Desafio</> : <><FaPlus /> Novo Desafio</>}
        </h2>

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nome *</label>
              <input type="text" placeholder="Nome do desafio" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Objetivo</label>
              <input type="text" placeholder="Objetivo principal" value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} className={styles.input} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Descrição</label>
            <textarea placeholder="Descrição detalhada..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={styles.textarea} rows="3" />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Deadline</label>
              <input type="datetime-local" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Dificuldade</label>
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className={styles.select}>
                <option value="starter">Starter</option>
                <option value="intermediate">Intermediário</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Base Points</label>
              <input type="number" min="0" value={form.base_points} onChange={e => setForm({ ...form, base_points: Number(e.target.value) })} className={styles.input} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Recompensa</label>
              <input type="text" placeholder="Ex: Badge exclusiva" value={form.reward} onChange={e => setForm({ ...form, reward: e.target.value })} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Tipo de Entrega</label>
              <select value={form.delivery_type} onChange={e => setForm({ ...form, delivery_type: e.target.value })} className={styles.select}>
                <option value="link">Link</option>
                <option value="github">GitHub</option>
                <option value="file">Arquivo</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={styles.select}>
                <option value="draft">Rascunho</option>
                <option value="active">Ativo</option>
                <option value="closed">Encerrado</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Tags (separadas por vírgula)</label>
              <input
                type="text"
                placeholder="react, frontend, api"
                value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
                onChange={e => setForm({ ...form, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Thumbnail URL</label>
              <input type="url" placeholder="https://..." value={form.thumb_url} onChange={e => setForm({ ...form, thumb_url: e.target.value })} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })} />
                Visível no site
              </label>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button onClick={onSave} disabled={busy || !form.name} className={styles.saveBtn}>
            <FaSave /> {editingId ? 'Atualizar' : 'Criar'} Desafio
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
