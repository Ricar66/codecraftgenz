// src/admin/AdminMentores.jsx
// Refatorado para usar Design System CodeCraft
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FaUserTie, FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash,
  FaHistory, FaSearch, FaCheck, FaTimes, FaSave, FaUndo,
  FaPhone, FaEnvelope, FaChevronLeft, FaChevronRight, FaUpload
} from 'react-icons/fa';

import { useMentors, MentorsRepo } from '../hooks/useAdminRepo';
import { sanitizeImageUrl } from '../utils/urlSanitize.js';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminMentores.module.css';

export default function AdminMentores() {
  const { data: list, loading, error, refresh } = useMentors();
  const [form, setForm] = useState({
    name: '',
    specialty: '',
    bio: '',
    email: '',
    phone: '',
    photo: '',
    avatar_url: '',
    status: 'published',
    visible: true
  });
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB limit
  const ACCEPT_TYPES = ['image/jpeg','image/png','image/webp','image/jpg','image/pjpeg','image/gif','image/svg+xml'];

  const [query, setQuery] = useState('');
  const [filterSpec, setFilterSpec] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [selected, setSelected] = useState(new Set());
  const [historyOpen, setHistoryOpen] = useState(null);
  const gridRef = useRef(null);
  const fallbackAvatar = '/logo-principal.png';

  const filtered = useMemo(() =>
    (list || []).filter(m =>
      (m.name||'').toLowerCase().includes(query.toLowerCase()) &&
      (!filterSpec || (m.specialty||'').toLowerCase().includes(filterSpec.toLowerCase())) &&
      (!filterStatus || (m.status||'') === filterStatus)
    ), [list, query, filterSpec, filterStatus]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);

  const validate = (data) => {
    const next = {};
    if (!data.name || String(data.name).trim().length < 2) next.name = 'Informe um nome válido';
    if (!data.specialty || String(data.specialty).trim().length < 2) next.specialty = 'Informe a especialidade';
    if (!data.bio || String(data.bio).trim().length < 5) next.bio = 'Descrição muito curta';
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) next.email = 'E-mail inválido';
    if (data.phone && String(data.phone).trim().length < 8) next.phone = 'Telefone incompleto';
    return next;
  };

  useEffect(() => { setErrors(validate(form)); }, [form]);

  const onSave = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await MentorsRepo.upsert({ ...form, id: editingId });
      } else {
        await MentorsRepo.upsert(form);
      }
      setForm({ name: '', specialty: '', bio: '', email: '', phone: '', photo: '', avatar_url: '', status: 'published', visible: true });
      setEditingId(null);
      setToast('Mentor salvo com sucesso!');
      setTimeout(() => setToast(''), 2500);
      refresh();
    } catch (err) {
      setToast('Erro ao salvar mentor');
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const onPhotoFile = async (file) => {
    if (!file) return;
    const isImage = (file.type && file.type.startsWith('image/')) || ACCEPT_TYPES.includes(file.type);
    if (!isImage) {
      alert('Formato inválido. Use imagens (JPEG, PNG, WEBP, GIF, SVG).');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      alert('Imagem muito grande. Máximo de 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setForm(prev => ({ ...prev, photo: String(dataUrl), avatar_url: String(dataUrl) }));
    };
    reader.readAsDataURL(file);
  };

  const toggleVisible = async (m) => {
    await MentorsRepo.toggleVisible(m);
    refresh();
  };

  const onEdit = (m) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      specialty: m.specialty,
      bio: m.bio,
      email: m.email,
      phone: m.phone,
      photo: m.photo || m.avatar_url || '',
      avatar_url: m.avatar_url || '',
      status: m.status || 'draft',
      visible: !!m.visible
    });
    // Scroll to form
    document.getElementById('mentor-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Confirma remover este mentor?')) return;
    await MentorsRepo.delete(id);
    refresh();
  };

  const onUndo = async (id) => {
    await MentorsRepo.undo(id);
    refresh();
  };

  const onToggleSelect = (id, checked) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const onSelectAllPage = (checked) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const m of pageItems) {
        if (checked) next.add(m.id); else next.delete(m.id);
      }
      return next;
    });
  };

  const applyBulkStatus = async (status) => {
    if (selected.size === 0) return;
    if (!window.confirm(`Aplicar status "${status}" a ${selected.size} mentor(es)?`)) return;
    await MentorsRepo.bulkSetStatus(Array.from(selected), status);
    setSelected(new Set());
    refresh();
  };

  const applyBulkVisibility = async (visible) => {
    if (selected.size === 0) return;
    if (!window.confirm(`${visible ? 'Exibir' : 'Ocultar'} ${selected.size} mentor(es)?`)) return;
    await MentorsRepo.bulkSetVisibility(Array.from(selected), visible);
    setSelected(new Set());
    refresh();
  };

  const scrollGrid = (direction) => {
    const el = gridRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 360, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', specialty: '', bio: '', email: '', phone: '', photo: '', avatar_url: '', status: 'published', visible: true });
  };

  // History List Component
  const HistoryList = ({ mentorId }) => {
    const [items, setItems] = useState([]);
    useEffect(() => {
      setItems(MentorsRepo.getHistory(mentorId));
    }, [mentorId]);

    const revertHistory = async (historyId) => {
      if (!window.confirm(`Reverter evento ${historyId}?`)) return;
      const res = await MentorsRepo.revertHistory(historyId);
      if (!res.ok) alert(res.error);
      refresh();
    };

    return (
      <div className={styles.historyList}>
        {items.length === 0 ? (
          <p className={styles.muted}>Sem histórico</p>
        ) : (
          <ul>
            {items.map(h => (
              <li key={h.id} className={styles.historyItem}>
                <span className={styles.historyType}>{h.type}</span>
                <span className={styles.historyDate}>
                  {new Date(h.at).toLocaleString('pt-BR')}
                </span>
                <button
                  onClick={() => revertHistory(h.id)}
                  className={styles.historyBtn}
                >
                  <FaUndo /> Reverter
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando mentores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <AdminCard variant="outlined">
          <div className={styles.errorState}>
            <h3>Erro ao carregar mentores</h3>
            <p>{error}</p>
            <button onClick={refresh} className={styles.retryBtn}>
              Tentar novamente
            </button>
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
          <FaUserTie className={styles.headerIcon} />
          <div>
            <h1>Gestão de Mentores</h1>
            <p>{(list || []).length} mentores cadastrados</p>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.includes('Erro') ? styles.error : styles.success}`}>
          {toast.includes('Erro') ? <FaTimes /> : <FaCheck />}
          {toast}
        </div>
      )}

      {/* Filters */}
      <AdminCard variant="elevated" className={styles.filtersCard}>
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              className={styles.searchInput}
            />
          </div>
          <input
            type="text"
            placeholder="Filtrar especialidade..."
            value={filterSpec}
            onChange={e => { setFilterSpec(e.target.value); setPage(1); }}
            className={styles.input}
          />
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className={styles.select}
          >
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </div>

        {/* Bulk Actions */}
        <div className={styles.bulkActions}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              onChange={e => onSelectAllPage(e.target.checked)}
              checked={pageItems.length > 0 && pageItems.every(m => selected.has(m.id))}
            />
            Selecionar página
          </label>
          {selected.size > 0 && (
            <div className={styles.bulkButtons}>
              <span className={styles.selectedCount}>{selected.size} selecionado(s)</span>
              <button onClick={() => applyBulkStatus('published')} className={styles.bulkBtn}>
                <FaCheck /> Publicar
              </button>
              <button onClick={() => applyBulkStatus('draft')} className={styles.bulkBtnOutline}>
                Rascunho
              </button>
              <button onClick={() => applyBulkVisibility(true)} className={styles.bulkBtn}>
                <FaEye /> Exibir
              </button>
              <button onClick={() => applyBulkVisibility(false)} className={styles.bulkBtnOutline}>
                <FaEyeSlash /> Ocultar
              </button>
            </div>
          )}
        </div>
      </AdminCard>

      {/* Grid Navigation */}
      <div className={styles.gridNav}>
        <button onClick={() => scrollGrid(-1)} className={styles.navBtn}>
          <FaChevronLeft />
        </button>
        <span className={styles.pageInfo}>
          Página {page} de {totalPages} ({filtered.length} mentores)
        </span>
        <button onClick={() => scrollGrid(1)} className={styles.navBtn}>
          <FaChevronRight />
        </button>
      </div>

      {/* Mentors Grid */}
      <div className={styles.mentorsGrid} ref={gridRef}>
        {pageItems.length === 0 ? (
          <AdminCard variant="outlined" className={styles.emptyCard}>
            <div className={styles.emptyState}>
              <FaUserTie className={styles.emptyIcon} />
              <p>Nenhum mentor encontrado</p>
            </div>
          </AdminCard>
        ) : (
          pageItems.map(mentor => (
            <AdminCard key={mentor.id} variant="elevated" className={styles.mentorCard}>
              <div className={styles.cardHeader}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selected.has(mentor.id)}
                    onChange={e => onToggleSelect(mentor.id, e.target.checked)}
                  />
                </label>
                <div className={styles.mentorAvatar}>
                  {(mentor.photo || mentor.avatar_url) ? (
                    <img
                      src={sanitizeImageUrl(mentor.photo || mentor.avatar_url)}
                      alt={mentor.name}
                      onError={(e) => { e.currentTarget.src = fallbackAvatar; }}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {mentor.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <StatusBadge variant={mentor.visible ? 'success' : 'neutral'} size="sm">
                  {mentor.visible ? 'Visível' : 'Oculto'}
                </StatusBadge>
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.mentorName}>{mentor.name}</h3>
                <p className={styles.mentorSpecialty}>{mentor.specialty}</p>

                <div className={styles.contactInfo}>
                  <span><FaPhone /> {mentor.phone || '(00) 00000-0000'}</span>
                  <span><FaEnvelope /> {mentor.email || 'email@exemplo.com'}</span>
                </div>

                <div className={styles.metaInfo}>
                  <StatusBadge variant={mentor.status === 'published' ? 'info' : 'warning'} size="sm">
                    {mentor.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </StatusBadge>
                  {mentor.created_at && (
                    <small>Desde {new Date(mentor.created_at).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}</small>
                  )}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <button onClick={() => onEdit(mentor)} className={styles.editBtn} title="Editar">
                  <FaEdit /> Editar
                </button>
                <button onClick={() => toggleVisible(mentor)} className={styles.visibilityBtn} title={mentor.visible ? 'Ocultar' : 'Exibir'}>
                  {mentor.visible ? <FaEyeSlash /> : <FaEye />}
                </button>
                <button onClick={() => setHistoryOpen(historyOpen === mentor.id ? null : mentor.id)} className={styles.historyBtn} title="Histórico">
                  <FaHistory />
                </button>
                <button onClick={() => onDelete(mentor.id)} className={styles.deleteBtn} title="Remover">
                  <FaTrash />
                </button>
              </div>

              {historyOpen === mentor.id && (
                <div className={styles.historySection}>
                  <HistoryList mentorId={mentor.id} />
                </div>
              )}
            </AdminCard>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className={styles.pageBtn}
        >
          <FaChevronLeft /> Anterior
        </button>
        <div className={styles.pageNumbers}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => setPage(num)}
              className={`${styles.pageBtn} ${page === num ? styles.active : ''}`}
            >
              {num}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={styles.pageBtn}
        >
          Próximo <FaChevronRight />
        </button>
      </div>

      {/* Form Section */}
      <AdminCard variant="elevated" className={styles.formCard} id="mentor-form">
        <h2 className={styles.formTitle}>
          {editingId ? <><FaEdit /> Editar Mentor</> : <><FaPlus /> Novo Mentor</>}
        </h2>

        <div className={styles.formContainer}>
          <div className={styles.formFields}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nome *</label>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  required
                />
                {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
              </div>
              <div className={styles.formGroup}>
                <label>Especialidade *</label>
                <input
                  type="text"
                  placeholder="Ex: Desenvolvimento Web"
                  value={form.specialty}
                  onChange={e => setForm({...form, specialty: e.target.value})}
                  className={`${styles.input} ${errors.specialty ? styles.inputError : ''}`}
                  required
                />
                {errors.specialty && <span className={styles.fieldError}>{errors.specialty}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Bio / Descrição *</label>
              <textarea
                placeholder="Descreva a experiência e atuação do mentor..."
                value={form.bio}
                onChange={e => setForm({...form, bio: e.target.value})}
                className={`${styles.textarea} ${errors.bio ? styles.inputError : ''}`}
                rows="3"
                required
              />
              {errors.bio && <span className={styles.fieldError}>{errors.bio}</span>}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>E-mail</label>
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                />
                {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
              </div>
              <div className={styles.formGroup}>
                <label>Telefone</label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                />
                {errors.phone && <span className={styles.fieldError}>{errors.phone}</span>}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Foto (URL)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.photo}
                  onChange={e => setForm({...form, photo: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Ou envie um arquivo</label>
                <label className={styles.fileUpload}>
                  <FaUpload /> Escolher imagem
                  <input
                    type="file"
                    accept={ACCEPT_TYPES.join(',')}
                    onChange={e => onPhotoFile(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}
                  className={styles.select}
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.visible}
                    onChange={e => setForm({...form, visible: e.target.checked})}
                  />
                  Visível no site
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className={styles.formPreview}>
            <h4>Pré-visualização</h4>
            <div className={styles.previewCard}>
              <div className={styles.previewAvatar}>
                {(form.photo || form.avatar_url) ? (
                  <img
                    src={sanitizeImageUrl(form.photo || form.avatar_url)}
                    alt="Preview"
                    onError={(e) => { e.currentTarget.src = fallbackAvatar; }}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {form.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className={styles.previewInfo}>
                <strong>{form.name || 'Nome do mentor'}</strong>
                <span>{form.specialty || 'Especialidade'}</span>
                <p>{form.bio || 'Descrição curta...'}</p>
              </div>
              <div className={styles.previewContact}>
                <span><FaPhone /> {form.phone || '(00) 00000-0000'}</span>
                <span><FaEnvelope /> {form.email || 'email@exemplo.com'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            onClick={onSave}
            disabled={busy || Object.keys(errors).length > 0}
            className={styles.saveBtn}
          >
            {busy ? 'Salvando...' : <><FaSave /> {editingId ? 'Atualizar' : 'Salvar'}</>}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className={styles.cancelBtn}>
              <FaTimes /> Cancelar
            </button>
          )}
        </div>

        {Object.keys(errors).length > 0 && (
          <div className={styles.errorsList}>
            {Object.values(errors).map((msg, i) => (
              <span key={i} className={styles.errorItem}><FaTimes /> {msg}</span>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
