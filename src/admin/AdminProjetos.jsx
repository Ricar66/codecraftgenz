// src/admin/AdminProjetos.jsx
// Kanban-first management for projects — drives the App pipeline.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, Plus, Pencil, Trash2, Search, Save, X, Download, Upload, Tag,
  Clock, Loader2, CheckCircle2, ArrowRight, ArrowLeft, Package, AlertTriangle,
  User as UserIcon,
} from 'lucide-react';

import { useProjects, ProjectsRepo } from '../hooks/useAdminRepo';
import { deleteProject as deleteProjectApi } from '../services/projectsAPI';
import { getAllApps } from '../services/appsAPI';
import { uploadImage } from '../services/uploadsAPI';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminProjetos.module.css';

const COLUMNS = [
  { id: 'aguardando_start', label: 'Aguardando Start', icon: Clock,        tone: 'neutral' },
  { id: 'em_andamento',     label: 'Em Andamento',     icon: Loader2,      tone: 'warning' },
  { id: 'finalizado',       label: 'Finalizado',       icon: CheckCircle2, tone: 'success' },
];

const emptyForm = {
  titulo: '', owner: '', descricao: '', data_inicio: '',
  status: 'aguardando_start', preco: 0, progresso: 0, thumb_url: '', tags: [],
};

const getProjectName = (p) => p.title || p.titulo || p.nome || '';
const getProjectStatus = (p) => String(p.status || '').toLowerCase();

