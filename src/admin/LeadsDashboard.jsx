// src/admin/LeadsDashboard.jsx
// Dashboard de Leads - Visão unificada de captação omnichannel

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FaUsers, FaUserPlus, FaCheckCircle, FaPercent,
  FaSync, FaExclamationTriangle, FaArrowUp,
} from 'react-icons/fa';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import { getLeadsDashboard, getLeadsList, updateLeadStatus } from '../services/leadsAdminAPI';
import styles from './LeadsDashboard.module.css';

// Cores do tema
const COLORS = {
  primary: '#D12BF2',
  secondary: '#00E4F2',
  purple: '#7A3EF5',
  dark: '#68007B',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#ef4444',
  text: '#e0e0e0',
  muted: '#a0a0a0',
};

// Mapa de labels de origem
const ORIGIN_LABELS = {
  crafter_signup: 'Crafter',
  app_download: 'Download',
  app_purchase: 'Compra',
  challenge_subscribe: 'Desafio',
  feedback: 'Feedback',
  proposal: 'Proposta B2B',
  registration: 'Registro',
  contact: 'Contato',
};

// Cores para origens no gráfico de pizza
const ORIGIN_COLORS = [
  COLORS.secondary, COLORS.primary, COLORS.purple,
  COLORS.warning, COLORS.success, '#EC4899', '#3B82F6', '#9CA3AF',
];

// Status labels
const STATUS_LABELS = {
  new: 'Novo',
  contacted: 'Contatado',
  converted: 'Convertido',
  lost: 'Perdido',
};

