// src/admin/AdminDiscord.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, RefreshCw, Save, Trophy, Crown, Zap, MessageSquare, Mic, Star, Flame, Users, Link2, ShoppingCart, TrendingUp } from 'lucide-react';

import { useToast } from '../components/UI/Toast';
import { getBotStatus, getBotConfig, updateBotConfig, getBotLogs, triggerBotAction, getMemberRanking, getDiscordFunnel } from '../services/discordAPI.js';

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
  onboarding_dm_sent: 'DM de onboarding enviada',
  promotion_announced: 'Anuncio de promocao',
  member_promoted: 'Membro promovido',
  desafio_semanal_posted: 'Desafio da semana postado',
  enquete_posted: 'Enquete postada',
  snapshot_saved: 'Snapshot semanal salvo',
  streak_bonus: 'Bonus de streak',
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

  // --- Funil Discord → Site ---
  const [funnel, setFunnel] = useState(null);
  const [funnelLoading, setFunnelLoading] = useState(true);

  const fetchFunnel = useCallback(async () => {
    setFunnelLoading(true);
    try {
      const data = await getDiscordFunnel();
      setFunnel(data);
    } catch {
      setFunnel(null);
    } finally {
      setFunnelLoading(false);
    }
  }, []);

  useEffect(() => { fetchFunnel(); }, [fetchFunnel]);

  // --- Config ---
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await getBotConfig();
      // Normalizar: backend guarda strings ('true' / 'false'). Converter chaves booleanas para boolean real.
      const BOOLEAN_KEYS = [
        'news_enabled', 'vagas_enabled', 'welcome_enabled', 'ranking_enabled',
        'dm_onboarding_enabled', 'promo_announcement_enabled', 'auto_thread_enabled',
        'streak_enabled', 'desafio_semanal_enabled', 'enquete_enabled',
      ];
      const normalized = { ...data };
      BOOLEAN_KEYS.forEach(k => {
        if (k in normalized) {
          normalized[k] = normalized[k] === true || normalized[k] === 'true';
        } else {
          normalized[k] = true; // default: todas habilitadas
        }
      });
      setConfig(normalized);
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

  // --- Ranking ---
  const [rankingMembers, setRankingMembers] = useState([]);
  const [rankingPage, setRankingPage] = useState(1);
  const [rankingTotal, setRankingTotal] = useState(0);
  const [rankingRole, setRankingRole] = useState('');
  const [rankingLoading, setRankingLoading] = useState(true);

  const fetchRanking = useCallback(async (page, role) => {
    setRankingLoading(true);
    try {
      const data = await getMemberRanking({ page, limit: 20, role });
      setRankingMembers(data.members || []);
      setRankingTotal(data.total || 0);
    } catch {
      setRankingMembers([]);
    } finally {
      setRankingLoading(false);
    }
  }, []);

  useEffect(() => { fetchRanking(rankingPage, rankingRole); }, [rankingPage, rankingRole, fetchRanking]);

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

      {/* Card: Funil Discord → Site */}
      <div style={glassStyle}>
        <div style={cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={20} style={{ color: '#00E4F2' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F5F7', margin: 0 }}>Funil Discord → Site</h2>
          </div>
          <button
            onClick={fetchFunnel}
            disabled={funnelLoading}
            style={btnStyle}
          >
            <RefreshCw size={13} style={{ animation: funnelLoading ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>
        </div>
        {funnelLoading ? (
          <p style={{ color: '#a0a0b0' }}>Carregando métricas...</p>
        ) : !funnel ? (
          <p style={{ color: '#ef4444' }}>Erro ao carregar funil</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
          }}>
            <FunnelStat
              icon={<Users size={18} style={{ color: '#a78bfa' }} />}
              label="Membros Discord"
              value={funnel.totalDiscordMembers ?? 0}
              accent="#a78bfa"
            />
            <FunnelStat
              icon={<Link2 size={18} style={{ color: '#00E4F2' }} />}
              label="Contas vinculadas"
              value={funnel.linkedAccounts ?? 0}
              hint={funnel.totalDiscordMembers
                ? `${((funnel.linkedAccounts / funnel.totalDiscordMembers) * 100).toFixed(1)}% do total`
                : null}
              accent="#00E4F2"
            />
            <FunnelStat
              icon={<ShoppingCart size={18} style={{ color: '#22c55e' }} />}
              label="Compraram após vincular"
              value={funnel.purchasedAfterLink ?? 0}
              hint={funnel.linkedAccounts
                ? `${((funnel.purchasedAfterLink / funnel.linkedAccounts) * 100).toFixed(1)}% dos vinculados`
                : null}
              accent="#22c55e"
            />
            <FunnelStat
              icon={<TrendingUp size={18} style={{ color: '#D12BF2' }} />}
              label="Taxa de conversão"
              value={`${funnel.conversionRate ?? 0}%`}
              hint="Discord → conta vinculada"
              accent="#D12BF2"
            />
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
                { key: 'news_enabled',                label: 'Noticias Tech' },
                { key: 'vagas_enabled',               label: 'Vagas Dev' },
                { key: 'welcome_enabled',             label: 'Boas-vindas' },
                { key: 'ranking_enabled',             label: 'Ranking Semanal' },
                { key: 'dm_onboarding_enabled',       label: 'DM de onboarding para novos membros' },
                { key: 'promo_announcement_enabled',  label: 'Anuncio publico de promocao de cargo' },
                { key: 'auto_thread_enabled',         label: 'Thread automatica em #tire-suas-duvidas' },
                { key: 'streak_enabled',              label: 'Streak de atividade (bonus a cada 7 dias)' },
                { key: 'desafio_semanal_enabled',     label: 'Desafio da Semana (segunda as 9h)' },
                { key: 'enquete_enabled',             label: 'Enquete Semanal (quarta as 14h)' },
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
            { action: 'news',             label: 'Postar Noticias Agora',       icon: '\ud83d\udcf0' },
            { action: 'vagas',            label: 'Postar Vagas Agora',          icon: '\ud83d\udcbc' },
            { action: 'ranking',          label: 'Postar Ranking Agora',        icon: '\ud83c\udfc6' },
            { action: 'promotion',        label: 'Rodar Promocao Agora',        icon: '\ud83d\ude80' },
            { action: 'desafio-semanal',  label: 'Postar Desafio da Semana',    icon: '\ud83c\udfaf' },
            { action: 'enquete',          label: 'Postar Enquete Agora',        icon: '\ud83d\udcca' },
            { action: 'snapshot',         label: 'Salvar Snapshot Semanal',     icon: '\ud83d\udcbe' },
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

      {/* Card: Ranking de Engajamento */}
      <div style={glassStyle}>
        <div style={cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Trophy size={20} style={{ color: '#D12BF2' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F5F7', margin: 0 }}>Ranking de Engajamento</h2>
            <span style={{ color: '#a0a0b0', fontSize: '0.82rem' }}>({rankingTotal} membros)</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Filtro por cargo */}
            <select
              value={rankingRole}
              onChange={e => { setRankingRole(e.target.value); setRankingPage(1); }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color: '#F5F5F7',
                padding: '5px 10px',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <option value="">Todos os cargos</option>
              <option value="novato">Novato</option>
              <option value="crafter">Crafter</option>
              <option value="crafter_elite">Crafter Elite</option>
            </select>
            <button
              onClick={() => fetchRanking(rankingPage, rankingRole)}
              disabled={rankingLoading}
              style={btnStyle}
            >
              <RefreshCw size={13} style={{ animation: rankingLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {rankingLoading ? (
          <p style={{ color: '#a0a0b0' }}>Carregando ranking...</p>
        ) : rankingMembers.length === 0 ? (
          <p style={{ color: '#a0a0b0', textAlign: 'center', padding: '24px 0' }}>
            Nenhum membro registrado ainda. Os dados aparecem conforme os membros interagem no Discord.
          </p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ ...thStyle, width: 36 }}>#</th>
                    <th style={thStyle}>Membro</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Cargo</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>
                      <Star size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Pts
                    </th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>
                      <MessageSquare size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Msgs
                    </th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>
                      <Zap size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Reacoes
                    </th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>
                      <Flame size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Streak
                    </th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>
                      <Mic size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Voz
                    </th>
                    <th style={thStyle}>Ultima vez</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingMembers.map((m, i) => {
                    const rank = (rankingPage - 1) * 20 + i + 1;
                    const roleInfo = ROLE_DISPLAY[m.currentRole] || { label: m.currentRole, color: '#a0a0b0' };
                    const voiceHours = Math.floor((m.voiceMinutes || 0) / 60);
                    return (
                      <tr key={m.discordId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ ...tdStyle, color: rank <= 3 ? RANK_COLORS[rank - 1] : '#a0a0b0', fontWeight: rank <= 3 ? 700 : 400 }}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 500 }}>{m.displayName || m.username}</div>
                          <div style={{ color: '#a0a0b0', fontSize: '0.75rem' }}>@{m.username}</div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 12,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: roleInfo.bg,
                            color: roleInfo.color,
                          }}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: '#D12BF2' }}>{m.score}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#a0a0b0' }}>{m.messagesTotal}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#a0a0b0' }}>{m.reactionsReceived}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: (m.streakDays ?? 0) >= 7 ? '#F59E0B' : '#a0a0b0', fontWeight: (m.streakDays ?? 0) >= 7 ? 700 : 400 }}>
                          {(m.streakDays ?? 0) > 0 ? `${m.streakDays}d` : '-'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#a0a0b0' }}>{voiceHours}h</td>
                        <td style={{ ...tdStyle, color: '#a0a0b0', fontSize: '0.8rem' }}>
                          {m.lastSeen ? new Date(m.lastSeen).toLocaleDateString('pt-BR') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Paginacao */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setRankingPage(p => Math.max(1, p - 1))}
                disabled={rankingPage <= 1}
                style={{ ...btnSmallStyle, opacity: rankingPage <= 1 ? 0.4 : 1 }}
              >
                Anterior
              </button>
              <span style={{ color: '#a0a0b0', fontSize: '0.85rem', alignSelf: 'center' }}>
                Pagina {rankingPage} de {Math.max(1, Math.ceil(rankingTotal / 20))}
              </span>
              <button
                onClick={() => setRankingPage(p => p + 1)}
                disabled={rankingMembers.length < 20}
                style={{ ...btnSmallStyle, opacity: rankingMembers.length < 20 ? 0.4 : 1 }}
              >
                Proximo
              </button>
            </div>
          </>
        )}
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

const ROLE_DISPLAY = {
  novato:        { label: 'Novato',        color: '#a0a0b0', bg: 'rgba(160,160,176,0.12)' },
  crafter:       { label: 'Crafter',       color: '#00E4F2', bg: 'rgba(0,228,242,0.12)'   },
  crafter_elite: { label: 'Crafter Elite', color: '#D12BF2', bg: 'rgba(209,43,242,0.15)'  },
};

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

// Card de métrica do funil
function FunnelStat({ icon, label, value, hint, accent }) {
  return (
    <div style={{
      padding: '16px 18px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <span style={{
        position: 'absolute',
        top: 0, left: 0, height: 2, width: '100%',
        background: accent || '#a0a0b0',
        opacity: 0.6,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontSize: '0.78rem', color: '#a0a0b0', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: '1.7rem', fontWeight: 800, color: '#F5F5F7', lineHeight: 1 }}>
        {value}
      </span>
      {hint && (
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{hint}</span>
      )}
    </div>
  );
}