export default function AdminProjetos() {
  const { data: list, loading, error, refresh } = useProjects({ useAdminStore: true });
  const [apps, setApps] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState({ type: '', msg: '' });
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbUploadBusy, setThumbUploadBusy] = useState(false);
  const [thumbUploadError, setThumbUploadError] = useState('');
  const [query, setQuery] = useState('');
  const [newTag, setNewTag] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmFinalizar, setConfirmFinalizar] = useState(null); // project obj or null
  const [transitionBusy, setTransitionBusy] = useState(null);     // project.id or null

  // Fetch apps once on mount to show "app vinculado" badge on each project card.
  const loadApps = useCallback(async () => {
    try {
      const json = await getAllApps({ page: 1, pageSize: 100 });
      const arr = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      setApps(arr);
    } catch {
      setApps([]);
    }
  }, []);
  useEffect(() => { loadApps(); }, [loadApps]);

  const appByProjectId = useMemo(() => {
    const m = new Map();
    for (const a of apps) {
      const pid = a.project_id ?? a.projectId;
      if (pid != null) m.set(Number(pid), a);
    }
    return m;
  }, [apps]);

  const showNotice = (type, msg) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice({ type: '', msg: '' }), 3500);
  };

  // ---- Validation ----
  const isInvalidUrl = (s) => /^[a-zA-Z]:\\/.test(String(s || '')) || String(s || '').startsWith('file:');

  // ---- Filtering ----
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list || [];
    return (list || []).filter(p =>
      getProjectName(p).toLowerCase().includes(q) ||
      String(p.owner || p.responsavel || '').toLowerCase().includes(q) ||
      (p.tags || p.tecnologias || []).some(t => String(t).toLowerCase().includes(q))
    );
  }, [list, query]);

  // Sort: progress desc inside each column
  const sortProjects = (arr) => [...arr].sort((a, b) => {
    const pa = Number(a.progress ?? a.progresso ?? 0);
    const pb = Number(b.progress ?? b.progresso ?? 0);
    if (pa !== pb) return pb - pa;
    return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
  });

  const columns = useMemo(() => COLUMNS.map(col => ({
    ...col,
    projects: sortProjects(filtered.filter(p => getProjectStatus(p) === col.id)),
  })), [filtered]);

  const stats = useMemo(() => ({
    total: (list || []).length,
    aguardando: (list || []).filter(p => getProjectStatus(p) === 'aguardando_start').length,
    andamento: (list || []).filter(p => getProjectStatus(p) === 'em_andamento').length,
    finalizado: (list || []).filter(p => getProjectStatus(p) === 'finalizado').length,
  }), [list]);

  // ---- Modal: open new ----
  const openNew = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  // ---- Modal: open edit ----
  const openEdit = (p) => {
    setForm({
      id: p.id,
      titulo: getProjectName(p),
      owner: p.owner || p.responsavel || '',
      descricao: p.description || p.descricao || '',
      data_inicio: p.startDate || p.data_inicio || '',
      status: p.status || 'aguardando_start',
      preco: Number(p.price ?? p.preco ?? 0),
      progresso: Number(p.progress ?? p.progresso ?? 0),
      thumb_url: p.thumb_url || p.thumbUrl || '',
      tags: p.tags || p.tecnologias || [],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setNewTag('');
    setThumbFile(null);
    setThumbUploadError('');
  };

  // ---- Tag handlers ----
  const addTag = () => {
    const tag = newTag.trim().toUpperCase();
    if (tag && !form.tags.includes(tag)) {
      setForm(s => ({ ...s, tags: [...s.tags, tag] }));
    }
    setNewTag('');
  };
  const removeTag = (tagToRemove) => {
    setForm(s => ({ ...s, tags: s.tags.filter(t => t !== tagToRemove) }));
  };

  // ---- Save ----
  const onSave = async () => {
    if (!String(form.titulo || '').trim() || !String(form.owner || '').trim()) {
      showNotice('error', 'Preencha título e owner.');
      return;
    }
    if (String(form.descricao || '').length < 10) {
      showNotice('error', 'Descrição muito curta.');
      return;
    }
    if (isInvalidUrl(form.thumb_url)) {
      showNotice('error', 'URL de imagem inválida (use http(s)).');
      return;
    }
    const res = await ProjectsRepo.upsert(form);
    if (res?.ok === false) {
      showNotice('error', res.error || 'Falha ao salvar.');
      return;
    }
    showNotice('success', form.id ? 'Projeto atualizado.' : 'Projeto criado.');
    closeModal();
    refresh();
    loadApps();
  };

  // ---- Delete ----
  const onDelete = async (p) => {
    if (!window.confirm(`Deletar o projeto "${getProjectName(p)}"?\nO App vinculado (se houver) NÃO será deletado, mas perderá a referência.`)) return;
    try {
      await deleteProjectApi(p.id);
      showNotice('success', 'Projeto deletado.');
      refresh();
      loadApps();
    } catch (e) {
      showNotice('error', e.message || 'Falha ao deletar.');
    }
  };

  // ---- Quick transitions ----
  // aguardando_start → em_andamento  : just bump
  // em_andamento → finalizado        : CONFIRM (auto-creates App)
  // finalizado → em_andamento        : back (manual rollback)
  const transition = async (p, nextStatus) => {
    if (nextStatus === 'finalizado') {
      setConfirmFinalizar(p);
      return;
    }
    setTransitionBusy(p.id);
    const res = await ProjectsRepo.update(p.id, { status: nextStatus });
    setTransitionBusy(null);
    if (res?.ok === false) {
      showNotice('error', res.error || 'Falha na transição.');
      return;
    }
    showNotice('success', nextStatus === 'em_andamento' ? 'Iniciado.' : 'Status atualizado.');
    refresh();
    loadApps();
  };

  const finalizar = async () => {
    const p = confirmFinalizar;
    if (!p) return;
    setTransitionBusy(p.id);
    const res = await ProjectsRepo.update(p.id, { status: 'finalizado' });
    setTransitionBusy(null);
    setConfirmFinalizar(null);
    if (res?.ok === false) {
      showNotice('error', res.error || 'Falha ao finalizar.');
      return;
    }
    showNotice('success', 'Projeto finalizado. App em "revisar" foi criado em /admin/aplicativos.');
    refresh();
    setTimeout(loadApps, 500); // give backend a moment to insert the App row
  };

  // ---- CSV export ----
  const exportCSV = () => {
    const headers = 'id,nome,owner,status,progresso,app_vinculado,app_status\n';
    const rows = (list || []).map(p => {
      const app = appByProjectId.get(Number(p.id));
      return [
        p.id,
        `"${getProjectName(p)}"`,
        `"${p.owner || p.responsavel || ''}"`,
        p.status,
        p.progress ?? p.progresso ?? 0,
        app ? `"${app.name}"` : '',
        app ? app.status : '',
      ].join(',');
    }).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projetos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Thumb upload ----
  const handleThumbnailUpload = async () => {
    if (!thumbFile) return;
    try {
      setThumbUploadBusy(true);
      setThumbUploadError('');
      const r = await uploadImage(thumbFile, form.thumb_url || undefined, 'projetos');
      const imageUrl = r?.data?.url || r?.url;
      if (imageUrl) {
        setForm(s => ({ ...s, thumb_url: imageUrl }));
        showNotice('success', 'Thumbnail enviada.');
      } else {
        setThumbUploadError('Upload ok mas URL não retornada.');
      }
      setThumbFile(null);
    } catch (e) {
      setThumbUploadError(e.message || 'Falha no upload.');
    } finally {
      setThumbUploadBusy(false);
    }
  };

  // ---- Render states ----
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
          <Network className={styles.headerIcon} />
          <div>
            <h1>Gestão de Projetos</h1>
            <p>Esta página manda no negócio. Apps nascem aqui quando um projeto é finalizado.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button onClick={exportCSV} className={styles.ghostBtn} title="Exportar CSV">
            <Download size={16} /> CSV
          </button>
          <button onClick={openNew} className={styles.exportBtn}>
            <Plus size={16} /> Novo Projeto
          </button>
        </div>
      </header>

      {/* Stats inline */}
      <div className={styles.statsRow}>
        <StatPill label="Total"            value={stats.total}      tone="neutral" />
        <StatPill label="Aguardando"       value={stats.aguardando} tone="info"    icon={Clock} />
        <StatPill label="Em Andamento"     value={stats.andamento}  tone="warning" icon={Loader2} />
        <StatPill label="Finalizados"      value={stats.finalizado} tone="success" icon={CheckCircle2} />
      </div>

      {/* Notice */}
      <AnimatePresence>
        {notice.msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`${styles.notice} ${notice.type === 'error' ? styles.error : styles.success}`}
          >
            {notice.type === 'error' ? <X size={18} /> : <Save size={18} />}
            {notice.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por nome, owner ou tag..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Kanban */}
      <div className={styles.kanban}>
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            getApp={(p) => appByProjectId.get(Number(p.id))}
            onEdit={openEdit}
            onDelete={onDelete}
            onTransition={transition}
            transitionBusy={transitionBusy}
          />
        ))}
      </div>

      {/* Modal: create / edit */}
      <AnimatePresence>
        {modalOpen && (
          <ProjectModal
            form={form}
            setForm={setForm}
            newTag={newTag}
            setNewTag={setNewTag}
            addTag={addTag}
            removeTag={removeTag}
            thumbFile={thumbFile}
            setThumbFile={setThumbFile}
            thumbUploadBusy={thumbUploadBusy}
            thumbUploadError={thumbUploadError}
            setThumbUploadError={setThumbUploadError}
            onUploadThumb={handleThumbnailUpload}
            onClose={closeModal}
            onSave={onSave}
          />
        )}
      </AnimatePresence>

      {/* Confirmation: finalize */}
      <AnimatePresence>
        {confirmFinalizar && (
          <ConfirmModal
            project={confirmFinalizar}
            onCancel={() => setConfirmFinalizar(null)}
            onConfirm={finalizar}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------- Sub-components ------------------------- */

function StatPill({ label, value, tone = 'neutral', icon: Icon }) {
  return (
    <div className={`${styles.statPill} ${styles[`pillTone_${tone}`]}`}>
      {Icon && <Icon size={16} />}
      <span className={styles.statPillValue}>{value}</span>
      <span className={styles.statPillLabel}>{label}</span>
    </div>
  );
}

function KanbanColumn({ column, getApp, onEdit, onDelete, onTransition, transitionBusy }) {
  const { id, label, icon: Icon, projects, tone } = column;
  const PAGE = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE));

  // Clamp page back to range when projects shrink (transition out of this column)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const slice = projects.slice((page - 1) * PAGE, page * PAGE);

  return (
    <section className={`${styles.kanbanCol} ${styles[`colTone_${tone}`]}`}>
      <header className={styles.kanbanColHeader}>
        <span className={styles.kanbanColTitle}>
          <Icon size={15} /> {label}
        </span>
        <span className={styles.kanbanColCount}>{projects.length}</span>
      </header>

      {totalPages > 1 && (
        <div className={styles.kanbanColPager}>
          <button
            className={styles.pagerBtn}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            title="Página anterior"
          >
            <ArrowLeft size={14} /> Anterior
          </button>
          <span className={styles.pagerLabel}>
            Página {page} de {totalPages}
          </span>
          <button
            className={styles.pagerBtn}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            title="Próxima página"
          >
            Próxima <ArrowRight size={14} />
          </button>
        </div>
      )}

      <div className={styles.kanbanColBody}>
        {projects.length === 0 ? (
          <div className={styles.kanbanColEmpty}>
            <Package size={22} />
            <span>Vazio</span>
          </div>
        ) : (
          <AnimatePresence>
            {slice.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                app={getApp(p)}
                columnId={id}
                onEdit={() => onEdit(p)}
                onDelete={() => onDelete(p)}
                onTransition={(next) => onTransition(p, next)}
                busy={transitionBusy === p.id}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

function ProjectCard({ project, app, columnId, onEdit, onDelete, onTransition, busy }) {
  const name = getProjectName(project);
  const owner = project.owner || project.responsavel || '—';
  const progress = Number(project.progress ?? project.progresso ?? 0);
  const tags = project.tags || project.tecnologias || [];
  const thumb = project.thumb_url || project.thumbUrl || null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className={styles.projectCard}
    >
      <div className={styles.cardThumb}>
        {thumb ? (
          <img src={thumb} alt={name} loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div className={styles.cardThumbPlaceholder}>
            <Network size={22} />
          </div>
        )}
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle} title={name}>{name}</h3>

        <div className={styles.cardMeta}>
          <span className={styles.cardOwner}>
            <UserIcon size={11} /> {owner}
          </span>
        </div>

        {/* Progress */}
        <div className={styles.cardProgress}>
          <div className={styles.cardProgressBar}>
            <div
              className={styles.cardProgressFill}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          <span className={styles.cardProgressLabel}>{progress}%</span>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className={styles.cardTags}>
            {tags.slice(0, 4).map((t, i) => (
              <span key={i} className={styles.cardTagChip}>{t}</span>
            ))}
            {tags.length > 4 && <span className={styles.cardTagMore}>+{tags.length - 4}</span>}
          </div>
        )}

        {/* App link badge (only when finalized + app exists) */}
        {app && (
          <div className={styles.cardAppLink}>
            <Package size={11} />
            <span>App:</span>
            <a href="/admin/aplicativos" className={styles.cardAppName}>{app.name}</a>
            <StatusBadge variant={app.status === 'publicar' ? 'success' : 'warning'}>
              {app.status === 'publicar' ? 'Publicar' : 'Revisar'}
            </StatusBadge>
          </div>
        )}
        {columnId === 'finalizado' && !app && (
          <div className={`${styles.cardAppLink} ${styles.cardAppLinkMissing}`}>
            <AlertTriangle size={11} />
            <span>App não foi criado — re-finalize ou crie manualmente</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <footer className={styles.cardActions}>
        {/* Transition buttons */}
        {columnId === 'aguardando_start' && (
          <button
            className={styles.cardTransitionPrimary}
            onClick={() => onTransition('em_andamento')}
            disabled={busy}
            title="Iniciar projeto"
          >
            {busy ? <Loader2 size={12} className={styles.spinIcon} /> : <ArrowRight size={12} />}
            Iniciar
          </button>
        )}
        {columnId === 'em_andamento' && (
          <button
            className={styles.cardTransitionSuccess}
            onClick={() => onTransition('finalizado')}
            disabled={busy}
            title="Finalizar projeto (cria App em revisar)"
          >
            {busy ? <Loader2 size={12} className={styles.spinIcon} /> : <CheckCircle2 size={12} />}
            Finalizar
          </button>
        )}
        {columnId === 'finalizado' && (
          <button
            className={styles.cardTransitionGhost}
            onClick={() => onTransition('em_andamento')}
            disabled={busy}
            title="Voltar para em andamento (mantém App)"
          >
            {busy ? <Loader2 size={12} className={styles.spinIcon} /> : <ArrowLeft size={12} />}
            Reabrir
          </button>
        )}

        <button onClick={onEdit} className={styles.cardIconBtn} title="Editar">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className={styles.cardIconBtnDanger} title="Deletar">
          <Trash2 size={13} />
        </button>
      </footer>
    </motion.article>
  );
}

function ProjectModal({
  form, setForm, newTag, setNewTag, addTag, removeTag,
  thumbFile, setThumbFile, thumbUploadBusy, thumbUploadError,
  setThumbUploadError, onUploadThumb, onClose, onSave,
}) {
  const editing = !!form.id;
  const handleTagKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  return (
    <motion.div
      className={styles.modalBackdrop}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
      >
        <header className={styles.modalHead}>
          <h2>{editing ? <><Pencil size={18} /> Editar Projeto</> : <><Plus size={18} /> Novo Projeto</>}</h2>
          <button onClick={onClose} className={styles.modalClose}><X size={18} /></button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Título *</label>
              <input
                type="text"
                placeholder="Nome do projeto"
                value={form.titulo}
                onChange={e => setForm(s => ({ ...s, titulo: e.target.value }))}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Owner *</label>
              <input
                type="text"
                placeholder="Responsável"
                value={form.owner}
                onChange={e => setForm(s => ({ ...s, owner: e.target.value }))}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Descrição *</label>
            <textarea
              placeholder="O que esse projeto faz, escopo, objetivos..."
              value={form.descricao}
              onChange={e => setForm(s => ({ ...s, descricao: e.target.value }))}
              className={styles.textarea}
              rows="3"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Data de Início</label>
              <input
                type="date"
                value={form.data_inicio}
                onChange={e => setForm(s => ({ ...s, data_inicio: e.target.value }))}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Status</label>
              <select
                value={form.status}
                onChange={e => setForm(s => ({ ...s, status: e.target.value }))}
                className={styles.select}
              >
                <option value="aguardando_start">Aguardando Start</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Preço (R$)</label>
              <input
                type="number"
                placeholder="0"
                value={form.preco}
                onChange={e => setForm(s => ({ ...s, preco: Number(e.target.value) }))}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Progresso: {form.progresso}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={form.progresso}
              onChange={e => setForm(s => ({ ...s, progresso: Number(e.target.value) }))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Thumbnail (URL ou Upload)</label>
            <input
              type="url"
              placeholder="https://..."
              value={form.thumb_url}
              onChange={e => setForm(s => ({ ...s, thumb_url: e.target.value }))}
              className={styles.input}
            />
            <div className={styles.uploadRow} style={{ marginTop: 8 }}>
              <label className={styles.fileUpload}>
                <Upload size={14} /> {thumbFile ? thumbFile.name : 'Enviar imagem'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  onChange={e => { setThumbFile(e.target.files?.[0] || null); setThumbUploadError(''); }}
                />
              </label>
              <button onClick={onUploadThumb} disabled={thumbUploadBusy || !thumbFile} className={styles.uploadBtn}>
                {thumbUploadBusy ? 'Enviando...' : <><Upload size={14} /> Enviar</>}
              </button>
            </div>
            {thumbUploadError && <span className={styles.uploadError}>{thumbUploadError}</span>}
          </div>

          <div className={styles.formGroup}>
            <label><Tag size={12} style={{ display: 'inline', marginRight: 4 }} /> Tecnologias</label>
            <div className={styles.tagsContainer}>
              {form.tags.map((tag, idx) => (
                <span key={idx} className={styles.tag}>
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className={styles.tagRemove} title="Remover">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className={styles.tagInput}>
              <input
                type="text"
                placeholder="React, Node.js, Python..."
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={handleTagKey}
                className={styles.input}
              />
              <button type="button" onClick={addTag} className={styles.addTagBtn}>
                <Plus size={13} /> Adicionar
              </button>
            </div>
            <small className={styles.hint}>Enter para adicionar rápido</small>
          </div>

          {form.preco > 0 && (
            <div className={styles.financeNote}>
              <Save size={14} /> Registro financeiro: R$ {Number(form.preco).toLocaleString('pt-BR')}
            </div>
          )}
        </div>

        <footer className={styles.modalFoot}>
          <button onClick={onClose} className={styles.cancelBtn}>
            <X size={14} /> Cancelar
          </button>
          <button onClick={onSave} className={styles.saveBtn}>
            <Save size={14} /> {editing ? 'Atualizar' : 'Criar'}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}

function ConfirmModal({ project, onCancel, onConfirm }) {
  return (
    <motion.div
      className={styles.modalBackdrop}
      onClick={onCancel}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.modalSmall}
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
      >
        <div className={styles.confirmHead}>
          <div className={styles.confirmIcon}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h3>Finalizar projeto?</h3>
            <p>
              <strong>{getProjectName(project)}</strong> será marcado como finalizado e
              um <strong>App em "Revisar"</strong> será criado automaticamente em /admin/aplicativos
              (herda nome, descrição e thumbnail).
            </p>
          </div>
        </div>
        <div className={styles.modalFoot}>
          <button onClick={onCancel} className={styles.cancelBtn}>
            <X size={14} /> Cancelar
          </button>
          <button onClick={onConfirm} className={styles.saveBtn}>
            <CheckCircle2 size={14} /> Finalizar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
