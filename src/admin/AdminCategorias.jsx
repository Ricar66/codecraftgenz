// src/admin/AdminCategorias.jsx
// Gestão de Categorias — CRUD para a loja de apps.
// Sistema: 1 categoria por app (FK), ícone = nome de ícone lucide-react (string).
import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Pencil, Trash2, Save, X, RefreshCw, Eye, EyeOff } from 'lucide-react';

import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoriesAPI';
import { getLucideIcon } from '../utils/lucideIconMap';
import IconPicker from '../components/IconPicker/IconPicker.jsx';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminCategorias.module.css';

const emptyForm = { id: null, name: '', icon: '', order: 0, active: true };

export default function AdminCategorias() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCategories();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openCreate = () => {
    setForm({ ...emptyForm, order: (items.length || 0) * 10 });
    setShowForm(true);
    setError('');
  };

  const openEdit = (cat) => {
    setForm({
      id: cat.id,
      name: cat.name || '',
      icon: cat.icon || '',
      order: cat.order ?? 0,
      active: cat.active !== false,
    });
    setShowForm(true);
    setError('');
    // Rolar até o form
    setTimeout(() => {
      document.getElementById('category-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 40);
  };

  const cancelEdit = () => {
    setForm(emptyForm);
    setShowForm(false);
    setError('');
  };

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    const name = String(form.name || '').trim();
    if (!name) {
      setError('Nome é obrigatório');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload = {
        name,
        icon: form.icon || null,
        order: Number(form.order) || 0,
        active: !!form.active,
      };
      if (form.id) {
        await updateCategory(form.id, payload);
        showToast('Categoria atualizada!');
      } else {
        await createCategory(payload);
        showToast('Categoria criada!');
      }
      cancelEdit();
      await refresh();
    } catch (err) {
      setError(err.message || 'Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (cat) => {
    try {
      await updateCategory(cat.id, { active: !cat.active });
      showToast(cat.active ? 'Categoria desativada' : 'Categoria ativada');
      await refresh();
    } catch (err) {
      setError(err.message || 'Falha ao alternar categoria');
    }
  };

  const onDelete = async (cat) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Excluir categoria "${cat.name}"? Apps vinculados ficarão sem categoria.`)) return;
    try {
      await deleteCategory(cat.id);
      showToast('Categoria excluída');
      await refresh();
    } catch (err) {
      setError(err.message || 'Erro ao excluir categoria');
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Tag className={styles.headerIcon} />
          <div>
            <h1>Gestão de Categorias</h1>
            <p>{items.length} categorias cadastradas</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button onClick={openCreate} className={styles.newBtn}>
            <Plus /> Nova Categoria
          </button>
          <button onClick={refresh} className={styles.refreshBtn}>
            <RefreshCw /> Atualizar
          </button>
        </div>
      </header>

      {/* Toast & Error */}
      {toast && <div className={styles.toast}><Save /> {toast}</div>}
      {error && <div className={styles.error}><X /> {error}</div>}

      {/* Aviso de fluxo */}
      <div className={styles.infoBox}>
        <strong>Como funciona:</strong> categorias criadas aqui aparecem como <em>pills</em> na loja
        (<a href="/aplicativos" target="_blank" rel="noopener noreferrer">/aplicativos</a>) e ficam
        disponíveis no formulário de edição do App em{' '}
        <a href="/admin/apps">/admin/apps</a>. Apps sem categoria aparecem em <strong>Todas</strong>.
      </div>

      {/* Form */}
      {showForm && (
        <AdminCard variant="elevated" className={styles.formCard} id="category-form">
          <h2 className={styles.formTitle}>
            {form.id ? <><Pencil /> Editar Categoria</> : <><Plus /> Nova Categoria</>}
          </h2>
          <form onSubmit={onSubmit} className={styles.formGrid}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nome *</label>
                <input
                  type="text"
                  placeholder="Ex.: Aprendizado, Ferramentas, Games..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={styles.input}
                  required
                  maxLength={64}
                />
                <small className={styles.help}>
                  O slug (URL) é gerado automaticamente a partir do nome.
                </small>
              </div>
              <div className={styles.formGroup}>
                <label>Ordem (menor primeiro)</label>
                <input
                  type="number"
                  step="1"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Ativa</label>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={!!form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  <span>{form.active ? 'Visível na loja' : 'Oculta'}</span>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Ícone {form.icon && <span className={styles.pickedIcon}>({form.icon})</span>}</label>
              <IconPicker
                value={form.icon}
                onChange={(name) => setForm({ ...form, icon: name })}
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" disabled={saving || !form.name} className={styles.saveBtn}>
                <Save /> {saving ? 'Salvando...' : (form.id ? 'Salvar alterações' : 'Criar categoria')}
              </button>
              <button type="button" onClick={cancelEdit} className={styles.cancelBtn}>
                <X /> Cancelar
              </button>
            </div>
          </form>
        </AdminCard>
      )}

      {/* Tabela */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando categorias...</p>
        </div>
      ) : items.length === 0 ? (
        <AdminCard variant="outlined">
          <div className={styles.emptyState}>
            <Tag className={styles.emptyIcon} />
            <p>Nenhuma categoria cadastrada</p>
            <button onClick={openCreate} className={styles.newBtn} style={{ marginTop: 12 }}>
              <Plus /> Criar primeira categoria
            </button>
          </div>
        </AdminCard>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 60 }}>Ícone</th>
                <th>Nome</th>
                <th>Slug</th>
                <th style={{ width: 90 }}>Ordem</th>
                <th style={{ width: 90 }}>Apps</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 160 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cat) => {
                const IconComp = getLucideIcon(cat.icon);
                return (
                  <tr key={cat.id}>
                    <td>
                      <div className={styles.iconCell}>
                        <IconComp size={20} />
                      </div>
                    </td>
                    <td className={styles.nameCell}>{cat.name}</td>
                    <td className={styles.slugCell}><code>{cat.slug}</code></td>
                    <td>{cat.order}</td>
                    <td>{cat.apps_count ?? 0}</td>
                    <td>
                      <StatusBadge variant={cat.active ? 'success' : 'warning'}>
                        {cat.active ? 'Ativa' : 'Oculta'}
                      </StatusBadge>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          onClick={() => openEdit(cat)}
                          className={styles.editBtn}
                          title="Editar"
                        >
                          <Pencil />
                        </button>
                        <button
                          onClick={() => onToggleActive(cat)}
                          className={styles.visibilityBtn}
                          title={cat.active ? 'Ocultar da loja' : 'Ativar'}
                        >
                          {cat.active ? <EyeOff /> : <Eye />}
                        </button>
                        <button
                          onClick={() => onDelete(cat)}
                          className={styles.deleteBtn}
                          title="Excluir"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
