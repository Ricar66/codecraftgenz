// src/admin/AdminProjetos.jsx
// Refatorado para usar Design System CodeCraft
import React, { useState, useEffect, useMemo } from 'react';
import {
  FaProjectDiagram, FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash,
  FaSearch, FaSave, FaTimes, FaDownload, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

import { useProjects, ProjectsRepo } from '../hooks/useAdminRepo';
import { deleteProject as deleteProjectApi } from '../services/projectsAPI';
import { apiRequest } from '../lib/apiConfig';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminProjetos.module.css';

// Helper function to get price
const getAppPrice = (p) => {
  return Number(p.price ?? p.preco ?? 0);
};

export default function AdminProjetos() {
  const { data: list, loading, error, refresh } = useProjects({ useAdminStore: true });
  const [form, setForm] = useState({
    titulo: '',
    owner: '',
    descricao: '',
    data_inicio: '',
    status: 'rascunho',
    preco: 0,
    progresso: 0,
    thumb_url: '',
    tags: []
  });
  const [notice, setNotice] = useState({ type: '', msg: '' });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const isInvalidUrl = (s) => {
    const v = String(s || '');
    const hasDrive = /^[a-zA-Z]:\\/.test(v);
    const isFile = v.startsWith('file:');
    return hasDrive || isFile;
  };

  const filtered = useMemo(() =>
    (list || []).filter(p =>
      (p.title || p.titulo || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.owner || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.status || '').toLowerCase().includes(query.toLowerCase())
    ), [list, query]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const showNotice = (type, msg) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice({ type: '', msg: '' }), 3000);
  };

  const onSave = async () => {
    try {
      if (!String(form.titulo || '').trim() || !String(form.owner || '').trim()) {
        showNotice('error', 'Preencha título e owner.');
        return;
      }
      if (String(form.descricao || '').length < 10) {
        showNotice('error', 'Descrição muito curta. Adicione mais detalhes.');
        return;
      }
      if (isInvalidUrl(form.thumb_url)) {
        showNotice('error', 'URL de imagem inválida. Use http(s).');
        return;
      }

      const savedProject = await ProjectsRepo.upsert(form);

      // Auto-create app when project is finished
      if ((form.status || '').toLowerCase() === 'finalizado') {
        try {
          const appPayload = {
            name: form.titulo,
            mainFeature: (form.descricao || '').split('.').shift(),
            price: Number(form.preco || 0),
            thumbnail: form.thumb_url || '',
            project_id: savedProject.id || form.id
          };
          await apiRequest(`/api/apps/from-project/${savedProject.id || form.id}`, {
            method: 'POST',
            body: JSON.stringify(appPayload)
          });
        } catch (appErr) {
          console.warn('Erro ao criar app:', appErr);
        }
      }

      setForm({
        titulo: '', owner: '', descricao: '', data_inicio: '',
        status: 'rascunho', preco: 0, progresso: 0, thumb_url: '', tags: []
      });
      showNotice('success', form.id ? 'Projeto atualizado!' : 'Projeto criado!');
      refresh();
    } catch (err) {
      showNotice('error', 'Erro ao salvar: ' + (err.message || 'Falha desconhecida'));
    }
  };

  const onEdit = (p) => {
    setForm({
      id: p.id,
      titulo: p.title || p.titulo || '',
      owner: p.owner || '',
      descricao: p.description || p.descricao || '',
      data_inicio: p.startDate || p.data_inicio || '',
      status: p.status || 'rascunho',
      preco: p.price ?? 0,
      progresso: p.progress ?? p.progresso ?? 0,
      thumb_url: p.thumb_url || '',
      tags: p.tags || []
    });
    document.getElementById('project-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onDelete = async (p) => {
    if (!window.confirm('Deletar este projeto?')) return;
    try {
      await deleteProjectApi(p.id);
      showNotice('success', 'Projeto deletado!');
      refresh();
    } catch (e) {
      showNotice('error', e.message || 'Falha ao deletar');
    }
  };

  const onToggleVisibility = async (p) => {
    const res = await ProjectsRepo.toggleVisible(p);
    if (!res.ok) {
      showNotice('error', res.error || 'Falha ao alternar visibilidade');
    } else {
      showNotice('success', 'Visibilidade atualizada');
      refresh();
    }
  };

  const exportCSV = () => {
    const headers = 'id,title,status,price,startDate,progress\n';
    const rows = filtered.map(p =>
      `${p.id},"${p.title || p.titulo}",${p.status},${p.price || 0},${p.startDate || ''},${p.progress ?? p.progresso ?? 0}`
    ).join('\n');
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projetos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cancelEdit = () => {
    setForm({
      titulo: '', owner: '', descricao: '', data_inicio: '',
      status: 'rascunho', preco: 0, progresso: 0, thumb_url: '', tags: []
    });
  };

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'finalizado': return 'success';
      case 'ongoing': return 'warning';
      default: return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando projetos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <AdminCard variant="outlined">
          <div className={styles.errorState}>
            <h3>Erro ao carregar projetos</h3>
            <p>{error}</p>
            <button onClick={refresh} className={styles.retryBtn}>Tentar novamente</button>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <FaProjectDiagram className={styles.headerIcon} />
          <div>
            <h1>Gestão de Projetos</h1>
            <p>{(list || []).length} projetos cadastrados</p>
          </div>
        </div>
        <button onClick={exportCSV} className={styles.exportBtn}>
          <FaDownload /> Exportar CSV
        </button>
      </header>

      {/* Notice */}
      {notice.msg && (
        <div className={`${styles.notice} ${notice.type === 'error' ? styles.error : styles.success}`}>
          {notice.type === 'error' ? <FaTimes /> : <FaSave />}
          {notice.msg}
        </div>
      )}

      {/* Filters */}
      <AdminCard variant="elevated" className={styles.filtersCard}>
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar (título/owner/status)..."
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.pagination}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={styles.pageBtn}
            >
              <FaChevronLeft />
            </button>
            <span>Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className={styles.pageBtn}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </AdminCard>

      {/* Projects Table */}
      <AdminCard variant="elevated" className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Título</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Preço</th>
                <th>Progresso</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.emptyRow}>
                    <FaProjectDiagram /> Nenhum projeto encontrado
                  </td>
                </tr>
              ) : pageItems.map(p => (
                <tr key={p.id}>
                  <td data-label="Título">
                    <strong>{p.title || p.titulo}</strong>
                  </td>
                  <td data-label="Owner">{p.owner}</td>
                  <td data-label="Status">
                    <StatusBadge variant={getStatusVariant(p.status)}>
                      {p.status}
                    </StatusBadge>
                  </td>
                  <td data-label="Preço">
                    <span className={styles.price}>R$ {getAppPrice(p).toLocaleString('pt-BR')}</span>
                  </td>
                  <td data-label="Progresso">
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${p.progress ?? p.progresso ?? 0}%` }}
                      />
                      <span>{p.progress ?? p.progresso ?? 0}%</span>
                    </div>
                  </td>
                  <td data-label="Ações">
                    <div className={styles.actionBtns}>
                      <button onClick={() => onEdit(p)} className={styles.editBtn} title="Editar">
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => onToggleVisibility(p)}
                        className={styles.visibilityBtn}
                        title={p.status === 'rascunho' ? 'Publicar' : 'Ocultar'}
                      >
                        {p.status === 'rascunho' ? <FaEye /> : <FaEyeSlash />}
                      </button>
                      <button onClick={() => onDelete(p)} className={styles.deleteBtn} title="Deletar">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Form */}
      <AdminCard variant="elevated" className={styles.formCard} id="project-form">
        <h2 className={styles.formTitle}>
          {form.id ? <><FaEdit /> Editar Projeto</> : <><FaPlus /> Novo Projeto</>}
        </h2>

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Título *</label>
              <input
                type="text"
                placeholder="Título do projeto"
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Owner *</label>
              <input
                type="text"
                placeholder="Responsável"
                value={form.owner}
                onChange={e => setForm({ ...form, owner: e.target.value })}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Thumbnail URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={form.thumb_url}
                onChange={e => setForm({ ...form, thumb_url: e.target.value })}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Data de Início</label>
              <input
                type="date"
                value={form.data_inicio}
                onChange={e => setForm({ ...form, data_inicio: e.target.value })}
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
                <option value="rascunho">Rascunho</option>
                <option value="ongoing">Em Andamento</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Preço (R$)</label>
              <input
                type="number"
                placeholder="0"
                value={form.preco}
                onChange={e => setForm({ ...form, preco: Number(e.target.value) })}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Progresso: {form.progresso}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={form.progresso}
                onChange={e => setForm({ ...form, progresso: Number(e.target.value) })}
                className={styles.rangeInput}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Descrição *</label>
            <textarea
              placeholder="Descreva o objetivo e escopo do projeto..."
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
              className={styles.textarea}
              rows="3"
            />
          </div>
        </div>

        {form.preco > 0 && (
          <div className={styles.financeNote}>
            <FaSave /> Registro financeiro será criado: R$ {form.preco.toLocaleString('pt-BR')}
          </div>
        )}

        <div className={styles.formActions}>
          <button onClick={onSave} className={styles.saveBtn}>
            <FaSave /> {form.id ? 'Atualizar' : 'Criar'} Projeto
          </button>
          {form.id && (
            <button onClick={cancelEdit} className={styles.cancelBtn}>
              <FaTimes /> Cancelar
            </button>
          )}
        </div>
      </AdminCard>
    </div>
  );
}
