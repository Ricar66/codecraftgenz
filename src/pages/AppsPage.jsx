// src/pages/AppsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AppCard from '../components/AppCard/AppCard';
import LicenseActivator from '../components/LicenseActivator.jsx';
import Navbar from '../components/Navbar/Navbar';
import { API_BASE_URL, apiRequest } from '../lib/apiConfig.js';
import { getHistory, upsertAppFromProject, getPublicApps, getPurchaseStatus } from '../services/appsAPI.js';
import { getProjects } from '../services/projectsAPI.js';
import { getAppPrice } from '../utils/appModel.js';
import { appsCache } from '../utils/dataCache.js';
import { globalPerformanceMonitor } from '../utils/performanceMonitor.js';

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
  const [sortMode, setSortMode] = useState('categoria'); // 'categoria' | 'uso'
  const [payModal, setPayModal] = useState({ open: false, app: null, loading: false, error: '' });
  const [expandedLicenses, setExpandedLicenses] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Métrica de carregamento
        const metricId = `apps-load-${Date.now()}`;
        globalPerformanceMonitor.startMeasure(metricId, { page: 1, pageSize: 24 });

        // Cache em memória
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
        const jsonHist = await getHistory({ page: 1, pageSize: 10 }).catch(()=>({ data: [] }));
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

  // Carrega projetos para publicação quando modal abre
  useEffect(() => {
    if (!showPublish) return;
    let mounted = true;
    (async () => {
      try {
        const res = await getProjects({ page: 1, limit: 12, sortBy: 'updatedAt', publicOnly: false });
        const list = Array.isArray(res?.data) ? res.data : [];
        if (mounted) setProjects(list);
      } catch (e) {
        console.warn('Erro ao carregar projetos para publicação:', e);
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
      list = list.filter(a => String(a.name||'').toLowerCase().includes(q) || String(a.mainFeature||'').toLowerCase().includes(q));
    }
    if (category !== 'todas') {
      list = list.filter(a => (a.category || 'outros') === category);
    }
    if (sortMode === 'uso') {
      list.sort((a,b)=> (usageByApp.get(b.id)||0) - (usageByApp.get(a.id)||0));
    } else {
      list.sort((a,b)=> String(a.category||'outros').localeCompare(String(b.category||'outros')) || String(a.name||'').localeCompare(String(b.name||'')));
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
        // Fallback: se não autenticado ou erro, tenta obter URL pelo status
        const statusResp = await fetch(`${API_BASE_URL}/api/apps/${encodeURIComponent(app.id)}/purchase/status?status=approved`);
        if (!statusResp.ok) throw new Error(`Falha no download (HTTP ${resp.status})`);
        const js = await statusResp.json().catch(()=>({}));
        const directUrl = js?.download_url || js?.data?.download_url || null;
        if (!directUrl) throw new Error('Download não liberado. Pagamento não aprovado.');
        window.location.href = directUrl;
        setPayModal(s => ({ ...s, status: 'done', progress: 100 }));
        return;
      }
      const js = await resp.json().catch(()=>({}));
      const directUrl = js?.download_url || null;
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
      setPublishMessage('Publicando…');
      await upsertAppFromProject(project.id, {
        price: project.price ?? 0,
        mainFeature: project.description ?? project.title
      });
      setPublishMessage('Projeto publicado com sucesso!');
      // Recarrega lista de apps
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
    <div className="apps-page page-with-background">
      <Navbar />
      <div className="apps-content">
      <header className="apps-header">
        <h1>Meus Aplicativos</h1>
        <p>Baixe e compre seus apps com visual profissional.</p>
        <div className="apps-actions">
          <button className="btn btn-primary" onClick={() => setShowPublish(v=>!v)}>
            {showPublish ? 'Fechar publicação' : 'Publicar projeto'}
          </button>
        </div>
        <div className="apps-filters" role="search">
          <input aria-label="Buscar aplicativos" className="input" placeholder="Buscar aplicativos" value={search} onChange={e=>setSearch(e.target.value)} />
          <select aria-label="Filtrar por categoria" className="select" value={category} onChange={e=>setCategory(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Ordenar" className="select" value={sortMode} onChange={e=>setSortMode(e.target.value)}>
            <option value="categoria">Categoria</option>
            <option value="uso">Uso frequente</option>
          </select>
        </div>
      </header>

      {loading && <p className="muted">🔄 Carregando seus apps…</p>}
      {error && <p role="alert" style={{ color: '#FF6B6B' }}>❌ {error}</p>}

      <section className="apps-grid">
        {apps.length === 0 && !loading ? (
          <div className="card-empty">Nenhum aplicativo disponível no momento.</div>
        ) : (
          filteredApps.map(app => (
            <div key={app.id}>
              <AppCard app={app} onDownload={openPaymentModal} />
              {needsLicense(app) && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-outline" onClick={() => toggleLicense(app.id)}>
                    {expandedLicenses[app.id] ? 'Ocultar Ativação' : 'Ativar Licença'}
                  </button>
                  {expandedLicenses[app.id] && (
                    <div style={{ marginTop: 8 }}>
                      <LicenseActivator appId={app.id} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {showPublish && (
        <section className="publish-section">
          <h2 className="publish-title">Publicar a partir de projetos</h2>
          {publishMessage && <p className="muted">{publishMessage}</p>}
          <div className="projects-grid">
            {projects.length === 0 ? (
              <div className="card-empty">Nenhum projeto disponível para publicar.</div>
            ) : (
              projects.map(p => (
                <div key={p.id} className="project-card">
                  <div>
                    <h3 className="project-title">{p.title}</h3>
                    <p className="project-desc">{p.description}</p>
                  </div>
                  <div className="project-actions">
                    <button className="btn btn-primary" disabled={publishing} onClick={() => handlePublish(p)}>
                      Publicar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <section className="apps-history">
        <h2 className="history-title">Histórico de compras e downloads</h2>
        <div className="table">
          <table>
            <thead><tr><th>App</th><th>Tipo</th><th>Data</th><th>Status</th></tr></thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="4">Sem histórico</td></tr>
              ) : history.map((h,i)=> (
                <tr key={i}>
                  <td data-label="App">{h.app_name || h.appId}</td>
                  <td data-label="Tipo">{h.type}</td>
                  <td data-label="Data">{h.date ? new Date(h.date).toLocaleString('pt-BR') : '—'}</td>
                  <td data-label="Status">{h.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .apps-page { min-height: 100vh; display:flex; flex-direction:column; }
        .apps-content { flex:1; display:block; }
        .apps-header { max-width: 1200px; margin: 24px auto; padding: 0 16px; text-align: center; }
        .apps-header h1 { color: var(--texto-branco); margin: 0; font-size: 2rem; }
        .apps-header p { color: var(--texto-gelo); margin-top: 6px; font-size: 1rem; }
        .apps-actions { margin-top: 16px; display:flex; justify-content:center; }
        .apps-filters { margin-top: 16px; display:flex; gap: 8px; justify-content:center; flex-wrap: wrap; }
        .input, .select { padding: 10px 12px; border-radius: 10px; border:1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.06); color: var(--texto-branco); }
        .apps-grid { max-width: 1200px; margin: 20px auto; padding: 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 992px) { .apps-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .apps-grid { grid-template-columns: 1fr; } }
        .card-empty { background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.14); border-radius: 16px; padding: 28px; text-align: center; color: var(--texto-gelo); }
        .apps-history { max-width: 1200px; margin: 16px auto; padding: 16px; }
        .history-title { color: var(--texto-branco); margin: 0 0 8px; }
        .publish-section { max-width: 1200px; margin: 24px auto; padding: 16px; }
        .publish-title { color: var(--texto-branco); margin: 0 0 12px; }
        .projects-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 992px) { .projects-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .projects-grid { grid-template-columns: 1fr; } }
        .project-card { background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.14); border-radius: 16px; padding: 16px; display: grid; grid-template-columns: 1fr auto; gap: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.25); }
        .project-title { margin: 0; color: var(--texto-branco); font-size: 1rem; }
        .project-desc { color: var(--texto-gelo); font-size: 0.9rem; }
        .project-actions { display:flex; align-items:center; }
        .btn { padding: 10px 14px; border-radius: 10px; border:1px solid rgba(255,255,255,0.18); cursor:pointer; transition: transform .2s ease, box-shadow .2s ease; }
        .btn-primary { background: linear-gradient(90deg, #D12BF2, #00E4F2); color: #000; border:none; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 10px 18px rgba(0,0,0,0.25); }
        .btn-outline { background: transparent; color: var(--texto-branco); }
        .apps-footer { border-top: 1px solid rgba(255,255,255,0.12); background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)); }
        .footer-container { max-width: 1200px; margin: 0 auto; padding: 16px; display:flex; align-items:center; justify-content: space-between; gap: 12px; }
        .footer-brand { color: var(--texto-branco); font-weight: 800; letter-spacing: 0.5px; }
        .footer-links { display:flex; gap: 12px; }
        .footer-links a { color: var(--texto-gelo); }
        .footer-links a:hover { color: var(--cor-terciaria); }
        .footer-note { color: var(--texto-gelo); opacity: 0.8; }
        @media (max-width: 640px) { .footer-container { flex-direction: column; align-items: flex-start; } }
      `}</style>

      {payModal.open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Pagamento do aplicativo">
          <div className="modal">
            <h3 className="title">{payModal.app?.name}</h3>
            <p className="muted">{payModal.app?.mainFeature}</p>
            <p className="price">Preço: {(() => { const p = getAppPrice(payModal.app||{}); return p > 0 ? `R$ ${p.toLocaleString('pt-BR')}` : 'a definir'; })()}</p>
            {payModal.error && <p role="alert" style={{ color: '#FF6B6B' }}>❌ {payModal.error}</p>}
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <button className="btn btn-primary" onClick={startCheckout} disabled={payModal.loading}>
                {payModal.loading ? 'Iniciando...' : 'Pagar com Mercado Livre'}
              </button>
              <button className="btn btn-outline" onClick={checkPaymentStatus} disabled={payModal.checking}>
                {payModal.checking ? 'Verificando…' : 'Verificar pagamento'}
              </button>
              <button className="btn btn-outline" onClick={()=>window.open(`/apps/${payModal.app?.id}/compra`, '_blank', 'noopener')}>Ir para tela de pagamento</button>
              <button className="btn btn-outline" onClick={closePaymentModal}>Fechar</button>
            </div>
            {payModal.status === 'approved' && (
              <LicenseActivator appId={payModal.app?.id} />
            )}
            {(payModal.status === 'downloading' || payModal.status === 'done') && (
              <div aria-live="polite" className="progress-wrap">
                <div className="progress-bar"><div className="progress" style={{ width: `${payModal.progress}%` }} /></div>
                <p className="muted">{payModal.status === 'done' ? 'Download concluído!' : `Baixando… ${payModal.progress}%`}</p>
              </div>
            )}
            {payModal.downloadError && <p role="alert" style={{ color: '#FF6B6B' }}>❌ {payModal.downloadError}</p>}
          </div>
          <style>{`
            .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; padding:16px; }
            .modal { width: 100%; max-width: 520px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; }
            .title { color: var(--texto-branco); margin: 0 0 6px; }
            .price { color: var(--texto-branco); font-weight: 600; }
            .btn { padding: 8px 12px; border-radius: 8px; border:1px solid rgba(255,255,255,0.18); }
            .btn-primary { background: #00E4F2; color: #000; }
            .btn-outline { background: transparent; color: var(--texto-branco); }
            .progress-wrap { margin-top: 12px; }
            .progress-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.12); border-radius: 999px; overflow: hidden; }
            .progress { height: 100%; background: linear-gradient(90deg, #D12BF2, #00E4F2); }
          `}</style>
        </div>
      )}
      </div>
      <footer className="apps-footer">
        <div className="footer-container">
          <div className="footer-brand">CodeCraft Gen-Z</div>
          <div className="footer-links">
            <a href="/projetos">Projetos</a>
            <a href="/apps">Apps</a>
            <a href="/mentoria">Mentoria</a>
          </div>
          <div className="footer-note">Craftando ideias em software com estilo</div>
        </div>
      </footer>
    </div>
  );
};

export default AppsPage;
