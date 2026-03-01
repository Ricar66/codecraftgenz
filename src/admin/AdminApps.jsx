// src/admin/AdminApps.jsx
// Refatorado para usar Design System CodeCraft
import React, { useState, useEffect, useCallback } from 'react';
import {
  FaCube, FaPlus, FaEdit, FaEye, FaEyeSlash, FaTrash,
  FaSave, FaTimes, FaSync, FaShoppingCart, FaUpload, FaDownload,
  FaWindows, FaApple, FaLinux,
  FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

import { useAuth } from '../context/useAuth';
import { getAllApps, updateApp, createApp, deleteApp, uploadAppExecutable } from '../services/appsAPI';
import { uploadImage } from '../services/uploadsAPI';
import { sanitizeImageUrl } from '../utils/urlSanitize';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminApps.module.css';

// Helper functions
const getAppPrice = (a) => Number(a.price ?? a.preco ?? 0);
const getAppImageUrl = (a) => a.thumbnail || a.thumb_url || a.thumbUrl || '';

const formatBRL = (n) => {
  try {
    const v = Number(n || 0);
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch { return `R$ ${String(n || 0)}`; }
};

export default function AdminApps() {
  const { hasRole } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    id: null, name: '', mainFeature: '', description: '',
    status: 'draft', price: 0, thumbnail: '', exec_url: '', version: '1.0.0',
    platforms: ['windows']
  });
  const [priceMask, setPriceMask] = useState('R$ 0,00');
  const [exeFile, setExeFile] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbUploadBusy, setThumbUploadBusy] = useState(false);
  const [thumbUploadError, setThumbUploadError] = useState('');
  const [toast, setToast] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const appsPerPage = 6;

  useEffect(() => { setPriceMask(formatBRL(form.price || 0)); }, [form.price]);

  const handlePriceMaskChange = (e) => {
    const raw = String(e.target.value || '').replace(/[^0-9]/g, '');
    const cents = Number(raw || 0);
    const val = cents / 100;
    setForm(s => ({ ...s, price: val }));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const isAdmin = hasRole(['admin']);
      const json = await getAllApps({ page: 1, pageSize: 100, publicFallback: !isAdmin });
      const rawList = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      const list = rawList.map(a => ({
        ...a,
        thumbnail: a.thumbnail || a.thumb_url || a.thumbUrl || '',
        executableUrl: a.executableUrl || a.executable_url || '',
        mainFeature: a.mainFeature || a.main_feature || a.short_description || '',
        platforms: (() => {
          let p = a.platforms || ['windows'];
          if (typeof p === 'string') { try { p = JSON.parse(p); } catch { p = [p]; } }
          return Array.isArray(p) ? p : ['windows'];
        })(),
      }));
      setApps(list);
      setCurrentPage(1);
    } catch (e) {
      setError(e.message || 'Erro ao carregar apps');
    } finally { setLoading(false); }
  }, [hasRole]);

  useEffect(() => { refresh(); }, [refresh]);

  const isInvalidUrl = (s) => {
    const v = String(s || '');
    return /^[a-zA-Z]:\\/.test(v) || v.startsWith('file:');
  };

  const onSave = async () => {
    try {
      const payload = {
        name: form.name,
        short_description: form.mainFeature,
        description: form.description,
        status: form.status,
        price: Number(form.price || 0),
        thumb_url: form.thumbnail,
        executable_url: form.exec_url,
        platforms: form.platforms
      };
      if (isInvalidUrl(form.thumbnail)) { setError('Thumbnail URL inválida. Use http(s).'); return; }
      if (isInvalidUrl(form.exec_url)) { setError('Exec URL inválida. Use http(s).'); return; }
      await updateApp(form.id, payload);
      setForm({ id: null, name: '', mainFeature: '', description: '', status: 'draft', price: 0, thumbnail: '', exec_url: '', version: '1.0.0', platforms: ['windows'] });
      showToast('App atualizado!');
      refresh();
    } catch (e) {
      setError('Erro ao atualizar: ' + e.message);
    }
  };

  const onCreate = async () => {
    try {
      const payload = {
        name: form.name,
        short_description: form.mainFeature,
        description: form.description,
        status: form.status,
        price: Number(form.price || 0),
        thumb_url: form.thumbnail,
        executable_url: form.exec_url,
        platforms: form.platforms
      };
      if (!payload.name) { setError('Nome é obrigatório'); return; }
      if (isInvalidUrl(form.thumbnail)) { setError('Thumbnail URL inválida. Use http(s).'); return; }
      if (isInvalidUrl(form.exec_url)) { setError('Exec URL inválida. Use http(s).'); return; }
      await createApp(payload);
      setForm({ id: null, name: '', mainFeature: '', description: '', status: 'draft', price: 0, thumbnail: '', exec_url: '', version: '1.0.0', platforms: ['windows'] });
      showToast('App criado!');
      refresh();
    } catch (e) {
      setError('Erro ao criar: ' + e.message);
    }
  };

  const onEdit = (a) => {
    // Normaliza platforms: pode vir como array, JSON string, ou string simples
    let plats = a.platforms || ['windows'];
    if (typeof plats === 'string') {
      try { plats = JSON.parse(plats); } catch { plats = [plats]; }
    }
    if (!Array.isArray(plats)) plats = ['windows'];
    setForm({
      id: a.id,
      name: a.name || '',
      mainFeature: a.short_description || a.mainFeature || '',
      description: a.description || '',
      status: a.status || 'draft',
      price: a.price || 0,
      thumbnail: a.thumb_url || a.thumbnail || '',
      exec_url: a.executable_url || a.executableUrl || '',
      version: a.version || '1.0.0',
      platforms: plats
    });
    document.getElementById('app-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onToggleStatus = async (a) => {
    const curr = String(a.status || '').toLowerCase();
    const next = curr === 'available' ? 'draft' : 'available';
    try {
      await updateApp(a.id, { status: next });
      showToast('Status atualizado!');
      refresh();
    } catch (e) {
      setError(e.message || 'Falha ao alternar');
    }
  };

  const onDelete = async (a) => {
    if (!confirm('Excluir este aplicativo?')) return;
    try {
      await deleteApp(a.id);
      showToast('App excluído!');
      refresh();
    } catch (e) {
      setError(e.message || 'Falha ao excluir');
    }
  };

  const handleFileUpload = async () => {
    if (!exeFile || !form.id) return;
    try {
      setUploadBusy(true);
      setUploadError('');
      const r = await uploadAppExecutable(form.id, exeFile);
      const execUrl = r?.data?.executable_url || r?.executable_url || r?.download_url || r?.url;
      if (execUrl) {
        setForm(s => ({ ...s, exec_url: execUrl }));
        showToast('Upload concluído!');
        refresh();
      } else {
        setUploadError('Upload ok mas URL não retornada.');
      }
      setExeFile(null);
    } catch (e) {
      setUploadError(e.message || 'Falha no upload');
    } finally { setUploadBusy(false); }
  };

  const handleThumbnailUpload = async () => {
    if (!thumbFile) return;
    try {
      setThumbUploadBusy(true);
      setThumbUploadError('');
      const r = await uploadImage(thumbFile, form.thumbnail || undefined);
      const imageUrl = r?.data?.url || r?.url;
      if (imageUrl) {
        setForm(s => ({ ...s, thumbnail: imageUrl }));
        showToast('Thumbnail enviada!');
      } else {
        setThumbUploadError('Upload ok mas URL não retornada.');
      }
      setThumbFile(null);
    } catch (e) {
      setThumbUploadError(e.message || 'Falha no upload da imagem');
    } finally { setThumbUploadBusy(false); }
  };

  const cancelEdit = () => {
    setForm({ id: null, name: '', mainFeature: '', description: '', status: 'draft', price: 0, thumbnail: '', exec_url: '', version: '1.0.0', platforms: ['windows'] });
  };

  const togglePlatform = (plat) => {
    setForm(s => {
      const current = s.platforms || [];
      const has = current.includes(plat);
      const next = has ? current.filter(p => p !== plat) : [...current, plat];
      return { ...s, platforms: next.length > 0 ? next : current };
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando aplicativos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <FaCube className={styles.headerIcon} />
          <div>
            <h1>Gestão de Aplicativos</h1>
            <p>{apps.length} apps cadastrados</p>
          </div>
        </div>
        <button onClick={refresh} className={styles.refreshBtn}>
          <FaSync /> Atualizar
        </button>
      </header>

      {/* Toast */}
      {toast && <div className={styles.toast}><FaSave /> {toast}</div>}

      {/* Error */}
      {error && <div className={styles.error}><FaTimes /> {error}</div>}

      {/* Apps Grid */}
      {(() => {
        const totalPages = Math.ceil(apps.length / appsPerPage);
        const paginatedApps = apps.slice((currentPage - 1) * appsPerPage, currentPage * appsPerPage);
        return (
          <>
            <div className={styles.appsGrid}>
              {apps.length === 0 ? (
                <AdminCard variant="outlined" className={styles.emptyCard}>
                  <div className={styles.emptyState}>
                    <FaCube className={styles.emptyIcon} />
                    <p>Nenhum aplicativo cadastrado</p>
                  </div>
                </AdminCard>
              ) : paginatedApps.map(a => (
                <AdminCard key={a.id} variant="elevated" className={styles.appCard}>
                  <div className={styles.cardThumb}>
                    <img
                      src={sanitizeImageUrl(getAppImageUrl(a))}
                      alt={a.name}
                      onError={(e) => { e.currentTarget.src = '/logo-principal.png'; }}
                    />
                  </div>

                  <div className={styles.cardBody}>
                    <h3>{a.name}</h3>
                    <p className={styles.feature}>{String(a.mainFeature || '').slice(0, 80)}</p>

                    <div className={styles.cardMeta}>
                      <span className={styles.price}>{formatBRL(getAppPrice(a))}</span>
                      <StatusBadge variant={a.status === 'available' ? 'success' : 'warning'}>
                        {a.status || 'draft'}
                      </StatusBadge>
                    </div>
                    {a.platforms && a.platforms.length > 0 && (
                      <div className={styles.platformBadges}>
                        {a.platforms.includes('windows') && <span className={styles.platformBadge}><FaWindows /> Win</span>}
                        {a.platforms.includes('macos') && <span className={styles.platformBadge}><FaApple /> Mac</span>}
                        {a.platforms.includes('linux') && <span className={styles.platformBadge}><FaLinux /> Linux</span>}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardActions}>
                    <button onClick={() => onEdit(a)} className={styles.editBtn} title="Editar">
                      <FaEdit />
                    </button>
                    <button onClick={() => onToggleStatus(a)} className={styles.visibilityBtn} title={a.status === 'available' ? 'Ocultar' : 'Publicar'}>
                      {a.status === 'available' ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    <button onClick={() => window.open(`/apps/${a.id}/compra`, '_blank')} className={styles.buyBtn} title="Ver compra">
                      <FaShoppingCart />
                    </button>
                    <button onClick={() => onDelete(a)} className={styles.deleteBtn} title="Excluir">
                      <FaTrash />
                    </button>
                  </div>
                </AdminCard>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={styles.pageBtn}
                >
                  <FaChevronLeft />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`${styles.pageBtn} ${currentPage === page ? styles.pageBtnActive : ''}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={styles.pageBtn}
                >
                  <FaChevronRight />
                </button>
                <span className={styles.pageInfo}>
                  {(currentPage - 1) * appsPerPage + 1}-{Math.min(currentPage * appsPerPage, apps.length)} de {apps.length}
                </span>
              </div>
            )}
          </>
        );
      })()}

      {/* Form */}
      <AdminCard variant="elevated" className={styles.formCard} id="app-form">
        <h2 className={styles.formTitle}>
          {form.id ? <><FaEdit /> Editar App</> : <><FaPlus /> Criar Novo App</>}
        </h2>

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nome *</label>
              <input type="text" placeholder="Nome do app" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Feature Principal</label>
              <input type="text" placeholder="Recurso principal" value={form.mainFeature} onChange={e => setForm({ ...form, mainFeature: e.target.value })} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Preço (R$)</label>
              <input type="text" value={priceMask} onChange={handlePriceMaskChange} className={styles.input} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Descrição</label>
            <textarea placeholder="Descrição completa do app..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={styles.textarea} rows="4" />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Thumbnail (URL ou Upload)</label>
              <input type="url" placeholder="https://... (ou envie abaixo)" value={form.thumbnail} onChange={e => setForm({ ...form, thumbnail: e.target.value })} className={styles.input} />
              <div className={styles.uploadRow} style={{ marginTop: 8 }}>
                <label className={styles.fileUpload}>
                  <FaUpload /> {thumbFile ? thumbFile.name : 'Enviar imagem'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={e => { setThumbFile(e.target.files?.[0] || null); setThumbUploadError(''); }} />
                </label>
                <button onClick={handleThumbnailUpload} disabled={thumbUploadBusy || !thumbFile} className={styles.uploadBtn}>
                  {thumbUploadBusy ? 'Enviando...' : <><FaUpload /> Enviar</>}
                </button>
              </div>
              {thumbUploadError && <span className={styles.uploadError}>{thumbUploadError}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>URL do Executável</label>
              <input type="url" placeholder="https://..." value={form.exec_url} onChange={e => setForm({ ...form, exec_url: e.target.value })} className={styles.input} />
            </div>
          </div>

          {form.id && (
            <div className={styles.uploadSection}>
              <div className={styles.formGroup}>
                <label>Enviar Executável (.exe)</label>
                <div className={styles.uploadRow}>
                  <label className={styles.fileUpload}>
                    <FaUpload /> {exeFile ? exeFile.name : 'Selecionar arquivo'}
                    <input
                      type="file"
                      accept=".exe"
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        setExeFile(file);
                        setUploadError('');
                        if (file) {
                          const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                          setForm(s => ({ ...s, exec_url: `/downloads/${sanitizedName}` }));
                        }
                      }}
                    />
                  </label>
                  <button onClick={handleFileUpload} disabled={uploadBusy || !exeFile} className={styles.uploadBtn}>
                    {uploadBusy ? 'Enviando...' : <><FaDownload /> Enviar</>}
                  </button>
                </div>
                {uploadError && <span className={styles.uploadError}>{uploadError}</span>}
              </div>
            </div>
          )}

          {form.thumbnail && (
            <div className={styles.thumbPreview}>
              <img src={sanitizeImageUrl(form.thumbnail)} alt="Preview" onError={(e) => { e.currentTarget.src = '/logo-principal.png'; }} />
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={styles.select}>
                <option value="draft">Rascunho</option>
                <option value="available">Disponível</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Plataformas</label>
              <div className={styles.platformChecks}>
                <label className={styles.platformCheck}>
                  <input type="checkbox" checked={form.platforms?.includes('windows')} onChange={() => togglePlatform('windows')} />
                  <FaWindows /> Windows
                </label>
                <label className={styles.platformCheck}>
                  <input type="checkbox" checked={form.platforms?.includes('macos')} onChange={() => togglePlatform('macos')} />
                  <FaApple /> macOS
                </label>
                <label className={styles.platformCheck}>
                  <input type="checkbox" checked={form.platforms?.includes('linux')} onChange={() => togglePlatform('linux')} />
                  <FaLinux /> Linux
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button onClick={onSave} disabled={!form.id || !form.name} className={styles.saveBtn}>
            <FaSave /> Salvar
          </button>
          <button onClick={onCreate} disabled={!!form.id || !form.name || form.price <= 0} className={styles.createBtn}>
            <FaPlus /> Criar
          </button>
          <button onClick={cancelEdit} className={styles.cancelBtn}>
            <FaTimes /> Limpar
          </button>
        </div>
      </AdminCard>
    </div>
  );
}
