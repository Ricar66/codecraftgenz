// src/pages/AppsPage.jsx
// Loja de Aplicativos — Premium Store
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AppCard from '../components/AppCard/AppCard';
import LicenseActivator from '../components/LicenseActivator.jsx';
import Navbar from '../components/Navbar/Navbar';
import SecuritySection from '../components/SecuritySection/SecuritySection.jsx';
import { API_BASE_URL, apiRequest } from '../lib/apiConfig.js';
import { getHistory, upsertAppFromProject, getPublicApps, getPurchaseStatus } from '../services/appsAPI.js';
import { getProjects } from '../services/projectsAPI.js';
import { getAppPrice } from '../utils/appModel.js';
import { appsCache } from '../utils/dataCache.js';
import { globalPerformanceMonitor } from '../utils/performanceMonitor.js';
import styles from './AppsPage.module.css';

// Converte URL relativa para URL completa do backend
const resolveDownloadUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  if (cleanUrl.startsWith('/api/')) return `${API_BASE_URL}${cleanUrl}`;
  if (cleanUrl.startsWith('/downloads/')) return `${API_BASE_URL}/api${cleanUrl}`;
  return `${API_BASE_URL}${cleanUrl}`;
};

const AppsPage = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [showPublish, setShowPublish] = useState(false);
  const [projects, setProjects] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todas');
  const [sortMode, setSortMode] = useState('categoria');
  const [payModal, setPayModal] = useState({ open: false, app: null, loading: false, error: '' });
  const [expandedLicenses, setExpandedLicenses] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const metricId = `apps-load-${Date.now()}`;
        globalPerformanceMonitor.startMeasure(metricId, { page: 1, pageSize: 24 });

        const cacheKey = appsCache.generateKey('public-apps', { page: 1, pageSize: 24 });
        const cached = appsCache.get(cacheKey);
        let jsonApps;
        if (cached) {
          jsonApps = cached;
        } else {
          jsonApps = await getPublicApps({ page: 1, pageSize: 24, sortBy: 'updatedAt' });
          appsCache.set(cacheKey, jsonApps, 5 * 60 * 1000);
        }
        const list = Array.isArray(jsonApps?.data) ? jsonApps.data : (Array.isArray(jsonApps) ? jsonApps : []);
        if (mounted) setApps(list);
        const jsonHist = await getHistory({ page: 1, pageSize: 10 }).catch(() => ({ data: [] }));
        const histList = Array.isArray(jsonHist?.data) ? jsonHist.data : (Array.isArray(jsonHist) ? jsonHist : []);
        if (mounted) setHistory(histList);
        globalPerformanceMonitor.endMeasure(metricId, { success: true, count: list.length });
      } catch (e) {
        if (e.status === 401) {
          setError('Não autenticado');
          navigate('/login?redirect=/apps');
        } else {
          setError(e.message || 'Erro ao carregar aplicativos');
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  // Carrega projetos para publicacao quando modal abre
  useEffect(() => {
    if (!showPublish) return;
    let mounted = true;
    (async () => {
      try {
        const res = await getProjects({ page: 1, limit: 12, sortBy: 'updatedAt', publicOnly: false });
        const list = Array.isArray(res?.data) ? res.data : [];
        if (mounted) setProjects(list);
      } catch (e) {
        console.warn('Erro ao carregar projetos para publicacao:', e);
      }
    })();
    return () => { mounted = false; };
  }, [showPublish]);

  const usageByApp = useMemo(() => {
    const counts = new Map();
    for (const h of history) {
      const id = h.appId || h.app_id;
      if (!id) continue;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
  }, [history]);

  const categories = useMemo(() => {
    const set = new Set(['todas']);
    for (const a of apps) set.add(a.category || 'outros');
    return Array.from(set);
  }, [apps]);

  const filteredApps = useMemo(() => {
    let list = [...apps];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => String(a.name || '').toLowerCase().includes(q) || String(a.mainFeature || '').toLowerCase().includes(q));
    }
    if (category !== 'todas') {
      list = list.filter(a => (a.category || 'outros') === category);
    }
    if (sortMode === 'uso') {
      list.sort((a, b) => (usageByApp.get(b.id) || 0) - (usageByApp.get(a.id) || 0));
    } else {
      list.sort((a, b) => String(a.category || 'outros').localeCompare(String(b.category || 'outros')) || String(a.name || '').localeCompare(String(b.name || '')));
    }
    return list;
  }, [apps, search, category, sortMode, usageByApp]);

  const openPaymentModal = (app) => {
    setPayModal({ open: true, app, loading: false, error: '' });
  };

  const closePaymentModal = () => setPayModal({ open: false, app: null, loading: false, error: '' });

  const startCheckout = async () => {
    if (!payModal.app) return;
    try {
      setPayModal(s => ({ ...s, loading: true, error: '' }));
      const { init_point } = await apiRequest(`/api/apps/${encodeURIComponent(payModal.app.id)}/purchase`, { method: 'POST' });
      if (init_point) window.open(init_point, '_blank', 'noopener');
      else setPayModal(s => ({ ...s, error: 'Não foi possível iniciar o checkout' }));
    } catch (e) {
      setPayModal(s => ({ ...s, error: e.message || 'Erro ao iniciar pagamento' }));
    } finally {
      setPayModal(s => ({ ...s, loading: false }));
    }
  };

  const checkPaymentStatus = async () => {
    if (!payModal.app) return;
    try {
      setPayModal(s => ({ ...s, checking: true, downloadError: '', status: 'checking' }));
      const res = await getPurchaseStatus(payModal.app.id);
      const status = res?.status || res?.data?.status || 'unknown';
      if (status === 'approved' || status === 'paid') {
        setPayModal(s => ({ ...s, status: 'approved', checking: false }));
        await downloadWithProgress(payModal.app);
      } else if (status === 'pending') {
        setPayModal(s => ({ ...s, status: 'pending', checking: false }));
      } else {
        setPayModal(s => ({ ...s, status: 'unknown', checking: false }));
      }
    } catch (e) {
      setPayModal(s => ({ ...s, checking: false, downloadError: e.message || 'Erro ao verificar pagamento' }));
    }
  };

  const downloadWithProgress = async (app) => {
    try {
      setPayModal(s => ({ ...s, status: 'downloading', progress: 0, downloadError: '' }));
      let token = null;
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('cc_session') : null;
        if (raw) { const session = JSON.parse(raw); token = session?.token || null; }
      } catch {
        token = null;
      }
      const resp = await fetch(`${API_BASE_URL}/api/apps/${encodeURIComponent(app.id)}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: '{}'
      });
      if (!resp.ok) {
        const statusResp = await fetch(`${API_BASE_URL}/api/apps/${encodeURIComponent(app.id)}/purchase/status?status=approved`);
        if (!statusResp.ok) throw new Error(`Falha no download (HTTP ${resp.status})`);
        const js = await statusResp.json().catch(() => ({}));
        const directUrl = resolveDownloadUrl(js?.download_url || js?.data?.download_url || null);
        if (!directUrl) throw new Error('Download não liberado. Pagamento não aprovado.');
        window.location.href = directUrl;
        setPayModal(s => ({ ...s, status: 'done', progress: 100 }));
        return;
      }
      const js = await resp.json().catch(() => ({}));
      const directUrl = resolveDownloadUrl(js?.download_url || null);
      if (!directUrl) throw new Error('Aplicativo sem URL de executável configurada');
      window.location.href = directUrl;
      setPayModal(s => ({ ...s, status: 'done', progress: 100 }));
    } catch (e) {
      setPayModal(s => ({ ...s, status: 'error', downloadError: e.message || 'Erro no download' }));
    }
  };

  const needsLicense = (a) => {
    const name = String(a.name || '').toLowerCase();
    return name === 'coincraft' || a.requiresLicense || a.licenseRequired || (a.license && a.license.required);
  };

  const toggleLicense = (id) => {
    setExpandedLicenses(s => ({ ...s, [id]: !s[id] }));
  };

  const handlePublish = async (project) => {
    try {
      setPublishing(true);
      setPublishMessage('Publicando...');
      await upsertAppFromProject(project.id, {
        price: project.price ?? 0,
        mainFeature: project.description ?? project.title
      });
      setPublishMessage('Projeto publicado com sucesso!');
      const jsonApps = await getPublicApps({ page: 1, pageSize: 24, sortBy: 'updatedAt' });
      const list = Array.isArray(jsonApps?.data) ? jsonApps.data : (Array.isArray(jsonApps) ? jsonApps : []);
      setApps(list);
    } catch (e) {
      setPublishMessage(e.message || 'Erro ao publicar projeto');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.content}>
        {/* Hero Section */}
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Explore nossos <span className={styles.heroAccent}>Aplicativos</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Soluções profissionais desenvolvidas pela comunidade CodeCraft. Prontas para usar.
          </p>
        </header>

        {/* Filters Section */}
        <section className={styles.filtersSection}>
          <div className={styles.filtersContainer}>
            <input
              type="text"
              placeholder="Buscar aplicativos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
              aria-label="Buscar aplicativos"
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={styles.filterSelect}
              aria-label="Filtrar por categoria"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value)}
              className={styles.filterSelect}
              aria-label="Ordenar por"
            >
              <option value="categoria">Categoria</option>
              <option value="uso">Uso frequente</option>
            </select>
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Carregando aplicativos...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={styles.errorState}>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {/* Apps Grid */}
        <section className={styles.appsSection}>
          {apps.length === 0 && !loading ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <h3 className={styles.emptyTitle}>Nenhum aplicativo disponível</h3>
              <p className={styles.emptyText}>
                Volte em breve para conferir novos aplicativos da comunidade.
              </p>
            </div>
          ) : (
            <div className={styles.appsGrid}>
              {filteredApps.map((app, index) => (
                <div key={app.id} className={styles.appCardWrapper}>
                  <AppCard
                    app={app}
                    onDownload={openPaymentModal}
                    featured={index === 0 && filteredApps.length > 1}
                  />
                  {needsLicense(app) && (
                    <>
                      <button
                        className={styles.licenseToggleBtn}
                        onClick={() => toggleLicense(app.id)}
                      >
                        {expandedLicenses[app.id] ? 'Ocultar Ativação' : 'Ativar Licença'}
                      </button>
                      {expandedLicenses[app.id] && (
                        <div className={styles.licenseExpanded}>
                          <LicenseActivator appId={app.id} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* History Section */}
        <section className={styles.historySection}>
          <div className={styles.historyCard}>
            <h2 className={styles.historyTitle}>Histórico de compras e downloads</h2>

            {history.length === 0 ? (
              <p className={styles.historyEmpty}>Sem histórico de compras ou downloads.</p>
            ) : (
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>App</th>
                    <th>Tipo</th>
                    <th>Data</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td>{h.app_name || h.appId}</td>
                      <td>{h.type}</td>
                      <td>{h.date ? new Date(h.date).toLocaleString('pt-BR') : '—'}</td>
                      <td>{h.status || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Security & Installation Section */}
      <SecuritySection />

      {/* Payment Modal */}
      {payModal.open && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Pagamento do aplicativo">
          <div className={styles.modal}>
            <button className={styles.modalClose} onClick={closePaymentModal} aria-label="Fechar">
              ✕
            </button>

            <h3 className={styles.modalTitle}>{payModal.app?.name}</h3>
            <p className={styles.modalDescription}>{payModal.app?.mainFeature}</p>
            <p className={styles.modalPrice}>
              {(() => {
                const p = getAppPrice(payModal.app || {});
                return p > 0 ? `R$ ${p.toLocaleString('pt-BR')}` : 'Gratuito';
              })()}
            </p>

            {payModal.error && <div className={styles.modalError}>{payModal.error}</div>}

            <div className={styles.modalActions}>
              <button
                className={styles.btnCheckout}
                onClick={startCheckout}
                disabled={payModal.loading}
              >
                {payModal.loading ? 'Processando...' : 'Finalizar Compra Segura'}
              </button>

              <div className={styles.modalSecondaryActions}>
                <button
                  className={styles.btnGhost}
                  onClick={checkPaymentStatus}
                  disabled={payModal.checking}
                >
                  {payModal.checking ? 'Verificando...' : 'Já paguei — verificar status'}
                </button>
                <button
                  className={styles.btnGhost}
                  onClick={() => window.open(`/apps/${payModal.app?.id}/compra`, '_blank', 'noopener')}
                >
                  Ver página do produto
                </button>
              </div>
            </div>

            {payModal.status === 'pending' && (
              <div className={styles.modalInfo}>
                Pagamento pendente. Conclua o pagamento e clique em "verificar status".
              </div>
            )}

            {payModal.status === 'approved' && (
              <LicenseActivator appId={payModal.app?.id} />
            )}

            {(payModal.status === 'downloading' || payModal.status === 'done') && (
              <div className={styles.progressContainer} aria-live="polite">
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${payModal.progress}%` }} />
                </div>
                <p className={styles.progressText}>
                  {payModal.status === 'done' ? 'Download concluído!' : `Baixando... ${payModal.progress}%`}
                </p>
              </div>
            )}

            {payModal.downloadError && <div className={styles.modalError}>{payModal.downloadError}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppsPage;
