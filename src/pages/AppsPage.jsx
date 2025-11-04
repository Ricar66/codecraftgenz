// src/pages/AppsPage.jsx
import React, { useEffect, useState } from 'react';

import AppCard from '../components/AppCard/AppCard';
import Navbar from '../components/Navbar/Navbar';
import { getMyApps, getHistory } from '../services/appsAPI.js';

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const jsonApps = await getMyApps({ page: 1, pageSize: 24 });
        const list = Array.isArray(jsonApps?.data) ? jsonApps.data : (Array.isArray(jsonApps) ? jsonApps : []);
        if (mounted) setApps(list);
        const jsonHist = await getHistory({ page: 1, pageSize: 10 }).catch(()=>({ data: [] }));
        const histList = Array.isArray(jsonHist?.data) ? jsonHist.data : (Array.isArray(jsonHist) ? jsonHist : []);
        if (mounted) setHistory(histList);
      } catch (e) {
        setError(e.message || 'Erro ao carregar aplicativos');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="apps-page">
      <Navbar />
      <header className="apps-header">
        <h1>Meus Aplicativos</h1>
        <p>Aplicativos finalizados com base em seus projetos.</p>
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
      `}</style>
    </div>
  );
};

export default AppsPage;