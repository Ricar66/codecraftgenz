// src/admin/SuperDashboard.jsx
// Dashboard Executivo com KPIs, Gráficos e Atividades Recentes

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  FaDollarSign, FaBriefcase, FaUsers, FaShoppingCart,
  FaArrowUp, FaArrowDown, FaUserPlus, FaFileInvoiceDollar,
  FaClock
} from 'react-icons/fa';

import AdminCard from './components/AdminCard';
import {
  mockKPIs,
  mockRevenueData,
  mockProjectDistribution,
  mockSalesFunnel,
  mockRecentActivities
} from './data/mockDashboardData';
import styles from './SuperDashboard.module.css';

// Cores do tema
const COLORS = {
  primary: '#D12BF2',
  secondary: '#00E4F2',
  purple: '#7A3EF5',
  dark: '#68007B',
  success: '#10B981',
  warning: '#F59E0B',
  text: '#e0e0e0',
  muted: '#a0a0a0',
};

// Custom Tooltip para gráficos
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: R$ {entry.value.toLocaleString('pt-BR')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Super Dashboard - Centro de Comando
 */
const SuperDashboard = () => {
  const [periodo, setPeriodo] = useState('30d');

  // KPIs calculados
  const kpis = useMemo(() => mockKPIs, []);

  // Ícone para atividades
  const getActivityIcon = (tipo) => {
    switch (tipo) {
      case 'venda': return <FaShoppingCart className={styles.activityIconVenda} />;
      case 'usuario': return <FaUserPlus className={styles.activityIconUsuario} />;
      case 'proposta': return <FaBriefcase className={styles.activityIconProposta} />;
      default: return <FaClock className={styles.activityIconDefault} />;
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Centro de Comando</h1>
          <p className={styles.subtitle}>Visão executiva da CodeCraft Gen-Z</p>
        </div>
        <div className={styles.headerActions}>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={styles.periodoSelect}
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="1y">Este ano</option>
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
              <span className={styles.kpiLabel}>Faturamento Total</span>
              <span className={styles.kpiValue}>
                R$ {kpis.faturamentoTotal.toLocaleString('pt-BR')}
              </span>
              <span className={styles.kpiTrend}>
                <FaArrowUp className={styles.trendUp} />
                +{kpis.crescimentoUsuarios}% vs mês anterior
              </span>
            </div>
          </div>
        </AdminCard>

        {/* Pipeline B2B */}
        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(209, 43, 242, 0.15)' }}>
              <FaBriefcase style={{ color: COLORS.primary }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Pipeline B2B</span>
              <span className={styles.kpiValue}>
                R$ {kpis.pipelineB2B.toLocaleString('pt-BR')}
              </span>
              <span className={styles.kpiMuted}>Em propostas abertas</span>
            </div>
          </div>
        </AdminCard>

        {/* Novos Usuários */}
        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(0, 228, 242, 0.15)' }}>
              <FaUsers style={{ color: COLORS.secondary }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Novos Usuários (30d)</span>
              <span className={styles.kpiValue}>{kpis.novosUsuarios30d}</span>
              <span className={styles.kpiTrend}>
                <FaArrowUp className={styles.trendUp} />
                +{kpis.crescimentoUsuarios}% crescimento
              </span>
            </div>
          </div>
        </AdminCard>

        {/* Apps Vendidos */}
        <AdminCard variant="elevated" className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(122, 62, 245, 0.15)' }}>
              <FaShoppingCart style={{ color: COLORS.purple }} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Apps Vendidos</span>
              <span className={styles.kpiValue}>{kpis.appsVendidos}</span>
              <span className={styles.kpiMuted}>+{kpis.appsVendidosMes} este mês</span>
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
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={mockRevenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
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
                    name="Receita Total"
                    stroke={COLORS.secondary}
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="apps"
                    name="Apps"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AdminCard.Body>
        </AdminCard>

        {/* Distribuição de Projetos (Pizza) */}
        <AdminCard variant="elevated" className={styles.chartCard}>
          <AdminCard.Header title="Distribuição de Projetos" subtitle="Por tipo de desenvolvimento" noBorder />
          <AdminCard.Body noPadding>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={mockProjectDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: COLORS.muted }}
                  >
                    {mockProjectDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Participação']}
                    contentStyle={{
                      background: 'rgba(10, 10, 15, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AdminCard.Body>
        </AdminCard>

        {/* Funil de Vendas B2B */}
        <AdminCard variant="elevated" className={styles.chartCard}>
          <AdminCard.Header title="Funil de Vendas B2B" subtitle="Propostas por fase" noBorder />
          <AdminCard.Body noPadding>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={mockSalesFunnel}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
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
                    {mockSalesFunnel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AdminCard.Body>
        </AdminCard>

        {/* Últimas Atividades */}
        <AdminCard variant="elevated" className={styles.chartCard}>
          <AdminCard.Header
            title="Últimas Atividades"
            subtitle="Tempo real"
            actions={
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} /> LIVE
              </span>
            }
            noBorder
          />
          <AdminCard.Body noPadding>
            <div className={styles.activitiesList}>
              {mockRecentActivities.slice(0, 6).map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    {getActivityIcon(activity.tipo)}
                  </div>
                  <div className={styles.activityContent}>
                    <span className={styles.activityDesc}>{activity.descricao}</span>
                    <span className={styles.activityTime}>{activity.tempo}</span>
                  </div>
                  {activity.valor && (
                    <span className={styles.activityValue}>{activity.valor}</span>
                  )}
                </div>
              ))}
            </div>
          </AdminCard.Body>
        </AdminCard>
      </section>
    </div>
  );
};

export default SuperDashboard;
