import React, { useState, useEffect, useMemo } from 'react';
import { useDataSync } from '../context/DataSyncContext.jsx';

export default function AdminEquipes() {
  const {
    crafters,
    mentors,
    projects,
    teams,
    loading,
    error,
    createTeam,
    updateTeamStatus,
    removeCrafterFromTeam,
    craftersWithTeamInfo,
    groupedTeams,
    availableCrafters,
    notifyDataChange
  } = useDataSync();

  // Estados locais para UI
  const [activeTab, setActiveTab] = useState('teams');
  const [message, setMessage] = useState('');
  
  // Estados para formulários
  const [newTeam, setNewTeam] = useState({
    projeto_id: '',
    mentor_id: '',
    crafters_ids: []
  });

  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projetoFilter, setProjetoFilter] = useState('');
  const [mentorFilter, setMentorFilter] = useState('');

  // Estados para modal de detalhes
  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Estados para estatísticas
  const [stats, setStats] = useState({
    totalEquipes: 0,
    equipesAtivas: 0,
    craftersAlocados: 0,
    craftersDisponiveis: 0
  });

  // Calcular estatísticas
  useEffect(() => {
    const totalEquipes = teams.length;
    const equipesAtivas = teams.filter(t => t.status_inscricao === 'confirmado').length;
    const craftersAlocados = teams.length;
    const craftersDisponiveis = availableCrafters.length;

    setStats({
      totalEquipes,
      equipesAtivas,
      craftersAlocados,
      craftersDisponiveis
    });
  }, [teams, availableCrafters]);

  // Limpar mensagens após 3 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Filtrar equipes
  const equipesFiltradas = useMemo(() => {
    return teams.filter(equipe => {
      const matchesSearch = equipe.crafter_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           equipe.mentor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           equipe.projeto_titulo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || equipe.status_inscricao === statusFilter;
      const matchesProjeto = !projetoFilter || equipe.projeto_id === parseInt(projetoFilter);
      const matchesMentor = !mentorFilter || equipe.mentor_id === parseInt(mentorFilter);
      
      return matchesSearch && matchesStatus && matchesProjeto && matchesMentor;
    });
  }, [teams, searchTerm, statusFilter, projetoFilter, mentorFilter]);

  // Agrupar equipes por projeto
  const equipesAgrupadasPorProjeto = useMemo(() => {
    const grupos = {};
    equipesFiltradas.forEach(equipe => {
      const projetoId = equipe.projeto_id;
      if (!grupos[projetoId]) {
        grupos[projetoId] = {
          projeto: projects.find(p => p.id === projetoId),
          equipes: []
        };
      }
      grupos[projetoId].equipes.push(equipe);
    });
    return grupos;
  }, [equipesFiltradas, projects]);

  // Função para criar equipe aprimorada
  const handleCriarEquipe = async () => {
    if (!newTeam.projeto_id || !newTeam.mentor_id || newTeam.crafters_ids.length === 0) {
      setMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Verificar se o mentor já está alocado no projeto
    const mentorJaAlocado = teams.some(t => 
      t.mentor_id === parseInt(newTeam.mentor_id) && 
      t.projeto_id === parseInt(newTeam.projeto_id)
    );

    if (mentorJaAlocado) {
      setMessage('Este mentor já está alocado neste projeto.');
      return;
    }

    try {
      // Criar uma equipe para cada crafter selecionado
      for (const crafterId of newTeam.crafters_ids) {
        await createTeam({
          projeto_id: parseInt(newTeam.projeto_id),
          mentor_id: parseInt(newTeam.mentor_id),
          crafter_id: parseInt(crafterId),
          status_inscricao: 'inscrito'
        });
      }

      setMessage(`Equipe criada com sucesso! ${newTeam.crafters_ids.length} crafter(s) alocado(s).`);
      setNewTeam({ projeto_id: '', mentor_id: '', crafters_ids: [] });
      notifyDataChange();
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
      setMessage('Erro ao criar equipe. Tente novamente.');
    }
  };

  // Função para alterar status
  const handleAlterarStatus = async (equipeId, novoStatus) => {
    try {
      await updateTeamStatus(equipeId, novoStatus);
      setMessage(`Status alterado para ${novoStatus} com sucesso!`);
      notifyDataChange();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      setMessage('Erro ao alterar status. Tente novamente.');
    }
  };

  // Função para remover crafter
  const handleRemoverCrafter = async (equipeId) => {
    if (window.confirm('Tem certeza que deseja remover este crafter da equipe?')) {
      try {
        await removeCrafterFromTeam(equipeId);
        setMessage('Crafter removido da equipe com sucesso!');
        notifyDataChange();
      } catch (error) {
        console.error('Erro ao remover crafter:', error);
        setMessage('Erro ao remover crafter. Tente novamente.');
      }
    }
  };

  // Função para mostrar detalhes da equipe
  const handleShowTeamDetails = (equipe) => {
    setSelectedTeam(equipe);
    setShowTeamDetails(true);
  };

  // Função para exportar dados
  const exportarCSV = () => {
    const headers = ['Projeto', 'Mentor', 'Crafter', 'Status', 'Data Inscrição'];
    const rows = equipesFiltradas.map(equipe => [
      equipe.projeto_titulo || 'N/A',
      equipe.mentor_nome || 'N/A',
      equipe.crafter_nome || 'N/A',
      equipe.status_inscricao || 'N/A',
      new Date(equipe.data_inscricao).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtrar mentores disponíveis para o projeto selecionado
  const mentoresDisponiveis = useMemo(() => {
    if (!newTeam.projeto_id) return mentors;
    
    // Mentores que já estão vinculados ao projeto ou não têm projeto vinculado
    return mentors.filter(mentor => {
      const projetosMentor = projects.filter(p => p.mentor_id === mentor.id);
      return projetosMentor.some(p => p.id === parseInt(newTeam.projeto_id)) || projetosMentor.length === 0;
    });
  }, [mentors, projects, newTeam.projeto_id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'inscrito': return '#ffc107';
      case 'confirmado': return '#28a745';
      case 'finalizado': return '#6c757d';
      default: return '#dc3545';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'inscrito': return 'Inscrito';
      case 'confirmado': return 'Confirmado';
      case 'finalizado': return 'Finalizado';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="admin-equipes">
      {/* Header com estatísticas */}
      <div className="header">
        <h1>👥 Gerenciamento de Equipes</h1>
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-number">{stats.totalEquipes}</div>
            <div className="stat-label">Total de Equipes</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.equipesAtivas}</div>
            <div className="stat-label">Equipes Ativas</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.craftersAlocados}</div>
            <div className="stat-label">Crafters Alocados</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.craftersDisponiveis}</div>
            <div className="stat-label">Crafters Disponíveis</div>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {message && (
        <div className="message success">
          {message}
          <button onClick={() => setMessage('')} className="close-message">×</button>
        </div>
      )}

      {error && (
        <div className="message error">
          {error}
          <button onClick={() => setError('')} className="close-message">×</button>
        </div>
      )}

      {/* Navegação por abas */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          📋 Equipes Ativas
        </button>
        <button 
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ➕ Criar Equipe
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Análises
        </button>
      </div>

      {/* Aba Equipes Ativas */}
      {activeTab === 'teams' && (
        <div className="tab-content">
          {/* Filtros */}
          <div className="filters">
            <div className="filter-group">
              <input
                type="text"
                placeholder="🔍 Buscar por crafter, mentor ou projeto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-group">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os status</option>
                <option value="inscrito">Inscrito</option>
                <option value="confirmado">Confirmado</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>

            <div className="filter-group">
              <select
                value={projetoFilter}
                onChange={(e) => setProjetoFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os projetos</option>
                {projects.map(projeto => (
                  <option key={projeto.id} value={projeto.id}>
                    {projeto.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <select
                value={mentorFilter}
                onChange={(e) => setMentorFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os mentores</option>
                {mentors.map(mentor => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.nome}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={exportarCSV} className="btn btn-secondary">
              📊 Exportar CSV
            </button>
          </div>

          {/* Lista de equipes agrupadas por projeto */}
          <div className="teams-container">
            {Object.keys(equipesAgrupadasPorProjeto).length === 0 ? (
              <div className="no-data">
                <p>Nenhuma equipe encontrada com os filtros aplicados.</p>
              </div>
            ) : (
              Object.entries(equipesAgrupadasPorProjeto).map(([projetoId, grupo]) => (
                <div key={projetoId} className="project-group">
                  <div className="project-header">
                    <h3>🎯 {grupo.projeto?.titulo || 'Projeto Desconhecido'}</h3>
                    <div className="project-info">
                      <span className="team-count">{grupo.equipes.length} equipe(s)</span>
                      <span className="project-status">{grupo.projeto?.status || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="teams-grid">
                    {grupo.equipes.map(equipe => (
                      <div key={equipe.id} className="team-card">
                        <div className="team-header">
                          <div className="crafter-info">
                            <strong>{equipe.crafter_nome}</strong>
                            <span className="mentor-name">👨‍🏫 {equipe.mentor_nome}</span>
                          </div>
                          <div 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(equipe.status_inscricao) }}
                          >
                            {getStatusLabel(equipe.status_inscricao)}
                          </div>
                        </div>
                        
                        <div className="team-details">
                          <div className="detail-item">
                            <span className="label">Data de Inscrição:</span>
                            <span className="value">
                              {new Date(equipe.data_inscricao).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        <div className="team-actions">
                          <select
                            value={equipe.status_inscricao}
                            onChange={(e) => handleAlterarStatus(equipe.id, e.target.value)}
                            className="status-select"
                          >
                            <option value="inscrito">Inscrito</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="finalizado">Finalizado</option>
                          </select>
                          
                          <button
                            onClick={() => handleShowTeamDetails(equipe)}
                            className="btn btn-sm btn-secondary"
                            title="Ver detalhes"
                          >
                            👁️
                          </button>
                          
                          <button
                            onClick={() => handleRemoverCrafter(equipe.id)}
                            className="btn btn-sm btn-danger"
                            title="Remover da equipe"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Aba Criar Equipe */}
      {activeTab === 'create' && (
        <div className="tab-content">
          <div className="create-team-section">
            <h2>🎯 Criar Nova Equipe</h2>
            <p className="info-text">
              Selecione um projeto, mentor e crafters para formar uma equipe completa.
            </p>
            
            <div className="form">
              <div className="form-row">
                <div className="form-group">
                  <label>📋 Projeto *</label>
                  <select
                    value={newTeam.projeto_id}
                    onChange={(e) => setNewTeam({...newTeam, projeto_id: e.target.value, mentor_id: ''})}
                    required
                    className="form-control"
                  >
                    <option value="">Selecione um Projeto</option>
                    {projects.map(projeto => (
                      <option key={projeto.id} value={projeto.id}>
                        {projeto.titulo} ({projeto.status})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>👨‍🏫 Mentor *</label>
                  <select
                    value={newTeam.mentor_id}
                    onChange={(e) => setNewTeam({...newTeam, mentor_id: e.target.value})}
                    required
                    className="form-control"
                    disabled={!newTeam.projeto_id}
                  >
                    <option value="">Selecione um Mentor</option>
                    {mentoresDisponiveis.map(mentor => (
                      <option key={mentor.id} value={mentor.id}>
                        {mentor.nome} - {mentor.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group full-width">
                <label>👥 Crafters da Equipe *</label>
                <div className="crafters-selection">
                  {availableCrafters.length === 0 ? (
                    <div className="empty-state">
                      <p>Nenhum crafter disponível. Todos os crafters já estão em equipes.</p>
                    </div>
                  ) : (
                    <div className="crafters-grid">
                      {availableCrafters.map(crafter => (
                        <label key={crafter.id} className={`crafter-card ${newTeam.crafters_ids.includes(crafter.id) ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={newTeam.crafters_ids.includes(crafter.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTeam({
                                  ...newTeam, 
                                  crafters_ids: [...newTeam.crafters_ids, crafter.id]
                                });
                              } else {
                                setNewTeam({
                                  ...newTeam, 
                                  crafters_ids: newTeam.crafters_ids.filter(id => id !== crafter.id)
                                });
                              }
                            }}
                          />
                          <div className="crafter-info">
                            <div className="crafter-avatar">
                              {crafter.avatar_url ? (
                                <img src={crafter.avatar_url} alt={crafter.nome} />
                              ) : (
                                <div className="avatar-placeholder">
                                  {crafter.nome.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="crafter-details">
                              <strong>{crafter.nome}</strong>
                              <span className="crafter-email">{crafter.email}</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button
                  onClick={handleCriarEquipe}
                  className="btn btn-primary"
                  disabled={!newTeam.projeto_id || !newTeam.mentor_id || newTeam.crafters_ids.length === 0 || loading}
                >
                  {loading ? 'Criando...' : `🚀 Criar Equipe (${newTeam.crafters_ids.length} crafter${newTeam.crafters_ids.length !== 1 ? 's' : ''})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aba Análises */}
      {activeTab === 'analytics' && (
        <div className="tab-content">
          <div className="analytics-section">
            <h2>📊 Análises de Equipes</h2>
            
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Distribuição por Status</h3>
                <div className="status-distribution">
                  {['inscrito', 'confirmado', 'finalizado'].map(status => {
                    const count = teams.filter(t => t.status_inscricao === status).length;
                    const percentage = teams.length > 0 ? (count / teams.length * 100).toFixed(1) : 0;
                    return (
                      <div key={status} className="status-item">
                        <div className="status-bar">
                          <div 
                            className="status-fill"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: getStatusColor(status)
                            }}
                          ></div>
                        </div>
                        <div className="status-info">
                          <span className="status-name">{getStatusLabel(status)}</span>
                          <span className="status-count">{count} ({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="analytics-card">
                <h3>Projetos com Mais Equipes</h3>
                <div className="project-ranking">
                  {Object.entries(
                    projects.reduce((acc, projeto) => {
                      const count = teams.filter(t => t.projeto_id === projeto.id).length;
                      if (count > 0) acc[projeto.titulo] = count;
                      return acc;
                    }, {})
                  )
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([titulo, count]) => (
                    <div key={titulo} className="ranking-item">
                      <span className="project-name">{titulo}</span>
                      <span className="team-count">{count} equipe(s)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analytics-card">
                <h3>Mentores Mais Ativos</h3>
                <div className="mentor-ranking">
                  {Object.entries(
                    mentors.reduce((acc, mentor) => {
                      const count = teams.filter(t => t.mentor_id === mentor.id).length;
                      if (count > 0) acc[mentor.nome] = count;
                      return acc;
                    }, {})
                  )
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([nome, count]) => (
                    <div key={nome} className="ranking-item">
                      <span className="mentor-name">{nome}</span>
                      <span className="team-count">{count} equipe(s)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes da equipe */}
      {showTeamDetails && selectedTeam && (
        <div className="modal-overlay" onClick={() => setShowTeamDetails(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes da Equipe</h2>
              <button onClick={() => setShowTeamDetails(false)} className="close-button">×</button>
            </div>
            
            <div className="team-details-content">
              <div className="detail-section">
                <h3>👤 Crafter</h3>
                <p><strong>Nome:</strong> {selectedTeam.crafter_nome}</p>
                <p><strong>Email:</strong> {crafters.find(c => c.id === selectedTeam.crafter_id)?.email}</p>
              </div>

              <div className="detail-section">
                <h3>👨‍🏫 Mentor</h3>
                <p><strong>Nome:</strong> {selectedTeam.mentor_nome}</p>
                <p><strong>Email:</strong> {mentors.find(m => m.id === selectedTeam.mentor_id)?.email}</p>
              </div>

              <div className="detail-section">
                <h3>🎯 Projeto</h3>
                <p><strong>Título:</strong> {selectedTeam.projeto_titulo}</p>
                <p><strong>Status:</strong> {projects.find(p => p.id === selectedTeam.projeto_id)?.status}</p>
              </div>

              <div className="detail-section">
                <h3>📋 Informações da Equipe</h3>
                <p><strong>Status:</strong> {getStatusLabel(selectedTeam.status_inscricao)}</p>
                <p><strong>Data de Inscrição:</strong> {new Date(selectedTeam.data_inscricao).toLocaleString('pt-BR')}</p>
                <p><strong>Última Atualização:</strong> {new Date(selectedTeam.updated_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-equipes {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: 30px;
        }

        .header h1 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 1.8rem;
        }

        .stats-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #666;
        }

        .message {
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .close-message {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          margin-left: 10px;
        }

        .tabs {
          display: flex;
          gap: 5px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e1e5e9;
        }

        .tab {
          padding: 12px 20px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }

        .tab.active {
          color: #007bff;
          border-bottom-color: #007bff;
          background: #f8f9fa;
        }

        .tab:hover:not(.active) {
          color: #333;
          background: #f8f9fa;
        }

        .tab-content {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .filters {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-group {
          flex: 1;
          min-width: 200px;
        }

        .search-input, .filter-select {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
        }

        .search-input:focus, .filter-select:focus {
          outline: none;
          border-color: #007bff;
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

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }

        .teams-container {
          max-height: 600px;
          overflow-y: auto;
        }

        .project-group {
          margin-bottom: 30px;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          overflow: hidden;
        }

        .project-header {
          background: #f8f9fa;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e1e5e9;
        }

        .project-header h3 {
          margin: 0;
          color: #333;
        }

        .project-info {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .team-count {
          background: #007bff;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
        }

        .project-status {
          background: #28a745;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .teams-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 15px;
          padding: 20px;
        }

        .team-card {
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 15px;
          background: white;
          transition: all 0.2s;
        }

        .team-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .team-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .crafter-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mentor-name {
          font-size: 12px;
          color: #666;
        }

        .status-badge {
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }

        .team-details {
          margin-bottom: 15px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }

        .label {
          font-size: 12px;
          color: #666;
        }

        .value {
          font-size: 12px;
          font-weight: 500;
        }

        .team-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .status-select {
          flex: 1;
          padding: 6px 8px;
          border: 1px solid #e1e5e9;
          border-radius: 4px;
          font-size: 12px;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }

        .create-team-section h2 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .info-text {
          color: #666;
          margin-bottom: 30px;
        }

        .form {
          max-width: 800px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-weight: 500;
          color: #333;
        }

        .form-control {
          padding: 10px 12px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-control:focus {
          outline: none;
          border-color: #007bff;
        }

        .form-control:disabled {
          background: #f8f9fa;
          color: #666;
        }

        .crafters-selection {
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          padding: 15px;
          max-height: 300px;
          overflow-y: auto;
        }

        .crafters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 10px;
        }

        .crafter-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .crafter-card:hover {
          border-color: #007bff;
        }

        .crafter-card.selected {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .crafter-card input[type="checkbox"] {
          margin: 0;
        }

        .crafter-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .crafter-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crafter-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: #007bff;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .crafter-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .crafter-email {
          font-size: 12px;
          color: #666;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .form-actions {
          margin-top: 30px;
          text-align: center;
        }

        .analytics-section h2 {
          margin: 0 0 20px 0;
          color: #333;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .analytics-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e1e5e9;
        }

        .analytics-card h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 1.1rem;
        }

        .status-distribution {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .status-bar {
          height: 20px;
          background: #e1e5e9;
          border-radius: 10px;
          overflow: hidden;
        }

        .status-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .status-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        .status-name {
          font-weight: 500;
        }

        .status-count {
          color: #666;
        }

        .project-ranking, .mentor-ranking {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ranking-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: white;
          border-radius: 4px;
          border: 1px solid #e1e5e9;
        }

        .project-name, .mentor-name {
          font-weight: 500;
          color: #333;
        }

        .team-count {
          background: #007bff;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e1e5e9;
        }

        .modal-header h2 {
          margin: 0;
          color: #333;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .team-details-content {
          padding: 20px;
        }

        .detail-section {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #f1f3f4;
        }

        .detail-section:last-child {
          border-bottom: none;
        }

        .detail-section h3 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 1rem;
        }

        .detail-section p {
          margin: 5px 0;
          color: #666;
        }

        @media (max-width: 768px) {
          .admin-equipes {
            padding: 10px;
          }

          .stats-cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .filters {
            flex-direction: column;
          }

          .filter-group {
            min-width: auto;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .teams-grid {
            grid-template-columns: 1fr;
          }

          .analytics-grid {
            grid-template-columns: 1fr;
          }

          .modal {
            width: 95%;
            margin: 10px;
          }
        }
      `}</style>
    </div>
  );
}