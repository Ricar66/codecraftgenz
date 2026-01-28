// src/admin/AdminRanking.jsx
// Refatorado para usar Design System CodeCraft
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FaTrophy, FaMedal, FaPlus, FaEdit, FaSave, FaTimes, FaSearch,
  FaStar, FaFilter, FaSync, FaUser, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

import { useRanking, RankingRepo, useCrafters } from '../hooks/useAdminRepo';
import { useAuth } from '../hooks/useAuth';
import { apiRequest } from '../lib/apiConfig';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminRanking.module.css';

export default function AdminRanking() {
  const { data: rk, loading, error, refresh } = useRanking();
  const { user } = useAuth();
  const { crafters, pagination, loading: loadingCrafters, reload: reloadCrafters, loadPage, search } = useCrafters({
    active_only: 'true',
    limit: 20,
    order_by: 'points',
    order_direction: 'desc'
  });

  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    min_points: '',
    max_points: '',
    active_only: true,
    sort: 'points_desc'
  });
  const [crafterForm, setCrafterForm] = useState({ name: '', avatar_url: '', points: 0, active: true });
  const [crafterErrors, setCrafterErrors] = useState({});
  const [isCrafterModalOpen, setCrafterModalOpen] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, item: null, saving: false, error: '' });
  const [toast, setToast] = useState('');

  // Normalize ranking data
  const rankingData = useMemo(() => {
    if (!rk || Array.isArray(rk)) {
      return { top3: [], table: [], all: [] };
    }
    return {
      top3: rk.top3 || [],
      table: rk.table || [],
      all: rk.all || rk.crafters || []
    };
  }, [rk]);

  const allList = useMemo(() => {
    return Array.isArray(rankingData.all)
      ? [...rankingData.all].sort((a, b) => Number(b.points ?? b.pontos ?? 0) - Number(a.points ?? a.pontos ?? 0))
      : [];
  }, [rankingData.all]);

  // Podium state
  const [top3, setTop3] = useState([]);
  const [podiumRewards, setPodiumRewards] = useState({});

  useEffect(() => {
    if (rankingData.top3) {
      const sorted = [...rankingData.top3].sort((a, b) => Number(a.position) - Number(b.position));
      setTop3(sorted);
      const rewards = {};
      sorted.forEach(t => { rewards[t.position] = t.reward || ''; });
      setPodiumRewards(rewards);
    }
  }, [rankingData.top3]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const changePoints = async (id, delta, reason = '') => {
    setBusy(true);
    try {
      await RankingRepo.updatePoints(id, { delta, reason: reason || `Ajuste manual ${delta > 0 ? '+' : ''}${delta}` });
      showToast(`Pontos ${delta > 0 ? 'adicionados' : 'removidos'} com sucesso`);
      refresh();
    } finally { setBusy(false); }
  };

  const setPoints = async (id, points, reason = '') => {
    setBusy(true);
    try {
      await RankingRepo.updatePoints(id, { set: points, reason: reason || `Definir ${points} pontos` });
      showToast('Pontos definidos com sucesso');
      refresh();
    } finally { setBusy(false); }
  };

  const onSaveTop3 = async () => {
    setBusy(true);
    try {
      const payload = (top3 || []).map((t, i) => ({
        crafter_id: t.id,
        position: i + 1,
        reward: podiumRewards[i + 1] || ''
      }));
      const resp = await RankingRepo.updateTop3(payload);
      if (resp?.ok && resp?.result?.data?.top3) {
        const newTop3 = resp.result.data.top3.map(rec => ({
          id: rec.crafter_id,
          name: rec.name || '',
          points: Number(rec.points || 0),
          avatar_url: rec.avatar_url || '',
          position: rec.position
        })).sort((a, b) => Number(a.position) - Number(b.position));
        setTop3(newTop3);
        const rewards = {};
        newTop3.forEach(r => { rewards[r.position] = r.reward || ''; });
        setPodiumRewards(rewards);
      }
      showToast('Pódio salvo com sucesso!');
      refresh();
    } finally { setBusy(false); }
  };

  const validateCrafter = (form) => {
    const errs = {};
    if (!String(form.name || '').trim()) errs.name = 'Nome é obrigatório';
    if (form.points === '' || isNaN(Number(form.points))) errs.points = 'Pontos inválidos';
    if (Number(form.points) < 0) errs.points = 'Pontos não podem ser negativos';
    if (String(form.avatar_url || '').trim()) {
      const ok = /^https?:\/\/\S+/.test(String(form.avatar_url));
      if (!ok) errs.avatar_url = 'URL do avatar inválida';
    }
    return errs;
  };

  const createCrafter = async () => {
    const errs = validateCrafter(crafterForm);
    setCrafterErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setBusy(true);
    try {
      await apiRequest('/api/crafters', { method: 'POST', body: JSON.stringify(crafterForm) });
      setCrafterForm({ name: '', avatar_url: '', points: 0, active: true });
      setCrafterModalOpen(false);
      showToast('Crafter criado com sucesso!');
      refresh();
    } finally { setBusy(false); }
  };

  const updateCrafter = async (id, updates) => {
    setBusy(true);
    try {
      await apiRequest(`/api/crafters/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
      showToast('Crafter atualizado!');
      refresh();
    } finally { setBusy(false); }
  };

  const filteredCrafters = useMemo(() => {
    let list = [...(rankingData.table || [])];
    if (filters.search) {
      list = list.filter(c => c.name?.toLowerCase().includes(filters.search.toLowerCase()));
    }
    if (filters.min_points) {
      list = list.filter(c => c.points >= Number(filters.min_points));
    }
    if (filters.max_points) {
      list = list.filter(c => c.points <= Number(filters.max_points));
    }
    if (filters.active_only) {
      list = list.filter(c => c.active !== false);
    }
    if (filters.sort === 'points_desc') {
      list.sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
    } else if (filters.sort === 'points_asc') {
      list.sort((a, b) => Number(a.points || 0) - Number(b.points || 0));
    } else if (filters.sort === 'name_asc') {
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } else if (filters.sort === 'name_desc') {
      list.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));
    }
    return list;
  }, [rankingData.table, filters]);

  const resetFilters = () => {
    setFilters({ search: '', min_points: '', max_points: '', active_only: true, sort: 'points_desc' });
  };

  // Podium validation
  const selectedIds = (top3 || []).filter(t => t?.id).map(t => t.id);
  const hasDuplicates = selectedIds.length !== new Set(selectedIds).size;
  const isPodiumComplete = (top3 || []).length === 3 && (top3 || []).every(t => t?.id);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando ranking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <AdminCard variant="outlined">
          <div className={styles.errorState}>
            <h3>Erro ao carregar ranking</h3>
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
          <FaTrophy className={styles.headerIcon} />
          <div>
            <h1>Ranking de Crafters</h1>
            <p>{allList.length} crafters no ranking</p>
          </div>
        </div>
        <button onClick={() => setCrafterModalOpen(true)} className={styles.newBtn}>
          <FaPlus /> Novo Crafter
        </button>
      </header>

      {/* Toast */}
      {toast && (
        <div className={styles.toast}>
          <FaStar /> {toast}
        </div>
      )}

      {/* Podium Editor */}
      <AdminCard variant="elevated" className={styles.podiumCard}>
        <h2 className={styles.sectionTitle}><FaMedal /> Editor de Pódio</h2>

        <div className={styles.podiumGrid}>
          {[1, 2, 3].map(position => {
            const crafter = (top3 || []).find(t => t.position === position) || (top3 || [])[position - 1];
            const isSelected = crafter?.id;
            const isDuplicate = isSelected && (top3 || []).filter(t => t.id === crafter.id).length > 1;

            return (
              <div
                key={position}
                className={`${styles.podiumSlot} ${isDuplicate ? styles.duplicate : ''} ${isSelected ? styles.selected : ''}`}
              >
                <div className={styles.podiumHeader}>
                  <span className={styles.podiumPosition}>
                    {position === 1 && <span className={styles.gold}>1º</span>}
                    {position === 2 && <span className={styles.silver}>2º</span>}
                    {position === 3 && <span className={styles.bronze}>3º</span>}
                  </span>
                  {isDuplicate && <StatusBadge variant="error" size="sm">Duplicado</StatusBadge>}
                </div>

                <select
                  value={crafter?.id || ''}
                  onChange={e => {
                    const selected = allList.find(c => c.id === e.target.value);
                    if (selected) {
                      const newTop3 = [...top3];
                      newTop3[position - 1] = { ...selected, position };
                      setTop3(newTop3);
                    } else {
                      const newTop3 = [...top3];
                      newTop3[position - 1] = null;
                      setTop3(newTop3.filter(Boolean));
                    }
                  }}
                  className={styles.podiumSelect}
                >
                  <option value="">Selecionar crafter</option>
                  {allList.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.points} pts)</option>
                  ))}
                </select>

                <input
                  placeholder="Recompensa (opcional)"
                  value={podiumRewards[position] || ''}
                  onChange={e => setPodiumRewards(prev => ({ ...prev, [position]: e.target.value }))}
                  className={styles.podiumReward}
                />

                {isSelected && (
                  <div className={styles.podiumPoints}>
                    <FaStar /> {crafter.points} pontos
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Podium Status */}
        {hasDuplicates && (
          <div className={styles.podiumError}>
            <FaTimes /> Não é possível selecionar o mesmo crafter em múltiplas posições
          </div>
        )}
        {isPodiumComplete && !hasDuplicates && (
          <div className={styles.podiumSuccess}>
            <FaStar /> Pódio completo! Pronto para salvar
          </div>
        )}

        <div className={styles.podiumActions}>
          <button
            onClick={onSaveTop3}
            disabled={busy || !isPodiumComplete || hasDuplicates}
            className={styles.saveBtn}
          >
            <FaSave /> Salvar Pódio
          </button>
          <button
            onClick={() => { setTop3([]); setPodiumRewards({}); }}
            disabled={busy || selectedIds.length === 0}
            className={styles.clearBtn}
          >
            <FaTimes /> Limpar
          </button>
        </div>
      </AdminCard>

      {/* Filters */}
      <AdminCard variant="elevated" className={styles.filtersCard}>
        <h3 className={styles.sectionTitle}><FaFilter /> Filtros</h3>
        <div className={styles.filtersGrid}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className={styles.searchInput}
            />
          </div>
          <input
            type="number"
            placeholder="Pontos mín."
            value={filters.min_points}
            onChange={e => setFilters(prev => ({ ...prev, min_points: e.target.value }))}
            className={styles.input}
          />
          <input
            type="number"
            placeholder="Pontos máx."
            value={filters.max_points}
            onChange={e => setFilters(prev => ({ ...prev, max_points: e.target.value }))}
            className={styles.input}
          />
          <select
            value={filters.sort}
            onChange={e => setFilters(prev => ({ ...prev, sort: e.target.value }))}
            className={styles.select}
          >
            <option value="points_desc">Pontos (maior)</option>
            <option value="points_asc">Pontos (menor)</option>
            <option value="name_asc">Nome A-Z</option>
            <option value="name_desc">Nome Z-A</option>
          </select>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={filters.active_only}
              onChange={e => setFilters(prev => ({ ...prev, active_only: e.target.checked }))}
            />
            Apenas ativos
          </label>
          <button onClick={resetFilters} className={styles.resetBtn}>
            <FaSync /> Resetar
          </button>
        </div>
      </AdminCard>

      {/* Crafters Table */}
      <AdminCard variant="elevated" className={styles.tableCard}>
        <h3 className={styles.sectionTitle}><FaTrophy /> Tabela Geral</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Avatar</th>
                <th>Nome</th>
                <th>Pontos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCrafters.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.emptyRow}>
                    <FaUser /> Nenhum crafter encontrado
                  </td>
                </tr>
              ) : filteredCrafters.map((c, index) => (
                <tr key={c.id}>
                  <td data-label="Pos">{index + 1}</td>
                  <td data-label="Avatar">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name} className={styles.avatar} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {c.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td data-label="Nome">{c.name}</td>
                  <td data-label="Pontos">
                    <span className={styles.pointsBadge}>
                      <FaStar /> {c.points} pts
                    </span>
                  </td>
                  <td data-label="Status">
                    <StatusBadge variant={c.active !== false ? 'success' : 'neutral'}>
                      {c.active !== false ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                  </td>
                  <td data-label="Ações">
                    <div className={styles.actionBtns}>
                      <button onClick={() => changePoints(c.id, 10)} disabled={busy} className={styles.actionBtn} title="+10">+10</button>
                      <button onClick={() => changePoints(c.id, -10)} disabled={busy} className={styles.actionBtn} title="-10">-10</button>
                      <button
                        onClick={() => {
                          const points = prompt('Definir pontos:', c.points);
                          if (points !== null && !isNaN(points)) setPoints(c.id, Number(points));
                        }}
                        disabled={busy}
                        className={styles.actionBtnOutline}
                        title="Definir"
                      >SET</button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Zerar pontos de ${c.name}?`)) setPoints(c.id, 0, 'Zerado pelo admin');
                        }}
                        disabled={busy}
                        className={styles.actionBtnDanger}
                        title="Zerar"
                      >0</button>
                      <button
                        onClick={() => updateCrafter(c.id, { active: !c.active })}
                        disabled={busy}
                        className={styles.actionBtnOutline}
                      >
                        {c.active !== false ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Crafter Modal */}
      {isCrafterModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3><FaPlus /> Novo Crafter</h3>
              <button onClick={() => { setCrafterModalOpen(false); setCrafterErrors({}); }} className={styles.closeBtn}>
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Nome *</label>
                  <input
                    type="text"
                    placeholder="Nome do crafter"
                    value={crafterForm.name}
                    onChange={e => setCrafterForm(prev => ({ ...prev, name: e.target.value }))}
                    className={`${styles.input} ${crafterErrors.name ? styles.inputError : ''}`}
                  />
                  {crafterErrors.name && <span className={styles.fieldError}>{crafterErrors.name}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Avatar URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={crafterForm.avatar_url}
                    onChange={e => setCrafterForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                    className={`${styles.input} ${crafterErrors.avatar_url ? styles.inputError : ''}`}
                  />
                  {crafterErrors.avatar_url && <span className={styles.fieldError}>{crafterErrors.avatar_url}</span>}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Pontos iniciais</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={crafterForm.points}
                    onChange={e => setCrafterForm(prev => ({ ...prev, points: Number(e.target.value) }))}
                    className={`${styles.input} ${crafterErrors.points ? styles.inputError : ''}`}
                  />
                  {crafterErrors.points && <span className={styles.fieldError}>{crafterErrors.points}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={crafterForm.active}
                      onChange={e => setCrafterForm(prev => ({ ...prev, active: e.target.checked }))}
                    />
                    Ativo
                  </label>
                </div>
              </div>

              {crafterForm.avatar_url && (
                <div className={styles.avatarPreview}>
                  <img src={crafterForm.avatar_url} alt="Preview" />
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={createCrafter}
                disabled={busy || !crafterForm.name}
                className={styles.saveBtn}
              >
                {busy ? 'Salvando...' : <><FaSave /> Salvar</>}
              </button>
              <button onClick={() => { setCrafterModalOpen(false); setCrafterErrors({}); }} className={styles.cancelBtn}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3><FaEdit /> Editar Crafter</h3>
              <button onClick={() => setEditModal({ open: false, item: null, saving: false, error: '' })} className={styles.closeBtn}>
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              {editModal.error && <div className={styles.modalError}>{editModal.error}</div>}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Nome</label>
                  <input
                    type="text"
                    value={editModal.item?.nome || ''}
                    onChange={e => setEditModal(s => ({ ...s, item: { ...s.item, nome: e.target.value } }))}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Especialização</label>
                  <input
                    type="text"
                    value={editModal.item?.nivel || ''}
                    onChange={e => setEditModal(s => ({ ...s, item: { ...s.item, nivel: e.target.value } }))}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Avatar URL</label>
                  <input
                    type="url"
                    value={editModal.item?.avatar_url || ''}
                    onChange={e => setEditModal(s => ({ ...s, item: { ...s.item, avatar_url: e.target.value } }))}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Pontos</label>
                  <input
                    type="number"
                    value={editModal.item?.pontos ?? 0}
                    onChange={e => setEditModal(s => ({ ...s, item: { ...s.item, pontos: Number(e.target.value) } }))}
                    className={styles.input}
                  />
                </div>
              </div>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={editModal.item?.ativo ?? true}
                  onChange={e => setEditModal(s => ({ ...s, item: { ...s.item, ativo: e.target.checked } }))}
                />
                Ativo
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={async () => {
                  const nome = String(editModal.item?.nome || '').trim();
                  if (!nome) {
                    setEditModal(s => ({ ...s, error: 'Nome é obrigatório' }));
                    return;
                  }
                  try {
                    setEditModal(s => ({ ...s, saving: true, error: '' }));
                    await apiRequest(`/api/crafters/${editModal.item.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({
                        nome: editModal.item.nome,
                        nivel: editModal.item.nivel,
                        avatar_url: editModal.item.avatar_url,
                        pontos: Number(editModal.item.pontos || 0),
                        ativo: !!editModal.item.ativo
                      })
                    });
                    setEditModal({ open: false, item: null, saving: false, error: '' });
                    showToast('Crafter atualizado!');
                    reloadCrafters();
                  } catch (e) {
                    setEditModal(s => ({ ...s, saving: false, error: e.message || 'Falha ao salvar' }));
                  }
                }}
                disabled={editModal.saving || user?.role !== 'admin'}
                className={styles.saveBtn}
              >
                {editModal.saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditModal({ open: false, item: null, saving: false, error: '' })} className={styles.cancelBtn}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
