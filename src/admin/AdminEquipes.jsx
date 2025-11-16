import React, { useState, useEffect, useMemo } from 'react';

import { apiRequest } from '../lib/apiConfig.js';
import { getAll as getAllProjects } from '../services/projectsAPI.js';

import './AdminEquipes.css';
import './AdminCommon.css';

export default function AdminEquipes() {
  const [mentores, setMentores] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [crafters, setCrafters] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mentores');
  const [message, setMessage] = useState('');
  
  // Estados para filtros
  const [filtroMentor, setFiltroMentor] = useState('');
  const [filtroCrafter, setFiltroCrafter] = useState('');
  const [filtroStatusCrafter, setFiltroStatusCrafter] = useState('todos');

  // Estados para formulários
  const [novoCrafter, setNovoCrafter] = useState({ nome: '', email: '', avatar_url: '' });
  const [novaEquipe, setNovaEquipe] = useState({ 
    mentor_id: '', 
    crafter_ids: [], // Mudança: array de crafters ao invés de um único crafter
    projeto_id: '', 
    status_inscricao: 'inscrito' 
  });
  const [mentorProjeto, setMentorProjeto] = useState({ projeto_id: '', mentor_id: '' });

  // Agrupar equipes por projeto - otimizado com useMemo
  const equipesAgrupadas = useMemo(() => 
    equipes.reduce((acc, equipe) => {
      if (!acc[equipe.projeto_id]) {
        acc[equipe.projeto_id] = [];
      }
      acc[equipe.projeto_id].push(equipe);
      return acc;
    }, {}), [equipes]
  );

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  // Pré-preencher formulário de Crafter via parâmetros da URL (vindo da Auditoria de Inscrições)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const preNome = params.get('prefill_nome');
      const preEmail = params.get('prefill_email');
      const preAvatar = params.get('prefill_avatar_url');
      const scrollTarget = params.get('scroll');

      if (preNome || preEmail || preAvatar) {
        setActiveTab('mentores');
        setNovoCrafter(prev => ({
          nome: preNome || prev.nome || '',
          email: preEmail || prev.email || '',
          avatar_url: preAvatar || prev.avatar_url || ''
        }));
        setMessage('Campos do crafter pré-preenchidos a partir da inscrição.');

        if (scrollTarget === 'create-crafter') {
          setTimeout(() => {
            const el = document.getElementById('create-crafter');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      }
    } catch {
      // silencioso
    }
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [mentoresData, projetosData, craftersData, equipesData] = await Promise.all([
        apiRequest('/api/mentores', { method: 'GET' }),
        getAllProjects(),
        apiRequest('/api/crafters', { method: 'GET' }),
        apiRequest('/api/equipes', { method: 'GET' })
      ]);

      // Normalizar dados dos mentores da API
      const mentoresNormalizados = (mentoresData.data || []).map(mentor => ({
        id: mentor.id,
        nome: mentor.nome,
        email: mentor.email,
        telefone: mentor.telefone,
        bio: mentor.bio,
        avatar_url: mentor.avatar_url || mentor.foto_url || mentor.photo || '',
        visible: mentor.visible
      }));

      setMentores(mentoresNormalizados);
      setProjetos(Array.isArray(projetosData) ? projetosData : []);
      setCrafters(craftersData.data || []);
      setEquipes(equipesData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mapeamento otimizado de crafters para equipes
  const crafterTeamsMap = useMemo(() => {
    const map = {};
    equipes.forEach(equipe => {
      if (!map[equipe.crafter_id]) {
        map[equipe.crafter_id] = [];
      }
      map[equipe.crafter_id].push(equipe);
    });
    return map;
  }, [equipes]);

  // Auditoria de relacionamentos
  const mentoresSemProjeto = useMemo(() =>
    mentores.filter(m => !equipes.some(e => e.mentor_id === m.id)),
    [mentores, equipes]
  );

  const projetosSemMentor = useMemo(() =>
    projetos.filter(p => !equipes.some(e => e.projeto_id === p.id)),
    [projetos, equipes]
  );

  const projetosComMultMentores = useMemo(() =>
    projetos.filter(p => {
      const mentorsSet = new Set(
        equipes.filter(e => e.projeto_id === p.id).map(e => e.mentor_id)
      );
      return mentorsSet.size > 1;
    }),
    [projetos, equipes]
  );

  const craftersSemEquipe = useMemo(() =>
    crafters.filter(c => !equipes.some(e => e.crafter_id === c.id)),
    [crafters, equipes]
  );

  const craftersEmMultEquipes = useMemo(() => {
    const countMap = {};
    equipes.forEach(e => {
      countMap[e.crafter_id] = (countMap[e.crafter_id] || 0) + 1;
    });
    return crafters.filter(c => (countMap[c.id] || 0) > 1);
  }, [equipes, crafters]);

  const equipesRefsInvalidas = useMemo(() =>
    equipes.filter(e =>
      !mentores.find(m => m.id === e.mentor_id) ||
      !crafters.find(c => c.id === e.crafter_id) ||
      !projetos.find(p => p.id === e.projeto_id)
    ),
    [equipes, mentores, crafters, projetos]
  );

  const equipesDuplicadas = useMemo(() => {
    const seen = {};
    const dupes = [];
    equipes.forEach(e => {
      const key = `${e.mentor_id}-${e.crafter_id}-${e.projeto_id}`;
      if (seen[key]) {
        dupes.push(e);
      } else {
        seen[key] = true;
      }
    });
    return dupes;
  }, [equipes]);

  // Funções de filtro otimizadas com useMemo
  const mentoresFiltrados = useMemo(() => 
    mentores.filter(mentor => 
      mentor.nome.toLowerCase().includes(filtroMentor.toLowerCase()) ||
      mentor.email.toLowerCase().includes(filtroMentor.toLowerCase())
    ), [mentores, filtroMentor]
  );

  const craftersFiltrados = useMemo(() => 
    crafters.filter(crafter => {
      const matchesName = crafter.nome.toLowerCase().includes(filtroCrafter.toLowerCase()) ||
                         crafter.email.toLowerCase().includes(filtroCrafter.toLowerCase());
      
      if (filtroStatusCrafter === 'todos') return matchesName;
      
      const crafterTeams = crafterTeamsMap[crafter.id] || [];
      if (filtroStatusCrafter === 'disponivel') return matchesName && crafterTeams.length === 0;
      if (filtroStatusCrafter === 'ocupado') return matchesName && crafterTeams.length > 0;
      
      return matchesName;
    }), [crafters, filtroCrafter, filtroStatusCrafter, crafterTeamsMap]
  );



  const criarCrafter = async (e) => {
    e.preventDefault();
    try {
      const emailNorm = (novoCrafter.email || '').trim().toLowerCase();
      if (!emailNorm) {
        setMessage('Informe um email válido para criar o crafter.');
        return;
      }
      const jaExiste = crafters.some(c => (c.email || '').trim().toLowerCase() === emailNorm);
      if (jaExiste) {
        setMessage('Já existe um crafter com este email.');
        alert('Já existe um crafter com este email.');
        return;
      }

      const response = await apiRequest('/api/crafters', {
        method: 'POST',
        body: JSON.stringify(novoCrafter)
      });
      
      if (response) {
        setNovoCrafter({ nome: '', email: '', avatar_url: '' });
        carregarDados();
      }
    } catch (error) {
      console.error('Erro ao criar crafter:', error);
    }
  };

  const associarMentorProjeto = async (e) => {
    e.preventDefault();
    try {
      const response = await apiRequest(`/api/projetos/${mentorProjeto.projeto_id}/mentor`, {
        method: 'POST',
        body: JSON.stringify({ mentor_id: mentorProjeto.mentor_id })
      });
      
      if (response) {
        setMentorProjeto({ projeto_id: '', mentor_id: '' });
        carregarDados();
      }
    } catch (error) {
      console.error('Erro ao associar mentor ao projeto:', error);
    }
  };

  const criarEquipe = async (e) => {
    e.preventDefault();
    try {
      // Validar se pelo menos um crafter foi selecionado
      if (novaEquipe.crafter_ids.length === 0) {
        alert('Selecione pelo menos um crafter para a equipe');
        return;
      }

      // Criar uma equipe para cada crafter selecionado
      const responses = await Promise.all(
        novaEquipe.crafter_ids.map(crafter_id => 
          apiRequest('/api/equipes', {
            method: 'POST',
            body: JSON.stringify({
              mentor_id: novaEquipe.mentor_id,
              crafter_id: crafter_id,
              projeto_id: novaEquipe.projeto_id,
              status_inscricao: novaEquipe.status_inscricao
            })
          })
        )
      );

      const allSuccessful = responses.every(Boolean);

      if (allSuccessful) {
        setNovaEquipe({ 
          mentor_id: '', 
          crafter_ids: [], 
          projeto_id: '', 
          status_inscricao: 'inscrito' 
        });
        carregarDados();
        alert(`Equipe criada com sucesso! ${novaEquipe.crafter_ids.length} crafter(s) adicionado(s).`);
      } else {
        throw new Error('Algumas equipes não puderam ser criadas');
      }
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
      alert('Erro ao criar equipe: ' + error.message);
    }
  };

  // Função para remover crafter da equipe
  const removerCrafterDaEquipe = async (equipeId) => {
    if (!window.confirm('Tem certeza que deseja remover este crafter da equipe?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/equipes/${equipeId}`, { method: 'DELETE' });

      if (response) {
        setMessage('Crafter removido da equipe com sucesso!');
        carregarDados(); // Recarregar dados
      } else {
        throw new Error('Erro ao remover crafter da equipe');
      }
    } catch (error) {
      console.error('Erro ao remover crafter:', error);
      setMessage('Erro ao remover crafter da equipe');
    }
  };

  // Função para adicionar crafter na equipe
  const adicionarCrafterNaEquipe = async (mentorId, projetoId, crafterId) => {
    if (!crafterId) return;

    try {
      const novaEquipeData = {
        mentor_id: mentorId,
        crafter_id: crafterId,
        projeto_id: projetoId,
        status_inscricao: 'inscrito'
      };

      const response = await apiRequest('/api/equipes', {
        method: 'POST',
        body: JSON.stringify(novaEquipeData)
      });

      if (response) {
        setMessage('Crafter adicionado à equipe com sucesso!');
        carregarDados(); // Recarregar dados
      } else {
        throw new Error('Erro ao adicionar crafter à equipe');
      }
    } catch (error) {
      console.error('Erro ao adicionar crafter:', error);
      setMessage('Erro ao adicionar crafter à equipe');
    }
  };

  const alterarStatusEquipe = async (equipeId, novoStatus) => {
    try {
      const response = await apiRequest(`/api/equipes/${equipeId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status_inscricao: novoStatus })
      });
      if (response) {
        carregarDados();
      }
    } catch (error) {
      console.error('Erro ao alterar status da equipe:', error);
    }
  };

  if (loading) {
    return (
      <div className="admin-equipes admin-content">
        <h1 className="title">Gerenciamento de Equipes</h1>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando dados de mentores, crafters e projetos...</p>
        </div>
      </div>
    );
  }

  const projetoSelecionado = projetos.find(p => p.id === novaEquipe.projeto_id);
  const mentorSelecionado = mentores.find(m => m.id === novaEquipe.mentor_id);

  return (
    <div className="admin-equipes admin-content">
      <h1 className="title">Gerenciamento de Equipes</h1>
      
      {/* Mensagem de feedback */}
      {message && (
        <div className={`message ${message.includes('Erro') ? 'error' : 'success'}`}>
          {message}
          <button onClick={() => setMessage('')} className="close-message">×</button>
        </div>
      )}
      
      {/* Navegação por abas */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'mentores' ? 'active' : ''}`}
          onClick={() => setActiveTab('mentores')}
        >
          Mentores
        </button>
        <button 
          className={`tab ${activeTab === 'associacoes' ? 'active' : ''}`}
          onClick={() => setActiveTab('associacoes')}
        >
          Associações
        </button>
        <button 
          className={`tab ${activeTab === 'equipes' ? 'active' : ''}`}
          onClick={() => setActiveTab('equipes')}
        >
          Equipes
        </button>
        <button 
          className={`tab ${activeTab === 'auditoria' ? 'active' : ''}`}
          onClick={() => setActiveTab('auditoria')}
        >
          Auditoria
        </button>
      </div>

      {/* Aba Mentores */}
      {activeTab === 'mentores' && (
        <div className="tab-content">
          <div className="section">
            <h2>Mentores Disponíveis</h2>
            <p className="info-text">
              Os mentores são gerenciados na <strong>página de Mentores</strong> do sistema. 
              Aqui você pode visualizar todos os mentores disponíveis para associar às equipes.
            </p>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Status</th>
                    <th>Bio</th>
                  </tr>
                </thead>
                <tbody>
                  {mentores.map(mentor => (
                    <tr key={mentor.id}>
                      <td data-label="Nome">{mentor.nome}</td>
                      <td data-label="Email">{mentor.email}</td>
                      <td data-label="Telefone">{mentor.telefone || '-'}</td>
                      <td data-label="Status">
                        <span className={`status ${mentor.visible ? 'status-ativo' : 'status-inativo'}`}>
                          {mentor.visible ? 'Visível' : 'Oculto'}
                        </span>
                      </td>
                      <td data-label="Bio">{mentor.bio ? mentor.bio.substring(0, 50) + '...' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section" id="create-crafter">
            <h2>Criar Novo Crafter</h2>
            <form onSubmit={criarCrafter} className="form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Nome"
                  value={novoCrafter.nome}
                  onChange={(e) => setNovoCrafter({...novoCrafter, nome: e.target.value})}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={novoCrafter.email}
                  onChange={(e) => setNovoCrafter({...novoCrafter, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="url"
                  placeholder="URL do Avatar"
                  value={novoCrafter.avatar_url}
                  onChange={(e) => setNovoCrafter({...novoCrafter, avatar_url: e.target.value})}
                />
              </div>
              <button type="submit" className="btn btn-primary">Criar Crafter</button>
            </form>
          </div>

          <div className="section">
            <h2>📋 Equipes Existentes</h2>
            <p className="info-text">
              Visualize e edite as equipes já formadas. Você pode adicionar ou remover crafters das equipes.
            </p>
            
            {Object.keys(equipesAgrupadas).length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma equipe criada ainda. Use o formulário acima para criar a primeira equipe.</p>
              </div>
            ) : (
              <div className="teams-list">
                {Object.entries(equipesAgrupadas).map(([projetoId, projetos]) => (
                  <div key={projetoId} className="project-group">
                    <h3 className="project-title">
                      📋 {projetos[0]?.projeto_titulo || 'Projeto sem título'}
                    </h3>
                    
                    {Object.entries(projetos.reduce((acc, equipe) => {
                      const mentorKey = `${equipe.mentor_id}-${equipe.mentor_nome}`;
                      if (!acc[mentorKey]) acc[mentorKey] = [];
                      acc[mentorKey].push(equipe);
                      return acc;
                    }, {})).map(([mentorKey, equipesDoMentor]) => {
                      const [mentorId, mentorNome] = mentorKey.split('-');
                      return (
                        <div key={mentorKey} className="mentor-team-group">
                          <div className="mentor-header">
                            <h4>👨‍🏫 {mentorNome}</h4>
                            <span className="team-count">
                              {equipesDoMentor.length} crafter{equipesDoMentor.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          <div className="team-members">
                            {equipesDoMentor.map(equipe => (
                              <div key={equipe.id} className="team-member-card">
                                <div className="member-info">
                                  <div className="member-avatar">
                                    {equipe.crafter_avatar_url ? (
                                      <img src={equipe.crafter_avatar_url} alt={equipe.crafter_nome} />
                                    ) : (
                                      <div className="avatar-placeholder">
                                        {equipe.crafter_nome.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="member-details">
                                    <strong>{equipe.crafter_nome}</strong>
                                    <small>{equipe.crafter_email}</small>
                                    <span className={`status-badge status-${equipe.status_inscricao}`}>
                                      {equipe.status_inscricao === 'inscrito' && '📝 Inscrito'}
                                      {equipe.status_inscricao === 'confirmado' && '✅ Confirmado'}
                                      {equipe.status_inscricao === 'finalizado' && '🏆 Finalizado'}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="member-actions">
                                  <select
                                    value={equipe.status_inscricao}
                                    onChange={(e) => alterarStatusEquipe(equipe.id, e.target.value)}
                                    className="status-select"
                                  >
                                    <option value="inscrito">📝 Inscrito</option>
                                    <option value="confirmado">✅ Confirmado</option>
                                    <option value="finalizado">🏆 Finalizado</option>
                                  </select>
                                  
                                  <button
                                    onClick={() => removerCrafterDaEquipe(equipe.id)}
                                    className="btn btn-danger btn-small"
                                    title="Remover crafter da equipe"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="add-crafter-section">
                            <h5>➕ Adicionar Crafter à Equipe</h5>
                            <div className="add-crafter-form">
                              <select
                                value=""
                                onChange={(e) => adicionarCrafterNaEquipe(mentorId, projetoId, e.target.value)}
                                className="crafter-select"
                              >
                                <option value="">Selecione um crafter para adicionar...</option>
                                {crafters
                                  .filter(crafter => !equipesDoMentor.some(eq => eq.crafter_id === crafter.id))
                                  .map(crafter => (
                                    <option key={crafter.id} value={crafter.id}>
                                      {crafter.nome} - {crafter.email}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aba Associações */}
      {activeTab === 'associacoes' && (
        <div className="tab-content">
          {/* Seção de Mentores Disponíveis */}
          <div className="section">
            <h2>👨‍🏫 Mentores Disponíveis</h2>
            <p className="info-text">
              Visualize todos os mentores cadastrados e seus projetos associados.
            </p>
            
            {/* Filtros para Mentores */}
            <div className="filters-section">
              <div className="filter-group">
                <label>🔍 Filtrar Mentores:</label>
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={filtroMentor}
                  onChange={(e) => setFiltroMentor(e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>
            
            {mentores.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum mentor cadastrado. Crie mentores na aba "Mentores".</p>
              </div>
            ) : mentoresFiltrados.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum mentor encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="mentores-grid">
                {mentoresFiltrados.map(mentor => (
                  <div key={mentor.id} className="mentor-card">
                    <div className="mentor-header">
                      <div className="mentor-avatar">
                        {mentor.avatar_url ? (
                          <img src={mentor.avatar_url} alt={mentor.nome} />
                        ) : (
                          <div className="avatar-placeholder">
                            {mentor.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="mentor-info">
                        <h4>{mentor.nome}</h4>
                        <p>{mentor.email}</p>
                        {mentor.telefone && <small>📞 {mentor.telefone}</small>}
                      </div>
                    </div>
                    
                    {mentor.bio && (
                      <div className="mentor-bio">
                        <p>{mentor.bio}</p>
                      </div>
                    )}
                    
                    <div className="mentor-projects">
                      <h5>Projetos Associados:</h5>
                      {projetos.filter(p => 
                        equipes.some(t => t.mentor_id === mentor.id && t.projeto_id === p.id)
                      ).length === 0 ? (
                        <span className="no-projects">Nenhum projeto associado</span>
                      ) : (
                        <div className="projects-list">
                          {projetos.filter(p => 
                            equipes.some(t => t.mentor_id === mentor.id && t.projeto_id === p.id)
                          ).map(projeto => (
                            <span key={projeto.id} className="project-tag">
                              📋 {projeto.titulo}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção de Crafters Disponíveis */}
          <div className="section">
            <h2>👥 Crafters Cadastrados</h2>
            <p className="info-text">
              Visualize todos os crafters cadastrados e seu status atual nas equipes.
            </p>
            
            {/* Filtros para Crafters */}
            <div className="filters-section">
              <div className="filter-group">
                <label>🔍 Filtrar Crafters:</label>
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={filtroCrafter}
                  onChange={(e) => setFiltroCrafter(e.target.value)}
                  className="filter-input"
                />
              </div>
            <div className="filter-group">
              <label>📊 Status:</label>
              <select
                value={filtroStatusCrafter}
                onChange={(e) => setFiltroStatusCrafter(e.target.value)}
                className="filter-select"
              >
                <option value="todos">Todos</option>
                <option value="disponivel">🟢 Disponíveis</option>
                <option value="ocupado">🔵 Em Equipes</option>
              </select>
              <button
                className="btn btn-outline"
                style={{ marginTop: 8 }}
                onClick={() => setFiltroStatusCrafter(prev => prev === 'todos' ? 'disponivel' : 'todos')}
                aria-label="Alternar entre mostrar todos e disponíveis"
              >
                {filtroStatusCrafter === 'todos' ? 'Mostrar disponíveis' : 'Mostrar todos'}
              </button>
            </div>
            </div>
            
            {crafters.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum crafter cadastrado. Crie crafters na aba "Mentores".</p>
              </div>
            ) : craftersFiltrados.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum crafter encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="crafters-overview-grid">
                {craftersFiltrados.map(crafter => {
                  const crafterTeams = crafterTeamsMap[crafter.id] || [];
                  return (
                    <div key={crafter.id} className="crafter-overview-card">
                      <div className="crafter-header">
                        <div className="crafter-avatar">
                          {crafter.avatar_url ? (
                            <img src={crafter.avatar_url} alt={crafter.nome} />
                          ) : (
                            <div className="avatar-placeholder">
                              {crafter.nome.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="crafter-info">
                          <h4>{crafter.nome}</h4>
                          <p>{crafter.email}</p>
                          <span className="points">⭐ {crafter.points || 0} pontos</span>
                        </div>
                      </div>
                      
                      <div className="crafter-status">
                        {crafterTeams.length === 0 ? (
                          <span className="status-available">🟢 Disponível</span>
                        ) : (
                          <div className="current-teams">
                            <span className="status-busy">🔵 Em {crafterTeams.length} equipe(s)</span>
                            {crafterTeams.map(team => {
                              const projeto = projetos.find(p => p.id === team.projeto_id);
                              const mentor = mentores.find(m => m.id === team.mentor_id);
                              return (
                                <div key={team.id} className="team-info">
                                  <small>
                                    📋 {projeto?.titulo || 'Projeto'} - 
                                    👨‍🏫 {mentor?.nome || 'Mentor'}
                                  </small>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="section">
            <h2>🎯 Criar Nova Equipe</h2>
            <p className="info-text">
              Associe um mentor e crafters a um projeto para formar uma equipe completa.
            </p>
            <form onSubmit={criarEquipe} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label>📋 Projeto</label>
                  <select
                    value={novaEquipe.projeto_id}
                    onChange={(e) => setNovaEquipe({...novaEquipe, projeto_id: e.target.value})}
                    required
                  >
                    <option value="">Selecione um Projeto</option>
                    {projetos.map(projeto => (
                      <option key={projeto.id} value={projeto.id}>
                        {projeto.titulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>👨‍🏫 Mentor</label>
                  <select
                    value={novaEquipe.mentor_id}
                    onChange={(e) => setNovaEquipe({...novaEquipe, mentor_id: e.target.value})}
                    required
                  >
                    <option value="">Selecione um Mentor</option>
                    {mentores.map(mentor => (
                      <option key={mentor.id} value={mentor.id}>
                        {mentor.nome} - {mentor.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group full-width">
                <label>👥 Crafters da Equipe</label>
                <div className="crafters-selection-improved">
                  {crafters.length === 0 ? (
                    <div className="empty-state">
                      <p>Nenhum crafter cadastrado. Crie crafters na aba "Mentores".</p>
                    </div>
                  ) : (
                    <div className="crafters-grid">
                      {crafters.map(crafter => (
                        <label key={crafter.id} className={`crafter-card ${novaEquipe.crafter_ids.includes(crafter.id) ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={novaEquipe.crafter_ids.includes(crafter.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNovaEquipe({
                                  ...novaEquipe, 
                                  crafter_ids: [...novaEquipe.crafter_ids, crafter.id]
                                });
                              } else {
                                setNovaEquipe({
                                  ...novaEquipe, 
                                  crafter_ids: novaEquipe.crafter_ids.filter(id => id !== crafter.id)
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
                              <small>{crafter.email}</small>
                              <span className="points">⭐ {crafter.points || 0} pontos</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="selection-summary">
                    <span className="selected-count">
                      ✅ {novaEquipe.crafter_ids.length} crafter(s) selecionado(s)
                    </span>
                  </div>
                </div>
              </div>

              <div className="section-card" style={{ marginTop: 12 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">🧩 Nome da Equipe</label>
                    <div className="muted">
                      {(projetoSelecionado?.titulo || 'Projeto não selecionado')} — {(mentorSelecionado?.nome || 'Mentor não selecionado')}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">👥 Participantes</label>
                    <div className="muted">{novaEquipe.crafter_ids.length} selecionado(s)</div>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>📊 Status Inicial</label>
                  <select
                    value={novaEquipe.status_inscricao}
                    onChange={(e) => setNovaEquipe({...novaEquipe, status_inscricao: e.target.value})}
                  >
                    <option value="inscrito">📝 Inscrito</option>
                    <option value="confirmado">✅ Confirmado</option>
                    <option value="finalizado">🏆 Finalizado</option>
                  </select>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary btn-large"
                disabled={novaEquipe.crafter_ids.length === 0}
              >
                🚀 Criar Equipe ({novaEquipe.crafter_ids.length} crafter{novaEquipe.crafter_ids.length !== 1 ? 's' : ''})
              </button>
            </form>
          </div>

          <div className="section">
            <h2>🔗 Associar Mentor a Projeto</h2>
            <p className="info-text">
              Associe mentores diretamente a projetos (sem formar equipe completa).
            </p>
            <form onSubmit={associarMentorProjeto} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label>📋 Projeto</label>
                  <select
                    value={mentorProjeto.projeto_id}
                    onChange={(e) => setMentorProjeto({...mentorProjeto, projeto_id: e.target.value})}
                    required
                  >
                    <option value="">Selecione um Projeto</option>
                    {projetos.map(projeto => (
                      <option key={projeto.id} value={projeto.id}>
                        {projeto.titulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>👨‍🏫 Mentor</label>
                  <select
                    value={mentorProjeto.mentor_id}
                    onChange={(e) => setMentorProjeto({...mentorProjeto, mentor_id: e.target.value})}
                    required
                  >
                    <option value="">Selecione um Mentor</option>
                    {mentores.map(mentor => (
                      <option key={mentor.id} value={mentor.id}>
                        {mentor.nome} - {mentor.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-secondary">🔗 Associar Mentor ao Projeto</button>
            </form>
          </div>
        </div>
      )}

      {/* Aba Auditoria */}
      {activeTab === 'auditoria' && (
        <div className="tab-content">
          <div className="section">
            <h2>🔎 Auditoria de Relacionamentos</h2>
            <p className="info-text">
              Esta seção destaca inconsistências nas relações entre Mentores, Projetos, Crafters e Equipes.
            </p>
            <div style={{ margin: '8px 0' }}>
              <button className="btn btn-secondary" onClick={()=>{
                const headers = ['categoria','id','nome','email','titulo_projeto'];
                const rows = [];
                mentoresSemProjeto.forEach(m => rows.push(['mentor_sem_projeto', m.id, m.nome || '', m.email || '', '']));
                projetosSemMentor.forEach(p => rows.push(['projeto_sem_mentor', p.id, '', '', p.titulo || `Projeto #${p.id}`]));
                projetosComMultMentores.forEach(p => rows.push(['projeto_multiplos_mentores', p.id, '', '', p.titulo || `Projeto #${p.id}`]));
                craftersSemEquipe.forEach(c => rows.push(['crafter_sem_equipe', c.id, c.nome || '', c.email || '', '']));
                craftersEmMultEquipes.forEach(c => rows.push(['crafter_multiplas_equipes', c.id, c.nome || '', c.email || '', '']));
                equipesRefsInvalidas.forEach(e => rows.push(['equipe_ref_invalida', e.id, e.nome || '', '', '']));
                equipesDuplicadas.forEach(e => rows.push(['equipe_duplicada', e.id, e.nome || '', '', '']));
                const csv = [headers.join(','), ...rows.map(r => r.map(v => String(v).replace(/\n/g,' ').replace(/"/g,'"')).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'auditoria_equipes.csv'; a.click(); URL.revokeObjectURL(url);
              }}>Exportar CSV das inconsistências</button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Verificação</th>
                    <th>Quantidade</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Mentores sem equipes/projetos</td>
                    <td>{mentoresSemProjeto.length}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => setActiveTab('associacoes')}>
                        Ver Mentores
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Projetos sem mentor/equipe</td>
                    <td>{projetosSemMentor.length}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => setActiveTab('associacoes')}>
                        Ver Projetos
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Projetos com múltiplos mentores</td>
                    <td>{projetosComMultMentores.length}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => setActiveTab('associacoes')}>
                        Revisar Associações
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Crafters sem equipe</td>
                    <td>{craftersSemEquipe.length}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => setActiveTab('associacoes')}>
                        Adicionar a Equipes
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Crafters em múltiplas equipes</td>
                    <td>{craftersEmMultEquipes.length}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => setActiveTab('equipes')}>
                        Ver Equipes
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Equipes com referências inválidas</td>
                    <td>{equipesRefsInvalidas.length}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => setActiveTab('equipes')}>
                        Corrigir
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Equipes duplicadas (mentor-crafter-projeto)</td>
                    <td>{equipesDuplicadas.length}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => setActiveTab('equipes')}>
                        Remover duplicatas
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="section">
              <h3>Detalhes</h3>
              {mentoresSemProjeto.length === 0 && projetosSemMentor.length === 0 && craftersSemEquipe.length === 0 && craftersEmMultEquipes.length === 0 && equipesRefsInvalidas.length === 0 && equipesDuplicadas.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma inconsistência encontrada. Tudo certo! ✅</p>
                </div>
              ) : (
                <div className="audit-details-grid">
                  {mentoresSemProjeto.length > 0 && (
                    <div className="audit-card">
                      <h4>Mentores sem equipes</h4>
                      <ul>
                        {mentoresSemProjeto.map(m => (
                          <li key={m.id}>{m.nome} — {m.email}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {projetosSemMentor.length > 0 && (
                    <div className="audit-card">
                      <h4>Projetos sem mentor</h4>
                      <ul>
                        {projetosSemMentor.map(p => (
                          <li key={p.id}>{p.titulo || `Projeto #${p.id}`}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {projetosComMultMentores.length > 0 && (
                    <div className="audit-card">
                      <h4>Projetos com múltiplos mentores</h4>
                      <ul>
                        {projetosComMultMentores.map(p => (
                          <li key={p.id}>{p.titulo || `Projeto #${p.id}`}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {craftersSemEquipe.length > 0 && (
                    <div className="audit-card">
                      <h4>Crafters sem equipe</h4>
                      <ul>
                        {craftersSemEquipe.map(c => (
                          <li key={c.id}>{c.nome} — {c.email}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {craftersEmMultEquipes.length > 0 && (
                    <div className="audit-card">
                      <h4>Crafters em múltiplas equipes</h4>
                      <ul>
                        {craftersEmMultEquipes.map(c => (
                          <li key={c.id}>{c.nome} — {c.email}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {equipesRefsInvalidas.length > 0 && (
                    <div className="audit-card">
                      <h4>Equipes com referências inválidas</h4>
                      <ul>
                        {equipesRefsInvalidas.map(e => (
                          <li key={e.id}>Equipe #{e.id} — mentor:{e.mentor_id}, crafter:{e.crafter_id}, projeto:{e.projeto_id}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {equipesDuplicadas.length > 0 && (
                    <div className="audit-card">
                      <h4>Equipes duplicadas</h4>
                      <ul>
                        {equipesDuplicadas.map(e => (
                          <li key={e.id}>Equipe #{e.id} — mentor:{e.mentor_id}, crafter:{e.crafter_id}, projeto:{e.projeto_id}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Aba Equipes Ativas */}
      {activeTab === 'equipes' && (
        <div className="tab-content">
          <div className="section">
            <h2>Equipes Ativas</h2>
            {Object.keys(equipesAgrupadas).length === 0 ? (
              <p>Nenhuma equipe encontrada.</p>
            ) : (
              Object.entries(equipesAgrupadas).map(([projetoId, equipes]) => (
                <div key={projetoId} className="project-section">
                  <h3>{equipes[0]?.projeto_titulo || 'Projeto sem título'}</h3>
                  <div className="teams-grid">
                    {Object.entries(
                      equipes.reduce((acc, equipe) => {
                        const mentorKey = equipe.mentor_nome;
                        if (!acc[mentorKey]) acc[mentorKey] = [];
                        acc[mentorKey].push(equipe);
                        return acc;
                      }, {})
                    ).map(([mentorNome, equipesDoMentor]) => (
                      <div key={mentorNome} className="team-card">
                        <h4>Mentor: {mentorNome}</h4>
                        <div className="team-members-list">
                          {equipesDoMentor.map(equipe => (
                            <div key={equipe.id} className="member-item">
                              <span>{equipe.crafter_nome}</span>
                              <select
                                value={equipe.status_inscricao}
                                onChange={(e) => alterarStatusEquipe(equipe.id, e.target.value)}
                                className="status-select"
                              >
                                <option value="inscrito">Inscrito</option>
                                <option value="confirmado">Confirmado</option>
                                <option value="finalizado">Finalizado</option>
                              </select>
                            </div>
                          ))}
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
      
      <style jsx>{`
        .admin-equipes { max-width: 1200px; margin: 0 auto; }
        .title { font-family: 'Montserrat', sans-serif; font-weight: 700; margin-bottom: 24px; color: #fff; }
        
        .tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 2px solid #e0e0e0; }
        .tab { 
          padding: 12px 24px; 
          border: none; 
          background: transparent; 
          cursor: pointer; 
          font-weight: 600; 
          color: #666; 
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
        }
        .tab:hover { color: #00E4F2; }
        .tab.active { color: #00E4F2; border-bottom-color: #00E4F2; }
        
        .tab-content { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .section { 
          background: transparent; 
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 12px; 
          padding: 24px; 
          margin-bottom: 24px; 
          box-shadow: none; 
        }
        .section h2 { 
          font-family: 'Montserrat', sans-serif; 
          font-weight: 600; 
          margin-bottom: 16px; 
          color: #fff; 
        }
        
        .form { display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form input, .form select, .form textarea { 
          padding: 12px; 
          border: 1px solid rgba(255, 255, 255, 0.28); 
          border-radius: 8px; 
          font-size: 14px;
          background: transparent;
          color: #fff;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .form input:focus, .form select:focus, .form textarea:focus { 
          border-color: #00E4F2; 
          outline: none; 
          box-shadow: 0 0 0 3px rgba(0, 228, 242, 0.28);
          background: rgba(255,255,255,0.06);
        }
        .form textarea { resize: vertical; min-height: 80px; }
        
        /* Estilos para seleção múltipla de crafters */
        .multi-select-container { 
          grid-column: 1 / -1; 
          margin-bottom: 16px; 
        }
        .multi-select-container label { 
          display: block; 
          margin-bottom: 8px; 
          font-weight: 600; 
          color: #042326; 
        }
        .crafters-selection { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
          gap: 12px; 
          max-height: 200px; 
          overflow-y: auto; 
          padding: 12px; 
          border: 1px solid rgba(255, 255, 255, 0.22); 
          border-radius: 8px; 
          background: transparent; 
        }
        .checkbox-item { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 8px; 
          background: transparent; 
          border-radius: 6px; 
          cursor: pointer; 
          transition: all 0.2s ease; 
        }
        .checkbox-item:hover { 
          background: rgba(0,228,242,0.08); 
          border-color: #00E4F2; 
        }
        .checkbox-item input[type="checkbox"] { 
          margin: 0; 
          cursor: pointer; 
        }
        .crafter-info { 
          display: flex; 
          flex-direction: column; 
          gap: 2px; 
        }
        .crafter-info strong { 
          font-size: 14px; 
          color: #fff; 
        }
        .crafter-info small { 
          font-size: 12px; 
          color: rgba(255,255,255,0.8); 
        }
        .help-text { 
          display: block; 
          margin-top: 8px; 
          font-size: 12px; 
          color: #666; 
          font-style: italic; 
        }
        
        .crafters-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .crafter-tag {
          display: inline-block;
          font-weight: 500;
        }

        .crafters-count {
          color: #666;
          font-size: 0.875rem;
          margin-top: 0.25rem;
          display: block;
        }
        
        .table-container { overflow-x: auto; }
        .table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 16px; 
        }
        .table th, .table td { 
          padding: 12px; 
          text-align: left; 
          border-bottom: 1px solid rgba(255, 255, 255, 0.16); 
        }
        .table th { 
          background: transparent; 
          font-weight: 600; 
          color: #fff; 
        }
        .table tr:hover { background: rgba(0,228,242,0.08); }
        
        .status { 
          padding: 4px 8px; 
          border-radius: 12px; 
          font-size: 12px; 
          font-weight: 600; 
          text-transform: uppercase; 
        }
        .status-inscrito { background: #fff3cd; color: #856404; }
        .status-confirmado { background: #d1ecf1; color: #0c5460; }
        .status-finalizado { background: #d4edda; color: #155724; }
        
        .btn-sm { padding: 6px 12px; font-size: 12px; }
        
        .loading { 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 200px; 
          font-size: 18px; 
          color: rgba(255,255,255,0.75); 
        }
        
        .message {
          padding: 12px 16px;
          margin: 16px 0;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 500;
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
          margin-left: 12px;
          opacity: 0.7;
        }
        .close-message:hover {
          opacity: 1;
        }
        
        @media (max-width: 768px) {
          .form-row { grid-template-columns: 1fr; }
          .tabs { overflow-x: auto; }
          .table-container { font-size: 14px; }
        }
      `}</style>
    </div>
  );
}