import React, { useState } from 'react';

import { apiRequest } from '../lib/apiConfig.js';

export default function LicenseActivator({ appId }) {
  const [hardwareId, setHardwareId] = useState('');
  const [license, setLicense] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const activate = async () => {
    setError('');
    setLicense('');
    if (!hardwareId || !appId) { setError('Preencha o Hardware ID.'); return; }
    setLoading(true);
    try {
      const json = await apiRequest('/api/licenses/activate', {
        method: 'POST',
        body: JSON.stringify({ appId: Number(appId), hardwareId: String(hardwareId).trim() })
      });
      if (!json?.success) {
        setError(json?.error || 'Falha ao gerar licença');
      } else {
        setLicense(json.license_key || json.data?.license_key || '');
      }
    } catch (e) {
      setError(e?.message || 'Erro de rede');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 12, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:12 }}>
      <h3 className="title" style={{ fontSize:'1rem' }}>Ativação de Licença Offline</h3>
      <p className="muted">Cole abaixo o seu Hardware ID para gerar a licença deste app.</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, alignItems:'center', marginTop:8 }}>
        <input
          className="input"
          placeholder="Ex: HWID-ABC123..."
          value={hardwareId}
          onChange={e=>setHardwareId(e.target.value)}
          aria-label="Hardware ID"
        />
        <button className="btn btn-primary" onClick={activate} disabled={loading}>
          {loading ? 'Gerando…' : 'Gerar Licença'}
        </button>
      </div>
      {error && <p role="alert" style={{ color:'#FF6B6B', marginTop:8 }}>❌ {error}</p>}
      {license && (
        <div style={{ marginTop:8 }}>
          <label className="muted">Licença Gerada</label>
          <textarea
            readOnly
            value={license}
            rows={3}
            style={{ width:'100%', padding:10, borderRadius:10, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(0,0,0,0.25)', color:'var(--texto-branco)' }}
          />
        </div>
      )}
    </div>
  );
}
