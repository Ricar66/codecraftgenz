// src/pages/CacheMaintenancePage.jsx
import React, { useEffect, useState, useCallback } from 'react';

const CacheMaintenancePage = () => {
  const [logs, setLogs] = useState([]);
  const [done, setDone] = useState(false);

  const pushLog = (msg) => setLogs(prev => [...prev, msg]);

  const clearCaches = useCallback(async () => {
    try {
      // Desregistrar todos os service workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          pushLog(`Removendo Service Worker: ${reg.scope}`);
          await reg.unregister();
        }
      }
      // Limpar caches, incluindo workbox-precache-v2*
      if ('caches' in window) {
        const names = await caches.keys();
        for (const name of names) {
          pushLog(`Removendo cache: ${name}`);
          await caches.delete(name);
        }
      }
      setDone(true);
      pushLog('Service Workers e caches limpos. Recarregue a página.');
    } catch (e) {
      pushLog('Erro ao limpar caches: ' + (e?.message || String(e)));
    }
  }, []);

  useEffect(() => {
    // Executa automaticamente ao abrir a página
    clearCaches();
  }, [clearCaches]);

  return (
    <div className="cache-page" style={{ maxWidth: 800, margin: '24px auto', padding: 16 }}>
      <h1 style={{ color: 'var(--texto-branco)' }}>Limpeza de Cache</h1>
      <p className="muted">Executando manutenção de Service Workers e caches antigos (workbox-precache-v2, etc.).</p>
      <button className="btn btn-outline" onClick={clearCaches} disabled={done}>
        {done ? 'Concluído' : 'Executar novamente'}
      </button>
      <div style={{ marginTop: 12 }}>
        <pre style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 12, color: 'var(--texto-gelo)' }}>
          {logs.join('\n')}
        </pre>
      </div>
    </div>
  );
};

export default CacheMaintenancePage;