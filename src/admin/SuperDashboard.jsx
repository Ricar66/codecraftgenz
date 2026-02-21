// src/admin/SuperDashboard.jsx
// Dashboard Executivo com KPIs, Gráficos e Atividades Recentes - DADOS REAIS

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  FaDollarSign, FaBriefcase, FaUsers, FaShoppingCart,
  FaArrowUp, FaArrowDown, FaUserPlus, FaProjectDiagram,
  FaClock, FaSync, FaExclamationTriangle
} from 'react-icons/fa';

import AdminCard from './components/AdminCard';
import { getDashboardStats } from '../services/dashboardAPI';
import styles from './SuperDashboard.module.css';

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

// Cores para gráfico de pizza
const PROJECT_COLORS = [COLORS.secondary, COLORS.primary, COLORS.purple, COLORS.success, COLORS.warning];

// Custom Tooltip para gráficos
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: R$ {Number(entry.value).toLocaleString('pt-BR')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Super Dashboard - Centro de Comando com Dados Reais
 */
const SuperDashboard = () => {
  const [periodo, setPeriodo] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Carregar dados do dashboard
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await getDashboardStats(periodo);
      setData(stats);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // KPIs calculados a partir dos dados reais
  const kpis = useMemo(() => {
    if (!data) return null;
    return {
      faturamentoTotal: data.finance?.paid || 0,
      receitaPendente: data.finance?.pending || 0,
      pipelineB2B: data.proposals?.total || 0,
      novosUsuarios30d: data.users?.total || 0,
      craftersTotal: data.users?.crafters || 0,
      projetosAtivos: data.projects?.active || 0,
      projetosTotal: data.projects?.total || 0,
      appsTotal: data.apps?.total || 0,
      novasPropostas: data.proposals?.new || 0,
    };
  }, [data]);

  // Dados do gráfico de receita
  const chartData = useMemo(() => {
    if (!data?.chartData) return [];
    return data.chartData.map(item => ({
      mes: item.month,
      receita: item.revenue,
      pendente: item.expenses,
    }));
  }, [data]);

  // Dados do funil de vendas B2B
  const salesFunnel = useMemo(() => {
    if (!data?.proposals?.byStatus) return [];
    const byStatus = data.proposals.byStatus;
    return [
      { fase: 'Novos', quantidade: byStatus.new || 0, color: COLORS.secondary },
      { fase: 'Contatados', quantidade: byStatus.contacted || 0, color: COLORS.purple },
      { fase: 'Negociando', quantidade: byStatus.negotiating || 0, color: COLORS.warning },
      { fase: 'Aprovados', quantidade: byStatus.approved || 0, color: COLORS.success },
      { fase: 'Rejeitados', quantidade: byStatus.rejected || 0, color: COLORS.danger },
    ];
  }, [data]);

  // Distribuição de projetos
  const projectDistribution = useMemo(() => {
    if (!data?.projects) return [];
    const projects = data.projects;
    return [
      { name: 'Ativos', value: projects.active || 0, color: COLORS.success },
      { name: 'Finalizados', value: projects.completed || 0, color: COLORS.secondary },
      { name: 'Outros', value: Math.max(0, (projects.total || 0) - (projects.active || 0) - (projects.completed || 0)), color: COLORS.muted },
    ].filter(item => item.value > 0);
  }, [data]);

  // Propostas recentes
  const recentProposals = useMemo(() => {
    if (!data?.proposals?.recent) return [];
    return data.proposals.recent.map(p => ({
      id: p.id,
      descricao: `${p.companyName} - ${p.projectType}`,
      tipo: 'proposta',
      tempo: new Date(p.createdAt).toLocaleDateString('pt-BR'),
      status: p.status,
    }));
  }, [data]);

  // Ícone para atividades
  const getActivityIcon = (tipo) => {
    switch (tipo) {
      case 'venda': return <FaShoppingCart className={styles.activityIconVenda} />;
      case 'usuario': return <FaUserPlus className={styles.activityIconUsuario} />;
      case 'proposta': return <FaBriefcase className={styles.activityIconProposta} />;
      default: return <FaClock className={styles.activityIconDefault} />;
    }
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <span>Carregando dashboard...</span>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className={styles.errorState}>
        <FaExclamationTriangle size={48} color={COLORS.danger} />
        <h2>Erro ao carregar dashboard</h2>
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
          <h1 className={styles.title}>Centro de Comando</h1>
          <p className={styles.subtitle}>Visão executiva da CodeCraft Gen-Z</p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={fetchData}
            className={styles.refreshBtn}
            disabled={loading}
            title="Atualizar dados"
          >
            <FaSync className={loading ? styles.spinning : ''} />
          </button>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={styles.periodoSelect}
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="365d">Este ano</option>
          </select>
        </div>
      </header>

      {/* KPI Cards */}
      <section className={styles.kpiGrid}>
        {/* Faturamento Total */}
        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
              <FaDollarSign style={{ color: COLORS.success }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Faturamento Pago</span>
              <span className={styles.kpiValue}>
                R$ {(kpis?.faturamentoTotal || 0).toLocaleString('pt-BR')}
              </span>
              {kpis?.receitaPendente > 0 && (
                <span className={styles.kpiMuted}>
                  + R$ {kpis.receitaPendente.toLocaleString('pt-BR')} pendente
                </span>
              )}
            </div>
          </div>
        </AdminCard>

        {/* Propostas B2B */}
        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(209, 43, 242, 0.15)' }}>
              <FaBriefcase style={{ color: COLORS.primary }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Propostas B2B</span>
              <span className={styles.kpiValue}>{kpis?.pipelineB2B || 0}</span>
              {kpis?.novasPropostas > 0 && (
                <span className={styles.kpiTrend}>
                  <FaArrowUp className={styles.trendUp} />
                  +{kpis.novasPropostas} novas (7d)
                </span>
              )}
            </div>
          </div>
        </AdminCard>

        {/* Usuários e Crafters */}
        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(0, 228, 242, 0.15)' }}>
              <FaUsers style={{ color: COLORS.secondary }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Usuários / Crafters</span>
              <span className={styles.kpiValue}>
                {kpis?.novosUsuarios30d || 0} / {kpis?.craftersTotal || 0}
              </span>
              <span className={styles.kpiMuted}>Total cadastrados</span>
            </div>
          </div>
        </AdminCard>

        {/* Projetos */}
        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(122, 62, 245, 0.15)' }}>
              <FaProjectDiagram style={{ color: COLORS.purple }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Projetos</span>
              <span className={styles.kpiValue}>{kpis?.projetosTotal || 0}</span>
              <span className={styles.kpiMuted}>
                {kpis?.projetosAtivos || 0} ativos | {kpis?.appsTotal || 0} apps
              </span>
            </div>
          </div>
        </AdminCard>
      </section>

      {/* Gráficos - Grid 2 colunas */}
      <section className={styles.chartsGrid}>
        {/* Gráfico de Receita (Linha/Área) */}
        <AdminCard variant="elevated" className={styles.chartCard}>
          <AdminCard.Header title="Evolução de Receita" subtitle="Últimos 6 meses" noBorder />
          <AdminCard.Body noPadding>
            <div className={styles.chartContainer}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPendente" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="mes" stroke={COLORS.muted} fontSize={12} />
                    <YAxis stroke={COLORS.muted} fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: COLORS.text }} />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      name="Receita Paga"
                      stroke={COLORS.success}
                      fillOpacity={1}
                      fill="url(#colorReceita)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="pendente"
                      name="Pendente"
                      stroke={COLORS.warning}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: COLORS.warning, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>Sem dados de receita no período</div>
              )}
            </div>
          </AdminCard.Body>
        </AdminCard>

        {/* Distribuição de Projetos (Pizza) */}
        <AdminCard variant="elevated" className={styles.chartCard}>
          <AdminCard.Header title="Distribuição de Projetos" subtitle="Por status" noBorder />
          <AdminCard.Body noPadding>
            <div className={styles.chartContainer}>
              {projectDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={projectDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: COLORS.muted }}
                    >
                      {projectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [value, 'Projetos']}
                      contentStyle={{
                        background: 'rgba(10, 10, 15, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>Sem dados de projetos</div>
              )}
            </div>
          </AdminCard.Body>
        </AdminCard>

        {/* Funil de Vendas B2B */}
        <AdminCard variant="elevated" className={styles.chartCard}>
          <AdminCard.Header title="Funil de Propostas B2B" subtitle="Por status" noBorder />
          <AdminCard.Body noPadding>
            <div className={styles.chartContainer}>
              {salesFunnel.some(item => item.quantidade > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={salesFunnel}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke={COLORS.muted} fontSize={12} />
                    <YAxis type="category" dataKey="fase" stroke={COLORS.muted} fontSize={12} />
                    <Tooltip
                      formatter={(value) => [value, 'Propostas']}
                      contentStyle={{
                        background: 'rgba(10, 10, 15, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="quantidade" radius={[0, 4, 4, 0]}>
                      {salesFunnel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>Sem propostas registradas</div>
              )}
            </div>
          </AdminCard.Body>
        </AdminCard>

        {/* Propostas Recentes */}
        <AdminCard variant="elevated" className={styles.chartCard}>
          <AdminCard.Header
            title="Propostas Recentes"
            subtitle="Últimas solicitações"
            actions={
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} /> B2B
              </span>
            }
            noBorder
          />
          <AdminCard.Body noPadding>
            <div className={styles.activitiesList}>
              {recentProposals.length > 0 ? (
                recentProposals.map((proposal) => (
                  <div key={proposal.id} className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      {getActivityIcon(proposal.tipo)}
                    </div>
                    <div className={styles.activityContent}>
                      <span className={styles.activityDesc}>{proposal.descricao}</span>
                      <span className={styles.activityTime}>{proposal.tempo}</span>
                    </div>
                    <span className={`${styles.activityStatus} ${styles[`status_${proposal.status}`]}`}>
                      {proposal.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className={styles.noData}>Nenhuma proposta recente</div>
              )}
            </div>
          </AdminCard.Body>
        </AdminCard>
      </section>

      {/* Vendas por Aplicativo */}
      {data?.salesPerApp && (
        <section style={{ marginTop: '24px' }}>
          <AdminCard variant="elevated">
            <AdminCard.Header title="Aplicativos" subtitle="Vendas e faturamento por app" noBorder />
            <AdminCard.Body noPadding>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: COLORS.muted, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: COLORS.muted, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aplicativo</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', color: COLORS.muted, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preço</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', color: COLORS.muted, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vendas</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', color: COLORS.muted, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.salesPerApp.map((app, idx) => (
                      <tr key={app.app_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '14px 16px', color: COLORS.muted, fontSize: '0.9rem', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {app.thumb_url && (
                              <img
                                src={app.thumb_url}
                                alt={app.app_name}
                                style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{app.app_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: COLORS.text, fontSize: '0.9rem' }}>
                          R$ {Number(app.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 32, padding: '4px 12px', borderRadius: 20,
                            background: app.sales_count > 0 ? 'rgba(0, 228, 242, 0.12)' : 'rgba(255,255,255,0.05)',
                            color: app.sales_count > 0 ? COLORS.secondary : COLORS.muted,
                            fontWeight: 700, fontSize: '0.9rem'
                          }}>
                            {app.sales_count}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: app.total_revenue > 0 ? COLORS.success : COLORS.muted, fontWeight: 700, fontSize: '0.95rem' }}>
                          R$ {Number(app.total_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                      <td colSpan={3} style={{ padding: '14px 16px', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Total</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: COLORS.secondary, fontWeight: 700, fontSize: '0.95rem' }}>
                        {data.salesPerApp.reduce((sum, a) => sum + a.sales_count, 0)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: COLORS.success, fontWeight: 700, fontSize: '0.95rem' }}>
                        R$ {data.salesPerApp.reduce((sum, a) => sum + Number(a.total_revenue), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </AdminCard.Body>
          </AdminCard>
        </section>
      )}
    </div>
  );
};

export default SuperDashboard;
