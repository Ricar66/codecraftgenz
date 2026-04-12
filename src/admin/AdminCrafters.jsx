// src/admin/AdminCrafters.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Search, Pencil, Trash2, Star, Plus, X, Github, Linkedin, ToggleLeft, ToggleRight } from 'lucide-react';

import { useCrafters, CraftersRepo } from '../hooks/useAdminRepo';
import { useToast } from '../components/UI/Toast';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminCrafters.module.css';

const SKILL_OPTIONS = [
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Node.js',
  'Python', 'Java', 'Go', 'Docker', 'SQL', 'AWS', 'Figma', 'Flutter',
  'Kotlin', 'Next.js', 'PHP', 'C#', 'Ruby', 'Rust',
];

const EMPTY_FORM = {
  nome: '',
  email: '',
  bio: '',
  github_url: '',
  linkedin_url: '',
  skills: [],
  user_id: '',
  active: true,
};

function CrafterModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const isEdit = !!initial?.id;

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleSkill = (skill) => {
    set('skills', form.skills.includes(skill)
      ? form.skills.filter(s => s !== skill)
      : [...form.skills, skill]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    const payload = {
      nome: form.nome.trim(),
      email: form.email.trim() || undefined,
      bio: form.bio.trim() || undefined,
      github_url: form.github_url.trim() || undefined,
      linkedin_url: form.linkedin_url.trim() || undefined,
      skills: form.skills.length > 0 ? form.skills : undefined,
      active: form.active,
    };
    if (!isEdit && form.user_id) payload.user_id = Number(form.user_id);
    onSave(payload);
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? 'Editar Crafter' : 'Novo Crafter'}</h2>
          <button className={styles.modalClose} onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Nome *</label>
              <input
                className={styles.fieldInput}
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Nome do crafter"
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>E-mail</label>
              <input
                className={styles.fieldInput}
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Bio</label>
            <textarea
              className={styles.fieldTextarea}
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              placeholder="Sobre o crafter..."
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}><Github size={13} /> GitHub URL</label>
              <input
                className={styles.fieldInput}
                value={form.github_url}
                onChange={e => set('github_url', e.target.value)}
                placeholder="https://github.com/usuario"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}><Linkedin size={13} /> LinkedIn URL</label>
              <input
                className={styles.fieldInput}
                value={form.linkedin_url}
                onChange={e => set('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/usuario"
              />
            </div>
          </div>

          {!isEdit && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>ID do Usuário (opcional)</label>
              <input
                className={styles.fieldInput}
                type="number"
                value={form.user_id}
                onChange={e => set('user_id', e.target.value)}
                placeholder="Vincular a um usuário existente"
              />
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Tecnologias / Skills</label>
            <div className={styles.skillsGrid}>
              {SKILL_OPTIONS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  className={`${styles.skillChip} ${form.skills.includes(skill) ? styles.skillChipActive : ''}`}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroupRow}>
            <label className={styles.fieldLabel}>Status</label>
            <button
              type="button"
              className={`${styles.toggleBtn} ${form.active ? styles.toggleBtnOn : styles.toggleBtnOff}`}
              onClick={() => set('active', !form.active)}
            >
              {form.active
                ? <><ToggleRight size={22} /> Ativo</>
                : <><ToggleLeft size={22} /> Inativo</>
              }
            </button>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnSave} disabled={saving || !form.nome.trim()}>
              {saving ? 'Salvando...' : (isEdit ? 'Salvar Alterações' : 'Criar Crafter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminCrafters() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('pontos');
  const [sortDirection, setSortDirection] = useState('desc');
  const [activeFilter, setActiveFilter] = useState('all');
  const [modalState, setModalState] = useState(null); // null | { mode: 'create' | 'edit', crafter?: {} }
  const [saving, setSaving] = useState(false);

  const searchOptions = useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    active_only: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
    order_by: sortBy,
    order_direction: sortDirection,
  }), [currentPage, itemsPerPage, searchTerm, activeFilter, sortBy, sortDirection]);

  const { crafters, pagination, loading, error, reload, loadPage } = useCrafters(searchOptions);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter, sortBy, sortDirection]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadPage(page);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (modalState.mode === 'edit') {
        const result = await CraftersRepo.update(modalState.crafter.id, payload);
        if (result.ok) {
          toast.success('Crafter atualizado!');
          setModalState(null);
          reload();
        } else {
          toast.error(result.error || 'Erro ao atualizar');
        }
      } else {
        const result = await CraftersRepo.create(payload);
        if (result.ok) {
          toast.success('Crafter criado!');
          setModalState(null);
          reload();
        } else {
          toast.error(result.error || 'Erro ao criar');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (crafter) => {
    const result = await CraftersRepo.update(crafter.id, { active: !crafter.active });
    if (result.ok) {
      toast.success(crafter.active ? 'Crafter desativado' : 'Crafter ativado');
      reload();
    } else {
      toast.error(result.error || 'Erro ao alterar status');
    }
  };

  const handleDelete = async (crafterId) => {
    if (!window.confirm('Tem certeza que deseja excluir este crafter?')) return;
    const result = await CraftersRepo.delete(crafterId);
    if (result.ok) {
      toast.success('Crafter excluído');
      reload();
    } else {
      toast.error(result.error || 'Erro ao excluir');
    }
  };

  const openEdit = (crafter) => {
    setModalState({
      mode: 'edit',
      crafter: {
        id: crafter.id,
        nome: crafter.nome || '',
        email: crafter.email || '',
        bio: crafter.bio || '',
        github_url: crafter.github_url || '',
        linkedin_url: crafter.linkedin_url || '',
        skills: crafter.skills || [],
        active: crafter.active !== false,
      },
    });
  };

  if (loading && crafters.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando crafters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <AdminCard variant="outlined">
          <div className={styles.errorState}>
            <h3>Erro ao carregar crafters</h3>
            <p>{error}</p>
            <button onClick={reload} className={styles.retryBtn}>Tentar novamente</button>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Modal Create/Edit */}
      {modalState && (
        <CrafterModal
          initial={modalState.mode === 'edit' ? modalState.crafter : undefined}
          onSave={handleSave}
          onClose={() => setModalState(null)}
          saving={saving}
        />
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Users className={styles.headerIcon} />
          <div>
            <h1>Gerenciar Crafters</h1>
            <p>Total: {pagination.total ?? 0} | Página {pagination.page ?? 1} de {pagination.totalPages ?? 1}</p>
          </div>
        </div>
        <button className={styles.createBtn} onClick={() => setModalState({ mode: 'create' })}>
          <Plus size={16} /> Novo Crafter
        </button>
      </header>

      {/* Filtros */}
      <section className={styles.filters}>
        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className={styles.filterSelect}>
            <option value="all">Todos</option>
            <option value="active">Apenas ativos</option>
            <option value="inactive">Apenas inativos</option>
          </select>

          <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className={styles.filterSelect}>
            <option value={5}>5 por página</option>
            <option value={10}>10 por página</option>
            <option value={25}>25 por página</option>
          </select>

          <select value={sortBy} onChange={(e) => handleSort(e.target.value)} className={styles.filterSelect}>
            <option value="pontos">Ordenar: Pontos</option>
            <option value="nome">Ordenar: Nome</option>
            <option value="email">Ordenar: Email</option>
          </select>

          <button onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')} className={styles.sortBtn}>
            {sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>
      </section>

      {/* Grid */}
      <section className={styles.craftersGrid}>
        {crafters.length === 0 ? (
          <AdminCard variant="outlined" className={styles.emptyCard}>
            <div className={styles.emptyState}>
              <p>{searchTerm || activeFilter !== 'all' ? 'Nenhum crafter encontrado com os filtros aplicados.' : 'Nenhum crafter cadastrado.'}</p>
            </div>
          </AdminCard>
        ) : (
          crafters.map((crafter) => (
            <AdminCard key={crafter.id} variant="elevated" hoverable className={styles.crafterCard}>
              <div className={styles.cardHeader}>
                <div className={styles.crafterInfo}>
                  {crafter.avatar_url
                    ? <img src={crafter.avatar_url} alt={crafter.nome} className={styles.avatar} />
                    : <div className={styles.avatarPlaceholder}>{crafter.nome?.charAt(0).toUpperCase()}</div>
                  }
                  <span className={styles.crafterName}>{crafter.nome}</span>
                </div>
                <StatusBadge variant={crafter.active ? 'success' : 'warning'} dot pulse={crafter.active}>
                  {crafter.active ? 'Ativo' : 'Inativo'}
                </StatusBadge>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>{crafter.email || '-'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Pontos</span>
                  <span className={styles.pointsBadge}>
                    <Star className={styles.starIcon} /> {crafter.pontos || 0}
                  </span>
                </div>
                {crafter.bio && (
                  <p className={styles.bio}>{crafter.bio}</p>
                )}
                {crafter.skills && crafter.skills.length > 0 && (
                  <div className={styles.skillsTags}>
                    {crafter.skills.map(s => (
                      <span key={s} className={styles.skillTag}>{s}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.cardFooter}>
                <button
                  className={styles.editBtn}
                  onClick={() => openEdit(crafter)}
                  title="Editar crafter"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  className={`${styles.editBtn} ${styles.toggleActiveBtn}`}
                  onClick={() => handleToggleActive(crafter)}
                  title={crafter.active ? 'Desativar' : 'Ativar'}
                >
                  {crafter.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {crafter.active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(crafter.id)}
                  title="Excluir crafter"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </AdminCard>
          ))
        )}
      </section>

      {/* Paginação */}
      {(pagination.totalPages ?? 0) > 1 && (
        <AdminCard variant="outlined" className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Mostrando {((pagination.page - 1) * itemsPerPage) + 1}–{Math.min(pagination.page * itemsPerPage, pagination.total)} de {pagination.total}
          </div>
          <div className={styles.paginationControls}>
            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={!pagination.hasPrev || loading} className={styles.pageBtn}>
              ← Anterior
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) pageNum = i + 1;
              else if (pagination.page <= 3) pageNum = i + 1;
              else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
              else pageNum = pagination.page - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={loading}
                  className={`${styles.pageBtn} ${pageNum === pagination.page ? styles.active : ''}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => handlePageChange(pagination.page + 1)} disabled={!pagination.hasNext || loading} className={styles.pageBtn}>
              Próxima →
            </button>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
