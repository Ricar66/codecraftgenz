import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { useDataSync } from '../context/DataSyncContext.jsx';

export default function AdminDashboard() {
  const {
    crafters,
    mentors,
    projects,
    teams,
    loading,
    error,
    forceRefresh
  } = useDataSync();

  // Estados para filtros
  const [periodo, setPeriodo] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Estados para dados adicionais
  const [userStats, setUserStats] = useState({});
  const [systemLogs, setSystemLogs] = useState([]);

  // Carregar dados adicionais
  const loadAdditionalData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Carregar dados financeiros
      const financeResponse = await fetch(`/api/dashboard/financas?periodo=${periodo}`);
      if (financeResponse.ok) {
        await financeResponse.json();
      }

      // Carregar estatísticas de usuários
      const usersResponse = await fetch('/api/usuarios');
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        setUserStats({
          total: users.length,
          active: users.filter(u => u.status === 'active').length,
          admins: users.filter(u => u.role === 'admin').length,
          editors: users.filter(u => u.role === 'editor').length
        });
      }

      // Carregar logs do sistema
      const logsResponse = await fetch('/api/usuarios/audit-logs');
      if (logsResponse.ok) {
        const logs = await logsResponse.json();
        setSystemLogs(logs.slice(0, 10)); // Últimos 10 logs
      }

    } catch (error) {
      console.error('Erro ao carregar dados adicionais:', error);
    } finally {
      setRefreshing(false);
    }
  }, [periodo]);

  useEffect(() => {
    loadAdditionalData();
  }, [loadAdditionalData]);

  // Calcular estatísticas principais
  const mainStats = useMemo(() => {
    const totalProjetos = projects.length;
    const projetosAtivos = projects.filter(p => p.status === 'ongoing').length;
    const projetosFinalizados = projects.filter(p => p.status === 'finalizado').length;
    const projetosRascunho = projects.filter(p => p.status === 'rascunho').length;

    const totalMentores = mentors.length;
    const mentoresAtivos = mentors.filter(m => 
      projects.some(p => p.mentor_id === m.id && p.status === 'ongoing')
    ).length;

    const totalCrafters = crafters.length;
    const craftersAtivos = crafters.filter(c => c.active).length;
    const craftersEmEquipes = teams.length;
    const craftersDisponiveis = totalCrafters - craftersEmEquipes;

    const totalEquipes = teams.length;
    const equipesAtivas = teams.filter(t => t.status_inscricao === 'confirmado').length;
    const equipesInscritas = teams.filter(t => t.status_inscricao === 'inscrito').length;

    return {
      projetos: {
        total: totalProjetos,
        ativos: projetosAtivos,
        finalizados: projetosFinalizados,
        rascunho: projetosRascunho,
        percentualAtivos: totalProjetos > 0 ? (projetosAtivos / totalProjetos * 100).toFixed(1) : 0
      },
      mentores: {
        total: totalMentores,
        ativos: mentoresAtivos,
        percentualAtivos: totalMentores > 0 ? (mentoresAtivos / totalMentores * 100).toFixed(1) : 0
      },
      crafters: {
        total: totalCrafters,
        ativos: craftersAtivos,
        emEquipes: craftersEmEquipes,
        disponiveis: craftersDisponiveis,
        percentualAlocados: totalCrafters > 0 ? (craftersEmEquipes / totalCrafters * 100).toFixed(1) : 0
      },
      equipes: {
        total: totalEquipes,
        ativas: equipesAtivas,
        inscritas: equipesInscritas,
        percentualAtivas: totalEquipes > 0 ? (equipesAtivas / totalEquipes * 100).toFixed(1) : 0
      }
    };
  }, [projects, mentors, crafters, teams]);

  // Dados para gráficos
  const chartData = useMemo(() => {
    // Distribuição de projetos por status
    const projectStatusData = [
      { name: 'Ativos', value: mainStats.projetos.ativos, color: '#28a745' },
      { name: 'Finalizados', value: mainStats.projetos.finalizados, color: '#6c757d' },
      { name: 'Rascunho', value: mainStats.projetos.rascunho, color: '#ffc107' }
    ];

    // Distribuição de equipes por status
    const teamStatusData = [
      { name: 'Confirmadas', value: mainStats.equipes.ativas, color: '#28a745' },
      { name: 'Inscritas', value: mainStats.equipes.inscritas, color: '#007bff' },
      { name: 'Finalizadas', value: teams.filter(t => t.status_inscricao === 'finalizado').length, color: '#6c757d' }
    ];

    // Top projetos por número de equipes
    const projectTeamCounts = projects.map(projeto => ({
      name: projeto.titulo,
      teams: teams.filter(t => t.projeto_id === projeto.id).length
    })).sort((a, b) => b.teams - a.teams).slice(0, 5);

    // Top mentores por número de equipes
    const mentorTeamCounts = mentors.map(mentor => ({
      name: mentor.nome,
      teams: teams.filter(t => t.mentor_id === mentor.id).length
    })).sort((a, b) => b.teams - a.teams).slice(0, 5);

    return {
      projectStatus: projectStatusData,
      teamStatus: teamStatusData,
      topProjects: projectTeamCounts,
      topMentors: mentorTeamCounts
    };
  }, [projects, mentors, teams, mainStats]);

  // Atividades recentes
  const recentActivities = useMemo(() => {
    const activities = [];

    // Projetos criados recentemente
    const recentProjects = projects
      .filter(p => {
        const created = new Date(p.created_at);
        const now = new Date();
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      })
      .map(p => ({
        type: 'project',
        action: 'Projeto criado',
        description: p.titulo,
        date: p.created_at,
        icon: '🎯'
      }));

    // Equipes formadas recentemente
    const recentTeams = teams
      .filter(t => {
        const created = new Date(t.created_at);
        const now = new Date();
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      })
      .map(t => ({
        type: 'team',
        action: 'Equipe formada',
        description: `${t.crafter_nome} → ${t.projeto_titulo}`,
        date: t.created_at,
        icon: '👥'
      }));

    // Combinar e ordenar por data
    activities.push(...recentProjects, ...recentTeams);
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    return activities.slice(0, 10);
  }, [projects, teams]);

  // Função para atualizar dados
  const handleRefresh = async () => {
    await forceRefresh();
    await loadAdditionalData();
  };

  // Função para exportar relatório
  const exportReport = () => {
    const reportData = {
      periodo,
      geradoEm: new Date().toISOString(),
      estatisticas: mainStats,
      projetos: projects.map(p => ({
        titulo: p.titulo,
        status: p.status,
        mentor: mentors.find(m => m.id === p.mentor_id)?.nome || 'N/A',
        equipes: teams.filter(t => t.projeto_id === p.id).length
      })),
      equipes: teams.map(t => ({
        crafter: t.crafter_nome,
        mentor: t.mentor_nome,
        projeto: t.projeto_titulo,
        status: t.status_inscricao,
        dataInscricao: t.data_inscricao
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_dashboard_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>📊 Dashboard CodeCraft Gen-Z</h1>
          <p className="subtitle">
            {loading || refreshing ? 
              '🔄 Carregando dados...' : 
              error ? 
                '❌ Erro ao carregar dados' : 
                '✅ Dados atualizados com sucesso'
            }
          </p>
        </div>
        
        <div className="header-actions">
          <select 
            value={periodo} 
            onChange={(e) => setPeriodo(e.target.value)}
            className="period-select"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="365d">Último ano</option>
          </select>
          
          <button 
            onClick={handleRefresh} 
            className="btn btn-secondary"
            disabled={loading || refreshing}
          >
            🔄 Atualizar
          </button>
          
          <button 
            onClick={exportReport} 
            className="btn btn-primary"
          >
            📊 Exportar Relatório
          </button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="kpi-grid">
        <div className="kpi-card projects">
          <div className="kpi-icon">🎯</div>
          <div className="kpi-content">
            <div className="kpi-number">{mainStats.projetos.total}</div>
            <div className="kpi-label">Projetos Total</div>
            <div className="kpi-detail">
              {mainStats.projetos.ativos} ativos ({mainStats.projetos.percentualAtivos}%)
            </div>
          </div>
        </div>

        <div className="kpi-card mentors">
          <div className="kpi-icon">👨‍🏫</div>
          <div className="kpi-content">
            <div className="kpi-number">{mainStats.mentores.total}</div>
            <div className="kpi-label">Mentores</div>
            <div className="kpi-detail">
              {mainStats.mentores.ativos} ativos ({mainStats.mentores.percentualAtivos}%)
            </div>
          </div>
        </div>

        <div className="kpi-card crafters">
          <div className="kpi-icon">👥</div>
          <div className="kpi-content">
            <div className="kpi-number">{mainStats.crafters.total}</div>
            <div className="kpi-label">Crafters</div>
            <div className="kpi-detail">
              {mainStats.crafters.emEquipes} em equipes ({mainStats.crafters.percentualAlocados}%)
            </div>
          </div>
        </div>

        <div className="kpi-card teams">
          <div className="kpi-icon">🚀</div>
          <div className="kpi-content">
            <div className="kpi-number">{mainStats.equipes.total}</div>
            <div className="kpi-label">Equipes</div>
            <div className="kpi-detail">
              {mainStats.equipes.ativas} ativas ({mainStats.equipes.percentualAtivas}%)
            </div>
          </div>
        </div>

        <div className="kpi-card users">
          <div className="kpi-icon">👤</div>
          <div className="kpi-content">
            <div className="kpi-number">{userStats.total || 0}</div>
            <div className="kpi-label">Usuários</div>
            <div className="kpi-detail">
              {userStats.active || 0} ativos
            </div>
          </div>
        </div>

        <div className="kpi-card system">
          <div className="kpi-icon">⚙️</div>
          <div className="kpi-content">
            <div className="kpi-number">{systemLogs.length}</div>
            <div className="kpi-label">Atividades</div>
            <div className="kpi-detail">
              Últimas ações do sistema
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos e Análises */}
      <div className="charts-grid">
        {/* Distribuição de Projetos */}
        <div className="chart-card">
          <h3>📈 Distribuição de Projetos</h3>
          <div className="chart-content">
            {chartData.projectStatus.map((item, index) => (
              <div key={index} className="chart-bar">
                <div className="bar-info">
                  <span className="bar-label">{item.name}</span>
                  <span className="bar-value">{item.value}</span>
                </div>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${mainStats.projetos.total > 0 ? (item.value / mainStats.projetos.total * 100) : 0}%`,
                      backgroundColor: item.color 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição de Equipes */}
        <div className="chart-card">
          <h3>👥 Status das Equipes</h3>
          <div className="chart-content">
            {chartData.teamStatus.map((item, index) => (
              <div key={index} className="chart-bar">
                <div className="bar-info">
                  <span className="bar-label">{item.name}</span>
                  <span className="bar-value">{item.value}</span>
                </div>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${mainStats.equipes.total > 0 ? (item.value / mainStats.equipes.total * 100) : 0}%`,
                      backgroundColor: item.color 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Projetos */}
        <div className="chart-card">
          <h3>🏆 Projetos com Mais Equipes</h3>
          <div className="ranking-list">
            {chartData.topProjects.length === 0 ? (
              <p className="no-data">Nenhum projeto com equipes ainda</p>
            ) : (
              chartData.topProjects.map((project, index) => (
                <div key={index} className="ranking-item">
                  <div className="ranking-position">#{index + 1}</div>
                  <div className="ranking-info">
                    <div className="ranking-name">{project.name}</div>
                    <div className="ranking-value">{project.teams} equipe(s)</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Mentores */}
        <div className="chart-card">
          <h3>🌟 Mentores Mais Ativos</h3>
          <div className="ranking-list">
            {chartData.topMentors.length === 0 ? (
              <p className="no-data">Nenhum mentor com equipes ainda</p>
            ) : (
              chartData.topMentors.map((mentor, index) => (
                <div key={index} className="ranking-item">
                  <div className="ranking-position">#{index + 1}</div>
                  <div className="ranking-info">
                    <div className="ranking-name">{mentor.name}</div>
                    <div className="ranking-value">{mentor.teams} equipe(s)</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className="activities-section">
        <div className="activities-card">
          <h3>📋 Atividades Recentes</h3>
          <div className="activities-list">
            {recentActivities.length === 0 ? (
              <p className="no-data">Nenhuma atividade recente</p>
            ) : (
              recentActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-content">
                    <div className="activity-action">{activity.action}</div>
                    <div className="activity-description">{activity.description}</div>
                    <div className="activity-date">
                      {new Date(activity.date).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logs do Sistema */}
        <div className="logs-card">
          <h3>🔍 Logs do Sistema</h3>
          <div className="logs-list">
            {systemLogs.length === 0 ? (
              <p className="no-data">Nenhum log disponível</p>
            ) : (
              systemLogs.map((log, index) => (
                <div key={index} className="log-item">
                  <div className="log-time">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </div>
                  <div className="log-content">
                    <strong>{log.actor}</strong> {log.action}
                    {log.target && <span> em <em>{log.target}</em></span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-dashboard {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          background: #f8f9fa;
          min-height: 100vh;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .header-content h1 {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 1.8rem;
        }

        .subtitle {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .period-select {
          padding: 8px 12px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          background: white;
          font-size: 14px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .kpi-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 15px;
          transition: transform 0.2s;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
        }

        .kpi-icon {
          font-size: 2.5rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #f8f9fa;
        }

        .kpi-card.projects .kpi-icon { background: #e3f2fd; }
        .kpi-card.mentors .kpi-icon { background: #f3e5f5; }
        .kpi-card.crafters .kpi-icon { background: #e8f5e8; }
        .kpi-card.teams .kpi-icon { background: #fff3e0; }
        .kpi-card.users .kpi-icon { background: #fce4ec; }
        .kpi-card.system .kpi-icon { background: #f1f8e9; }

        .kpi-content {
          flex: 1;
        }

        .kpi-number {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }

        .kpi-label {
          font-size: 1rem;
          color: #666;
          margin-bottom: 3px;
        }

        .kpi-detail {
          font-size: 0.85rem;
          color: #999;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .chart-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .chart-card h3 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 1.1rem;
        }

        .chart-content {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .chart-bar {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .bar-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bar-label {
          font-weight: 500;
          color: #333;
        }

        .bar-value {
          font-weight: bold;
          color: #666;
        }

        .bar-container {
          height: 20px;
          background: #f1f3f4;
          border-radius: 10px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .ranking-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ranking-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .ranking-position {
          width: 30px;
          height: 30px;
          background: #007bff;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.9rem;
        }

        .ranking-info {
          flex: 1;
        }

        .ranking-name {
          font-weight: 500;
          color: #333;
          margin-bottom: 2px;
        }

        .ranking-value {
          font-size: 0.85rem;
          color: #666;
        }

        .activities-section {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .activities-card, .logs-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .activities-card h3, .logs-card h3 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 1.1rem;
        }

        .activities-list, .logs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 400px;
          overflow-y: auto;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .activity-icon {
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 8px;
        }

        .activity-content {
          flex: 1;
        }

        .activity-action {
          font-weight: 500;
          color: #333;
          margin-bottom: 3px;
        }

        .activity-description {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 3px;
        }

        .activity-date {
          color: #999;
          font-size: 0.8rem;
        }

        .log-item {
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid #007bff;
        }

        .log-time {
          font-size: 0.8rem;
          color: #999;
          margin-bottom: 3px;
        }

        .log-content {
          font-size: 0.9rem;
          color: #333;
        }

        .no-data {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 20px;
        }

        @media (max-width: 768px) {
          .admin-dashboard {
            padding: 10px;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 15px;
            align-items: stretch;
          }

          .header-actions {
            justify-content: center;
            flex-wrap: wrap;
          }

          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }

          .activities-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .kpi-card {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}