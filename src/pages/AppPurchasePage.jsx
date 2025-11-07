// src/pages/AppPurchasePage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar';
import { API_BASE_URL } from '../lib/apiConfig.js';
import { getAppById, createPaymentPreference, getPurchaseStatus, registerDownload, submitFeedback } from '../services/appsAPI.js';

const AppPurchasePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // idle | downloading | done | error
  const [downloadError, setDownloadError] = useState('');
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const json = await getAppById(id);
        if (mounted) setApp(json?.data || json);
      } catch (e) { setError(e.message || 'Erro ao carregar app'); }
      finally { setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    const prefId = searchParams.get('preference_id');
    const paymentId = searchParams.get('payment_id');
    const statusParam = searchParams.get('status');
    if (prefId || paymentId || statusParam) {
      (async () => {
        try {
          const s = await getPurchaseStatus(id, { preference_id: prefId, payment_id: paymentId, status: statusParam });
          const resolvedStatus = s?.status || statusParam || '';
          setStatus(resolvedStatus);
          if (resolvedStatus === 'approved') {
            if (s?.download_url) setDownloadUrl(s.download_url);
            // Dispara download automático
            autoDownload();
          }
        } catch (e) {
          console.warn('Erro ao consultar status:', e);
        }
      })();
    }
  }, [id, searchParams]);

  const startCheckout = async () => {
    try {
      const { init_point } = await createPaymentPreference(id);
      // Abre o checkout do Mercado Livre/Mercado Pago em nova aba
      if (init_point) window.open(init_point, '_blank', 'noopener');
      else alert('Não foi possível iniciar o checkout');
    } catch (e) { setError(e.message || 'Erro ao iniciar pagamento'); }
  };

  const handleDownload = async () => {
    try {
      const json = await registerDownload(id);
      const url = json?.download_url || downloadUrl;
      if (url) window.open(url, '_blank', 'noopener');
      else alert('Download ainda não liberado');
    } catch (e) { alert('Erro ao registrar download: ' + e.message); }
  };

  const autoDownload = async () => {
    try {
      setDownloadError('');
      setDownloadStatus('downloading');
      setProgress(0);
      // Tenta baixar via streaming para mostrar progresso (fallback para arrayBuffer)
      let token = null;
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('cc_session') : null;
        if (raw) { const session = JSON.parse(raw); token = session?.token || null; }
      } catch { token = null; }

      const resp = await fetch(`${API_BASE_URL}/api/apps/${encodeURIComponent(id)}/download`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!resp.ok) throw new Error(`Falha no download (HTTP ${resp.status})`);
      const total = Number(resp.headers.get('content-length')) || 0;
      const reader = resp.body?.getReader ? resp.body.getReader() : null;
      const chunks = [];
      let received = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total > 0) setProgress(Math.min(100, Math.round((received / total) * 100)));
          else setProgress(p => Math.min(100, (p || 0) + 3));
        }
      }
      const blob = new Blob(chunks.length ? chunks : [await resp.arrayBuffer()], { type: resp.headers.get('content-type') || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(app?.name || 'aplicativo').replace(/[^a-z0-9\-_.]/gi, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setProgress(100);
      setDownloadStatus('done');
      console.info('[Download] concluído para app', id);
    } catch (e) {
      setDownloadError(e.message || 'Erro no download');
      setDownloadStatus('error');
      console.error('[Download] erro', e);
    }
  };

  const sendFeedback = async () => {
    try {
      await submitFeedback(id, feedback);
      alert('Obrigado pelo feedback!');
      setFeedback({ rating: 5, comment: '' });
    } catch (e) {
      alert('Erro ao enviar feedback: ' + e.message);
    }
  };

  return (
    <div className="purchase-page">
      <Navbar />
      <div className="purchase-card">
        {loading ? (
          <p className="muted">Carregando…</p>
        ) : error ? (
          <p role="alert" style={{ color: '#FF6B6B' }}>❌ {error}</p>
        ) : (
          <>
            <h1 className="title">{app?.name || app?.titulo}</h1>
            <p className="muted">{app?.description || app?.mainFeature}</p>
            <p className="price">Preço: {app?.price ? `R$ ${Number(app.price).toLocaleString('pt-BR')}` : 'a definir'}</p>

            <div className="btn-group" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn btn-primary" onClick={startCheckout}>Pagar com Mercado Livre</button>
              <button className="btn btn-outline" onClick={handleDownload} disabled={!downloadUrl && status!=='approved'}>Baixar executável</button>
            </div>
            {status && <p className="muted">Status da compra: {status}</p>}

            {(downloadStatus === 'downloading' || downloadStatus === 'done') && (
              <div aria-live="polite" className="progress-wrap" style={{ marginTop: 12 }}>
                <div className="progress-bar"><div className="progress" style={{ width: `${progress}%` }} /></div>
                <p className="muted">{downloadStatus === 'done' ? 'Download concluído!' : `Baixando… ${progress}%`}</p>
              </div>
            )}
            {downloadError && <p role="alert" style={{ color: '#FF6B6B' }}>❌ {downloadError}</p>}

            {status === 'approved' && (
              <section style={{ marginTop: 12 }}>
                <h3 className="title" style={{ fontSize:'1rem' }}>Avalie este aplicativo</h3>
                <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'center' }}>
                  <label>
                    Nota
                    <select value={feedback.rating} onChange={e=>setFeedback({ ...feedback, rating:Number(e.target.value) })} style={{ marginLeft:8 }}>
                      {[5,4,3,2,1].map(n=> <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <input placeholder="Comentário" value={feedback.comment} onChange={e=>setFeedback({ ...feedback, comment:e.target.value })} />
                </div>
                <button className="btn btn-outline" style={{ marginTop:8 }} onClick={sendFeedback}>Enviar feedback</button>
              </section>
            )}
          </>
        )}
      </div>

      <style>{`
        .purchase-page { min-height: 100vh; }
        .purchase-card { max-width: 800px; margin: 16px auto; padding: 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; }
        .title { color: var(--texto-branco); margin: 0 0 6px; }
        .muted { color: var(--texto-gelo); }
        .price { color: var(--texto-branco); font-weight: 600; }
        .btn { padding: 8px 12px; border-radius: 8px; border:1px solid rgba(255,255,255,0.18); transition: transform .12s ease, box-shadow .12s ease; }
        .btn-primary { background: #00E4F2; color: #000; }
        .btn-outline { background: transparent; color: var(--texto-branco); }
        .btn:active { transform: translateY(0px) scale(0.98); }
        .progress-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.12); border-radius: 999px; overflow: hidden; }
        .progress { height: 100%; background: linear-gradient(90deg, #D12BF2, #00E4F2); }
      `}</style>
    </div>
  );
};

export default AppPurchasePage;