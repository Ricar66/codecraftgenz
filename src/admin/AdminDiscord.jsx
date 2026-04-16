// src/admin/AdminDiscord.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, RefreshCw, Save, X } from 'lucide-react';

import { useToast } from '../components/UI/Toast';
import { getBotStatus, getBotConfig, updateBotConfig, getBotLogs, triggerBotAction } from '../services/discordAPI.js';

const glassStyle = {
  background: 'rgba(26, 26, 46, 0.6)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18,
  padding: 24,
  backdropFilter: 'blur(10px)',
};

const cardHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18,
};

const AVAILABLE_STACKS = [
  'React', 'Node.js', 'Python', 'Java', 'TypeScript', 'Vue', 'Angular', 'Docker', 'AWS', 'Go',
];

const ACTION_LABELS = {
  news_posted: 'Noticia postada',
  vaga_posted: 'Vaga postada',
  ranking_posted: 'Ranking postado',
  welcome_sent: 'Boas-vindas enviadas',
  role_assigned: 'Cargo atribuido',
  challenge_posted: 'Desafio postado',
  app_posted: 'App postado',
};

export default function AdminDiscord() {
  const toast = useToast();

  // --- Status ---
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const statusInterval = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getBotStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    statusInterval.current = setInterval(fetchStatus, 30000);
    return () => clearInterval(statusInterval.current);
  }, [fetchStatus]);

  // --- Config ---
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await getBotConfig();
      setConfig(data);
    } catch {
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleToggle = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      await updateBotConfig(config);
      toast.success('Configuracoes salvas!');
    } catch {
      toast.error('Erro ao salvar configuracoes');
    } finally {
      setConfigSaving(false);
    }
  };

  // --- Stacks filter ---
  const stacksFilter = (() => {
    try {
      if (!config?.vagas_stacks_filter) return [];
      if (Array.isArray(config.vagas_stacks_filter)) return config.vagas_stacks_filter;
      return JSON.parse(config.vagas_stacks_filter);
    } catch { return []; }
  })();

  const toggleStack = (stack) => {
    const current = stacksFilter;
    const next = current.includes(stack)
      ? current.filter(s => s !== stack)
      : [...current, stack];
    setConfig(prev => ({ ...prev, vagas_stacks_filter: next }));
  };

  // --- Triggers ---
  const [triggerLoading, setTriggerLoading] = useState({});

  const handleTrigger = async (action, label) => {
    setTriggerLoading(prev => ({ ...prev, [action]: true }));
    try {
      await triggerBotAction(action);
      toast.success(`${label} executado com sucesso!`);
    } catch {
      toast.error(`Erro ao executar ${label}`);
    } finally {
      setTriggerLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  // --- Logs ---
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);

  const fetchLogs = useCallback(async (page) => {
    setLogsLoading(true);
    try {
      const data = await getBotLogs(page);
      setLogs(data.items || data.logs || data.data || []);
      setLogsTotal(data.total || 0);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(logsPage); }, [logsPage, fetchLogs]);

  const isOnline = status?.online || status?.status === 'online';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Bot size={28} style={{ color: '#D12BF2' }} />
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F5F5F7', margin: 0 }}>Discord Bot</h1>
      </div>

      {/* Card: Status do Bot */}
      <div style={glassStyle}>
        <div style={cardHeader}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F5F7', margin: 0 }}>Status do Bot</h2>
          <button
            onClick={() => { setStatusLoading(true); fetchStatus(); }}
            disabled={statusLoading}
            style={btnStyle}
          >
            <RefreshCw size={14} style={{ animation: statusLoading ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 12, height: 12, borderRadius: '50%',
            background: isOnline ? '#22c55e' : '#ef4444',
            boxShadow: isOnline ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
            display: 'inline-block',
          }} />
          <span style={{ color: '#F5F5F7', fontWeight: 500 }}>
            {statusLoading ? 'Verificando...' : isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        {isOnline && status && (
          <div style={{ display: 'flex', gap: 24, marginTop: 12, color: '#a0a0b0', fontSize: '0.9rem' }}>
            {status.uptime && <span>Uptime: {status.uptime}</span>}
            {status.ping != null && <span>Ping: {status.ping}ms</span>}
          </div>
        )}
      </div>

      {/* Card: Features */}
      <div style={glassStyle}>
        <div style={cardHeader}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F5F7', margin: 0 }}>Features</h2>
        </div>
        {configLoading ? (
          <p style={{ color: '#a0a0b0' }}>Carregando...</p>
        ) : config ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'news_enabled', label: 'Noticias Tech' },
                { key: 'vagas_enabled', label: 'Vagas Dev' },
                { key: 'welcome_enabled', label: 'Boas-vindas' },
                { key: 'ranking_enabled', label: 'Ranking Semanal' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => handleToggle(key)}
                    style={{
                      background: config[key] ? '#22c55e' : '#4b5563',
                      border: 'none',
                      borderRadius: 14,
                      width: 44,
                      height: 24,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 2,
                      left: config[key] ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                  <span style={{ color: '#F5F5F7', fontSize: '0.95rem' }}>{label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={configSaving}
              style={{ ...btnPrimaryStyle, marginTop: 18 }}
            >
              <Save size={14} />
              {configSaving ? 'Salvando...' : 'Salvar configuracoes'}
            </button>
          </>
        ) : (
          <p style={{ color: '#ef4444' }}>Erro ao carregar configuracoes</p>
        )}
      </div>

      {/* Card: Filtros de Vagas */}
      <div style={glassStyle}>
        <div style={cardHeader}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F5F7', margin: 0 }}>Filtros de Vagas</h2>
        </div>
        <p style={{ color: '#a0a0b0', fontSize: '0.85rem', margin: '0 0 12px' }}>
          Selecione as stacks para filtrar vagas postadas no Discord:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AVAILABLE_STACKS.map(stack => {
            const active = stacksFilter.includes(stack);
            return (
              <button
                key={stack}
                onClick={() => toggleStack(stack)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: active ? '1px solid #D12BF2' : '1px solid rgba(255,255,255,0.15)',
                  background: active ? 'rgba(209,43,242,0.2)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#D12BF2' : '#a0a0b0',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                {stack}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card: Triggers Manuais */}
      <div style={glassStyle}>
        <div style={cardHeader}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F5F7', margin: 0 }}>Triggers Manuais</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {[
            { action: 'news', label: 'Postar Noticias Agora', icon: '\ud83d\udcf0' },
            { action: 'vagas', label: 'Postar Vagas Agora', icon: '\ud83d\udcbc' },
            { action: 'ranking', label: 'Postar Ranking Agora', icon: '\ud83c\udfc6' },
          ].map(({ action, label, icon }) => (
            <button
              key={action}
              onClick={() => handleTrigger(action, label)}
              disabled={triggerLoading[action]}
              style={{
                ...btnStyle,
                padding: '10px 20px',
                fontSize: '0.9rem',
                opacity: triggerLoading[action] ? 0.6 : 1,
              }}
            >
              <span>{icon}</span>
              {triggerLoading[action] ? 'Executando...' : label}
            </button>
          ))}
        </div>
      </div>

      {/* Card: Logs de Acoes */}
      <div style={glassStyle}>
        <div style={cardHeader}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F5F7', margin: 0 }}>Logs de Acoes</h2>
        </div>
        {logsLoading ? (
          <p style={{ color: '#a0a0b0' }}>Carregando logs...</p>
        ) : logs.length === 0 ? (
          <p style={{ color: '#a0a0b0' }}>Nenhum log encontrado.</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={thStyle}>Data/Hora</th>
                    <th style={thStyle}>Acao</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={tdStyle}>
                        {log.createdAt || log.created_at
                          ? new Date(log.createdAt || log.created_at).toLocaleString('pt-BR')
                          : '-'}
                      </td>
                      <td style={tdStyle}>
                        {ACTION_LABELS[log.action] || log.action || '-'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 12,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background: log.status === 'ok' || log.status === 'success' || log.success
                            ? 'rgba(34,197,94,0.15)'
                            : 'rgba(239,68,68,0.15)',
                          color: log.status === 'ok' || log.status === 'success' || log.success
                            ? '#22c55e'
                            : '#ef4444',
                        }}>
                          {log.status === 'ok' || log.status === 'success' || log.success ? 'Sucesso' : 'Erro'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || log.message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Paginacao */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                disabled={logsPage <= 1}
                style={{ ...btnSmallStyle, opacity: logsPage <= 1 ? 0.4 : 1 }}
              >
                Anterior
              </button>
              <span style={{ color: '#a0a0b0', fontSize: '0.85rem', alignSelf: 'center' }}>
                Pagina {logsPage}
              </span>
              <button
                onClick={() => setLogsPage(p => p + 1)}
                disabled={logs.length < 20}
                style={{ ...btnSmallStyle, opacity: logs.length < 20 ? 0.4 : 1 }}
              >
                Proximo
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// --- Inline style helpers ---
const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 16px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: '#F5F5F7',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 500,
  transition: 'background 0.2s',
};

const btnPrimaryStyle = {
  ...btnStyle,
  background: 'rgba(209,43,242,0.15)',
  border: '1px solid #D12BF2',
  color: '#D12BF2',
};

const btnSmallStyle = {
  ...btnStyle,
  padding: '5px 14px',
  fontSize: '0.8rem',
};

const thStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  color: '#a0a0b0',
  fontWeight: 600,
};

const tdStyle = {
  padding: '8px 10px',
  color: '#F5F5F7',
};