// Status para StatusBadge
const STATUS_VARIANT = {
  new: 'info',
  contacted: 'warning',
  converted: 'success',
  lost: 'error',
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const LeadsDashboard = () => {
  const [periodo, setPeriodo] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [originFilter, setOriginFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar dados do dashboard
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, list] = await Promise.all([
        getLeadsDashboard(periodo),
        getLeadsList({ origin: originFilter, status: statusFilter, search: searchTerm, page, limit: 25 }),
      ]);
      setDashData(dash);
      setLeads(list?.data || list?.leads || []);
      setLeadsTotal(list?.meta?.total || list?.total || 0);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [periodo, originFilter, statusFilter, searchTerm, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce para busca
  const [searchDebounce, setSearchDebounce] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchDebounce), 400);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

  // KPIs
  const kpis = useMemo(() => {
    if (!dashData?.kpis) return null;
    return dashData.kpis;
  }, [dashData]);

  // Dados do gráfico de área (leads por dia)
  const dailyData = useMemo(() => {
    if (!dashData?.daily_chart) return [];
    return dashData.daily_chart.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      leads: d.count,
    }));
  }, [dashData]);

  // Dados do gráfico de pizza (por origem)
  const originData = useMemo(() => {
    if (!dashData?.by_origin) return [];
    return dashData.by_origin.map((o, i) => ({
      name: ORIGIN_LABELS[o.origin] || o.origin,
      value: o.count,
      color: ORIGIN_COLORS[i % ORIGIN_COLORS.length],
    })).filter(o => o.value > 0);
  }, [dashData]);

  // Dados do funil por status
  const funnelData = useMemo(() => {
    if (!dashData?.by_status) return [];
    const statusOrder = ['new', 'contacted', 'converted', 'lost'];
    const statusColors = [COLORS.secondary, COLORS.warning, COLORS.success, COLORS.danger];
    return statusOrder.map((s, i) => {
      const found = dashData.by_status.find(x => x.status === s);
      return {
        status: STATUS_LABELS[s] || s,
        count: found?.count || 0,
        color: statusColors[i],
      };
    });
  }, [dashData]);

  // Mudar status do lead
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      fetchData();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const totalPages = Math.ceil(leadsTotal / 25);

  // Loading
  if (loading && !dashData) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <span>Carregando leads...</span>
      </div>
    );
  }

  // Error
  if (error && !dashData) {
    return (
      <div className={styles.errorState}>
        <FaExclamationTriangle size={48} color={COLORS.danger} />
        <h2>Erro ao carregar leads</h2>
        <p>{error}</p>
        <button onClick={fetchData} className={styles.retryBtn}>
          <FaSync /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Leads Engine</h1>
          <p className={styles.subtitle}>Central de captação omnichannel</p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={fetchData}
            className={styles.refreshBtn}
            disabled={loading}
            title="Atualizar"
          >
            <FaSync className={loading ? styles.spinning : ''} />
          </button>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={styles.periodoSelect}
          >
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
            <option value="365d">Este ano</option>
          </select>
        </div>
      </header>

      {/* KPI Cards */}
      <section className={styles.kpiGrid}>
        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(0, 228, 242, 0.15)' }}>
              <FaUsers style={{ color: COLORS.secondary }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Total de Leads</span>
              <span className={styles.kpiValue}>{kpis?.total || 0}</span>
              <span className={styles.kpiMuted}>Todos os canais</span>
            </div>
          </div>
        </AdminCard>

        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(209, 43, 242, 0.15)' }}>
              <FaUserPlus style={{ color: COLORS.primary }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Novos ({periodo})</span>
              <span className={styles.kpiValue}>{kpis?.new_period || 0}</span>
              {kpis?.new_period > 0 && (
                <span className={styles.kpiTrend}>
                  <FaArrowUp className={styles.trendUp} />
                  +{kpis.new_period} captados
                </span>
              )}
            </div>
          </div>
        </AdminCard>

        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
              <FaCheckCircle style={{ color: COLORS.success }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Convertidos</span>
              <span className={styles.kpiValue}>{kpis?.converted || 0}</span>
              <span className={styles.kpiMuted}>Total convertidos</span>
            </div>
          </div>
        </AdminCard>

        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(122, 62, 245, 0.15)' }}>
              <FaPercent style={{ color: COLORS.purple }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Taxa de Conversão</span>
              <span className={styles.kpiValue}>{kpis?.conversion_rate || 0}%</span>
              <span className={styles.kpiMuted}>Lead → Conversão</span>
            </div>
          </div>
        </AdminCard>
      </section>

      {/* Charts Grid */}
      <section className={styles.chartsGrid}>
        {/* Volume diário de leads */}
        <AdminCard variant="elevated" className={styles.chartCard}>
          <AdminCard.Header title="Volume de Leads" subtitle={`Últimos ${periodo}`} noBorder />
          <AdminCard.Body noPadding>
            <div className={styles.chartContainer}>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke={COLORS.muted} fontSize={12} />
                    <YAxis stroke={COLORS.muted} fontSize={12} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      name="Leads"
                      stroke={COLORS.secondary}
                      fillOpacity={1}
                      fill="url(#colorLeads)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>Sem dados no período</div>
              )}
            </div>
          </AdminCard.Body>
        </AdminCard>

        {/* Distribuição por origem */}
        <AdminCard variant="elevated" className={styles.chartCard}>
          <AdminCard.Header
            title="Leads por Origem"
            subtitle="Distribuição omnichannel"
            actions={<span className={styles.liveBadge}><span className={styles.liveDot} /> LIVE</span>}
            noBorder
          />
          <AdminCard.Body noPadding>
            <div className={styles.chartContainer}>
              {originData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={originData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: COLORS.muted }}
                    >
                      {originData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [value, 'Leads']}
                      contentStyle={{
                        background: 'rgba(10, 10, 15, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>Sem dados de origem</div>
              )}
            </div>
          </AdminCard.Body>
        </AdminCard>

        {/* Funil por status */}
        <AdminCard variant="elevated" className={styles.chartCard}>
          <AdminCard.Header title="Funil de Leads" subtitle="Por status" noBorder />
          <AdminCard.Body noPadding>
            <div className={styles.chartContainer}>
              {funnelData.some(f => f.count > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={funnelData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke={COLORS.muted} fontSize={12} allowDecimals={false} />
                    <YAxis type="category" dataKey="status" stroke={COLORS.muted} fontSize={12} />
                    <Tooltip
                      formatter={(value) => [value, 'Leads']}
                      contentStyle={{
                        background: 'rgba(10, 10, 15, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>Sem dados de funil</div>
              )}
            </div>
          </AdminCard.Body>
        </AdminCard>
      </section>

      {/* Table: Leads */}
      <section>
        <AdminCard variant="elevated" className={styles.tableCard}>
          <AdminCard.Header
            title="Leads Recentes"
            subtitle={`${leadsTotal} leads no total`}
            noBorder
          />
          <AdminCard.Body noPadding>
            {/* Filters */}
            <div className={styles.filterBar} style={{ padding: '0 16px' }}>
              <select
                value={originFilter}
                onChange={(e) => { setOriginFilter(e.target.value); setPage(1); }}
                className={styles.filterSelect}
              >
                <option value="">Todas as origens</option>
                {Object.entries(ORIGIN_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className={styles.filterSelect}
              >
                <option value="">Todos os status</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchDebounce}
                onChange={(e) => { setSearchDebounce(e.target.value); setPage(1); }}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.leadsTable}>
                <thead>
                  <tr>
                    <th>Nome / Email</th>
                    <th>Origem</th>
                    <th>Referência</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length > 0 ? leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <div className={styles.leadName}>{lead.nome || '—'}</div>
                        <div className={styles.leadEmail}>{lead.email}</div>
                      </td>
                      <td>
                        <span className={`${styles.originBadge} ${styles[`origin_${lead.origin}`] || ''}`}>
                          {ORIGIN_LABELS[lead.origin] || lead.origin}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: COLORS.muted }}>
                        {lead.origin_ref || '—'}
                      </td>
                      <td>
                        <StatusBadge variant={STATUS_VARIANT[lead.status] || 'neutral'}>
                          {STATUS_LABELS[lead.status] || lead.status}
                        </StatusBadge>
                      </td>
                      <td className={styles.dateCell}>
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td>
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={styles.statusSelect}
                        >
                          {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6}>
                        <div className={styles.noData}>Nenhum lead encontrado</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <span className={styles.pageInfo}>
                  {page} / {totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próximo
                </button>
              </div>
            )}
          </AdminCard.Body>
        </AdminCard>
      </section>
    </div>
  );
};

export default LeadsDashboard;
