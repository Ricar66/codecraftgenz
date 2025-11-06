// src/pages/AppsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AppCard from '../components/AppCard/AppCard';
import Navbar from '../components/Navbar/Navbar';
import { getMyApps, getHistory, upsertAppFromProject } from '../services/appsAPI.js';
import { getProjects } from '../services/projectsAPI.js';
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Métrica de carregamento
        const metricId = `apps-load-${Date.now()}`;
        globalPerformanceMonitor.startMeasure(metricId, { page: 1, pageSize: 24 });

        // Cache em memória
        const cacheKey = appsCache.generateKey('my-apps', { page: 1, pageSize: 24 });
        const cached = appsCache.get(cacheKey);
        let jsonApps;
        if (cached) {
          jsonApps = cached;
        } else {
          jsonApps = await getMyApps({ page: 1, pageSize: 24, sortBy: 'updatedAt' });
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
      const jsonApps = await getMyApps({ page: 1, pageSize: 24, sortBy: 'updatedAt' });
      const list = Array.isArray(jsonApps?.data) ? jsonApps.data : (Array.isArray(jsonApps) ? jsonApps : []);
      setApps(list);
    } catch (e) {
      setPublishMessage(e.message || 'Erro ao publicar projeto');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="apps-page">
      <Navbar />
      <header className="apps-header">
        <h1>Meus Aplicativos</h1>
        <p>Aplicativos finalizados com base em seus projetos.</p>
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-outline" onClick={() => setShowPublish(v=>!v)}>
            {showPublish ? 'Fechar publicação' : 'Publicar projeto'}
          </button>
        </div>
      </header>

      {loading && <p className="muted">🔄 Carregando seus apps…</p>}
      {error && <p role="alert" style={{ color: '#FF6B6B' }}>❌ {error}</p>}

      <section className="apps-grid">
        {apps.length === 0 && !loading ? (
          <div className="card-empty">Nenhum aplicativo disponível no momento.</div>
        ) : (
          apps.map(app => <AppCard key={app.id} app={app} />)
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
                <tr key={i}><td>{h.app_name || h.appId}</td><td>{h.type}</td><td>{h.date ? new Date(h.date).toLocaleString('pt-BR') : '—'}</td><td>{h.status || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .apps-page { min-height: 100vh; }
        .apps-header { max-width: 1100px; margin: 12px auto; padding: 0 12px; }
        .apps-header h1 { color: var(--texto-branco); margin: 0; }
        .apps-header p { color: var(--texto-gelo); margin-top: 4px; }
        .apps-grid { max-width: 1100px; margin: 16px auto; padding: 12px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (max-width: 768px) { .apps-grid { grid-template-columns: 1fr; } }
        .card-empty { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 24px; text-align: center; color: var(--texto-gelo); }
        .apps-history { max-width: 1100px; margin: 8px auto; padding: 12px; }
        .history-title { color: var(--texto-branco); margin: 0 0 8px; }
        .publish-section { max-width: 1100px; margin: 16px auto; padding: 12px; }
        .publish-title { color: var(--texto-branco); margin: 0 0 12px; }
        .projects-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (max-width: 768px) { .projects-grid { grid-template-columns: 1fr; } }
        .project-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px; display: grid; grid-template-columns: 1fr auto; gap: 12px; }
        .project-title { margin: 0; color: var(--texto-branco); font-size: 1rem; }
        .project-desc { color: var(--texto-gelo); font-size: 0.9rem; }
        .project-actions { display:flex; align-items:center; }
        .btn { padding: 8px 12px; border-radius: 8px; border:1px solid rgba(255,255,255,0.18); }
        .btn-primary { background: #00E4F2; color: #000; }
        .btn-outline { background: transparent; color: var(--texto-branco); }
      `}</style>
    </div>
  );
};

export default AppsPage;