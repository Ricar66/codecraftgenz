// src/admin/AdminConfig.jsx
// Pagina de configuracoes do painel Admin
import React from 'react';
import AdminCard from './components/AdminCard.jsx';
import { useLogs } from '../hooks/useAdminRepo';
import { apiRequest } from '../lib/apiConfig.js';

import './AdminCommon.css';

export default function AdminConfig() {
  const { data: logs } = useLogs();
  const [query, setQuery] = React.useState('');
  const [health, setHealth] = React.useState({ status: 'checking', db: null });

  const filtered = logs.filter(l =>
    (l.type || '').toLowerCase().includes(query.toLowerCase()) ||
    (l.message || '').toLowerCase().includes(query.toLowerCase())
  );

  // Health check do backend
  React.useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const res = await apiRequest('/health', { method: 'GET' });
        if (!cancelled) {
          setHealth({
            status: 'online',
            db: res.database || res.db || 'connected',
            uptime: res.uptime || null,
          });
        }
      } catch {
        if (!cancelled) {
          setHealth({ status: 'offline', db: 'unreachable' });
        }
      }
    };
    checkHealth();
    return () => { cancelled = true; };
  }, []);

  const glassStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };

  const labelStyle = {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8em',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
  };

  const valueStyle = {
    color: '#fff',
    fontSize: '1em',
    fontWeight: 600,
  };

  const statusDotStyle = (online) => ({
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: online ? '#00E4F2' : '#FF6B6B',
    marginRight: 8,
    boxShadow: online ? '0 0 8px rgba(0,228,242,0.5)' : '0 0 8px rgba(255,107,107,0.5)',
  });

  const colorSwatchStyle = (color) => ({
    display: 'inline-block',
    width: 20,
    height: 20,
    borderRadius: 6,
    background: color,
    border: '1px solid rgba(255,255,255,0.15)',
    verticalAlign: 'middle',
    marginRight: 8,
    boxShadow: `0 0 10px ${color}40`,
  });

  return (
    <div className="admin-content">
      <h1 className="title" style={{ marginBottom: 24 }}>Configurações</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Plataforma */}
        <AdminCard variant="default" padding="md">
          <div style={glassStyle}>
            <h3 style={{ color: '#00E4F2', margin: '0 0 16px', fontSize: '1.1em' }}>Plataforma</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={labelStyle}>Nome</div>
                <div style={valueStyle}>CodeCraft Gen-Z</div>
              </div>
              <div>
                <div style={labelStyle}>Versão</div>
                <div style={valueStyle}>1.0.0</div>
              </div>
              <div>
                <div style={labelStyle}>Ambiente</div>
                <div style={valueStyle}>
                  <span style={{
                    background: import.meta.env.DEV ? 'rgba(255,193,7,0.15)' : 'rgba(0,228,242,0.15)',
                    color: import.meta.env.DEV ? '#FFC107' : '#00E4F2',
                    padding: '3px 10px',
                    borderRadius: 8,
                    fontSize: '0.85em',
                    fontWeight: 600,
                  }}>
                    {import.meta.env.DEV ? 'Development' : 'Production'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Tema */}
        <AdminCard variant="default" padding="md">
          <div style={glassStyle}>
            <h3 style={{ color: '#D12BF2', margin: '0 0 16px', fontSize: '1.1em' }}>Tema</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={labelStyle}>Tema atual</div>
                <div style={valueStyle}>Dark (Glassmorphism)</div>
              </div>
              <div>
                <div style={labelStyle}>Cores primárias</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={colorSwatchStyle('#00E4F2')} />
                    <span style={{ color: '#fff', fontWeight: 500 }}>Azul Elétrico</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8, fontSize: '0.85em', fontFamily: 'monospace' }}>#00E4F2</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={colorSwatchStyle('#D12BF2')} />
                    <span style={{ color: '#fff', fontWeight: 500 }}>Magenta</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8, fontSize: '0.85em', fontFamily: 'monospace' }}>#D12BF2</span>
                  </div>
                </div>
              </div>
              <div>
                <div style={labelStyle}>Paleta base</div>
                <div style={{ ...valueStyle, color: 'rgba(255,255,255,0.5)', fontSize: '0.9em' }}>Bloqueada (design system)</div>
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Status do Sistema */}
        <AdminCard variant="default" padding="md">
          <div style={glassStyle}>
            <h3 style={{ color: '#00E4F2', margin: '0 0 16px', fontSize: '1.1em' }}>Status do Sistema</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={labelStyle}>API URL</div>
                <div style={{ ...valueStyle, fontSize: '0.85em', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {import.meta.env.VITE_API_URL || 'http://localhost:3001'}
                </div>
              </div>
              <div>
                <div style={labelStyle}>API Status</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {health.status === 'checking' ? (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>Verificando...</span>
                  ) : (
                    <>
                      <span style={statusDotStyle(health.status === 'online')} />
                      <span style={{ color: health.status === 'online' ? '#00E4F2' : '#FF6B6B', fontWeight: 600 }}>
                        {health.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Banco de Dados</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {health.status === 'checking' ? (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>Verificando...</span>
                  ) : (
                    <>
                      <span style={statusDotStyle(health.db === 'connected' || health.db === 'ok')} />
                      <span style={{ color: (health.db === 'connected' || health.db === 'ok') ? '#00E4F2' : '#FF6B6B', fontWeight: 600 }}>
                        {health.db === 'connected' || health.db === 'ok' ? 'Conectado' : health.db || 'Indisponível'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Logs */}
      <AdminCard variant="default" padding="md" fullWidth>
        <div style={glassStyle}>
          <h3 style={{ color: '#00E4F2', margin: '0 0 16px', fontSize: '1.1em' }}>Logs do Sistema</h3>
          <div className="formRow" style={{ marginBottom: 12 }}>
            <input
              id="logQuery"
              aria-label="Filtro de logs"
              placeholder="Filtrar por tipo ou mensagem..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                width: '100%',
                maxWidth: 400,
              }}
            />
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <ul className="items" aria-live="polite" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {filtered.length === 0 ? (
                <li style={{ color: 'rgba(255,255,255,0.4)', padding: '12px 0' }}>Nenhum log correspondente</li>
              ) : filtered.slice(0, 50).map(l => (
                <li key={l.id} style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 12,
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  alignItems: 'center',
                }}>
                  <span style={{
                    background: l.type === 'error' ? 'rgba(255,68,68,0.15)' : l.type === 'warn' ? 'rgba(255,193,7,0.15)' : 'rgba(0,228,242,0.1)',
                    color: l.type === 'error' ? '#FF6B6B' : l.type === 'warn' ? '#FFC107' : '#00E4F2',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.75em',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}>{l.type}</span>
                  <span style={{ color: '#fff', fontSize: '0.9em' }}>{l.message}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75em', whiteSpace: 'nowrap' }}>
                    {new Date(l.at).toLocaleString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
