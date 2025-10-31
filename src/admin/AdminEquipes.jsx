import React, { useState, useEffect } from 'react';

export default function AdminEquipes() {
  const [mentores, setMentores] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [crafters, setCrafters] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mentores');

  // Estados para formulários
  const [novoCrafter, setNovoCrafter] = useState({ nome: '', email: '', avatar_url: '' });
  const [novaEquipe, setNovaEquipe] = useState({ 
    mentor_id: '', 
    crafter_ids: [], // Mudança: array de crafters ao invés de um único crafter
    projeto_id: '', 
    status_inscricao: 'inscrito' 
  });
  const [mentorProjeto, setMentorProjeto] = useState({ projeto_id: '', mentor_id: '' });

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [mentoresRes, projetosRes, craftersRes, equipesRes] = await Promise.all([
        fetch('/api/mentores?all=1'), // Usar a API de mentores existente
        fetch('http://localhost:8080/api/sqlite/projetos'),
        fetch('http://localhost:8080/api/sqlite/crafters'),
        fetch('http://localhost:8080/api/sqlite/equipes')
      ]);

      const [mentoresData, projetosData, craftersData, equipesData] = await Promise.all([
        mentoresRes.json(),
        projetosRes.json(),
        craftersRes.json(),
        equipesRes.json()
      ]);

      // Normalizar dados dos mentores da API existente
      const mentoresNormalizados = (mentoresData || []).map(mentor => ({
        id: mentor.id,
        nome: mentor.name || mentor.nome,
        email: mentor.email,
        telefone: mentor.phone || mentor.telefone,
        bio: mentor.bio,
        visible: mentor.visible
      }));

      setMentores(mentoresNormalizados);
      setProjetos(projetosData.data || []);
      setCrafters(craftersData.data || []);
      setEquipes(equipesData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };



  const criarCrafter = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8080/api/sqlite/crafters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoCrafter)
      });
      
      if (response.ok) {
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
      const response = await fetch(`http://localhost:8080/api/sqlite/projetos/${mentorProjeto.projeto_id}/mentor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentor_id: mentorProjeto.mentor_id })
      });
      
      if (response.ok) {
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
      const promises = novaEquipe.crafter_ids.map(crafter_id => 
        fetch('http://localhost:8080/api/sqlite/equipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mentor_id: novaEquipe.mentor_id,
            crafter_id: crafter_id,
            projeto_id: novaEquipe.projeto_id,
            status_inscricao: novaEquipe.status_inscricao
          })
        })
      );

      const responses = await Promise.all(promises);
      
      // Verificar se todas as requisições foram bem-sucedidas
      const allSuccessful = responses.every(response => response.ok);
      
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

  const alterarStatusEquipe = async (equipeId, novoStatus) => {
    try {
      const response = await fetch(`http://localhost:8080/api/sqlite/equipes/${equipeId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_inscricao: novoStatus })
      });
      
      if (response.ok) {
        carregarDados();
      }
    } catch (error) {
      console.error('Erro ao alterar status da equipe:', error);
    }
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="admin-equipes">
      <h1 className="title">Gerenciamento de Equipes</h1>
      
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
                      <td>{mentor.nome}</td>
                      <td>{mentor.email}</td>
                      <td>{mentor.telefone || '-'}</td>
                      <td>
                        <span className={`status ${mentor.visible ? 'status-ativo' : 'status-inativo'}`}>
                          {mentor.visible ? 'Visível' : 'Oculto'}
                        </span>
                      </td>
                      <td>{mentor.bio ? mentor.bio.substring(0, 50) + '...' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section">
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
        </div>
      )}

      {/* Aba Associações */}
      {activeTab === 'associacoes' && (
        <div className="tab-content">
          <div className="section">
            <h2>Associar Mentor a Projeto</h2>
            <form onSubmit={associarMentorProjeto} className="form">
              <div className="form-row">
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
                <select
                  value={mentorProjeto.mentor_id}
                  onChange={(e) => setMentorProjeto({...mentorProjeto, mentor_id: e.target.value})}
                  required
                >
                  <option value="">Selecione um Mentor</option>
                  {mentores.map(mentor => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.nome}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-secondary">Associar</button>
            </form>
          </div>

          <div className="section">
            <h2>Criar Nova Equipe</h2>
            <form onSubmit={criarEquipe} className="form">
              <div className="form-row">
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
                <select
                  value={novaEquipe.mentor_id}
                  onChange={(e) => setNovaEquipe({...novaEquipe, mentor_id: e.target.value})}
                  required
                >
                  <option value="">Selecione um Mentor</option>
                  {mentores.map(mentor => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="multi-select-container">
                  <label>Crafters da Equipe (selecione múltiplos):</label>
                  <div className="crafters-selection">
                    {crafters.map(crafter => (
                      <label key={crafter.id} className="checkbox-item">
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
                        <span className="crafter-info">
                          <strong>{crafter.nome}</strong>
                          <small>{crafter.email}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <small className="help-text">
                    Selecionados: {novaEquipe.crafter_ids.length} crafter(s)
                  </small>
                </div>
                <select
                  value={novaEquipe.status_inscricao}
                  onChange={(e) => setNovaEquipe({...novaEquipe, status_inscricao: e.target.value})}
                >
                  <option value="inscrito">Inscrito</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Criar Equipe</button>
            </form>
          </div>
        </div>
      )}

      {/* Aba Equipes */}
      {activeTab === 'equipes' && (
        <div className="tab-content">
          <div className="section">
            <h2>Equipes Ativas</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Projeto</th>
                    <th>Mentor</th>
                    <th>Crafters</th>
                    <th>Status</th>
                    <th>Data Inscrição</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Agrupar equipes por projeto e mentor
                    const equipesAgrupadas = {};
                    
                    equipes.forEach(equipe => {
                      const key = `${equipe.projeto_id}-${equipe.mentor_id}`;
                      if (!equipesAgrupadas[key]) {
                        equipesAgrupadas[key] = {
                          projeto_id: equipe.projeto_id,
                          mentor_id: equipe.mentor_id,
                          status_inscricao: equipe.status_inscricao,
                          data_inscricao: equipe.data_inscricao,
                          crafters: [],
                          equipe_ids: []
                        };
                      }
                      equipesAgrupadas[key].crafters.push(equipe.crafter_id);
                      equipesAgrupadas[key].equipe_ids.push(equipe.id);
                    });

                    return Object.values(equipesAgrupadas).map((grupoEquipe, index) => {
                      const projeto = projetos.find(p => p.id === grupoEquipe.projeto_id);
                      const mentor = mentores.find(m => m.id === grupoEquipe.mentor_id);
                      const craftersEquipe = grupoEquipe.crafters.map(crafterId => 
                        crafters.find(c => c.id === crafterId)
                      ).filter(Boolean);
                      
                      return (
                        <tr key={`grupo-${index}`}>
                          <td>{projeto?.titulo || 'N/A'}</td>
                          <td>{mentor?.nome || 'N/A'}</td>
                          <td>
                            <div className="crafters-list">
                              {craftersEquipe.map((crafter, idx) => (
                                <span key={crafter.id} className="crafter-tag">
                                  {crafter.nome}
                                  {idx < craftersEquipe.length - 1 && ', '}
                                </span>
                              ))}
                              <small className="crafters-count">
                                ({craftersEquipe.length} crafter{craftersEquipe.length !== 1 ? 's' : ''})
                              </small>
                            </div>
                          </td>
                          <td>
                            <span className={`status status-${grupoEquipe.status_inscricao}`}>
                              {grupoEquipe.status_inscricao}
                            </span>
                          </td>
                          <td>{grupoEquipe.data_inscricao ? new Date(grupoEquipe.data_inscricao).toLocaleDateString() : '-'}</td>
                          <td>
                            <div className="btn-group">
                              {grupoEquipe.status_inscricao === 'inscrito' && (
                                <button 
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    // Alterar status de todas as equipes do grupo
                                    grupoEquipe.equipe_ids.forEach(equipeId => 
                                      alterarStatusEquipe(equipeId, 'confirmado')
                                    );
                                  }}
                                >
                                  Confirmar
                                </button>
                              )}
                              {grupoEquipe.status_inscricao === 'confirmado' && (
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={() => {
                                    // Alterar status de todas as equipes do grupo
                                    grupoEquipe.equipe_ids.forEach(equipeId => 
                                      alterarStatusEquipe(equipeId, 'finalizado')
                                    );
                                  }}
                                >
                                  Finalizar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-equipes { max-width: 1200px; margin: 0 auto; }
        .title { font-family: 'Montserrat', sans-serif; font-weight: 700; margin-bottom: 24px; color: #042326; }
        
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
          background: white; 
          border-radius: 12px; 
          padding: 24px; 
          margin-bottom: 24px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
        }
        .section h2 { 
          font-family: 'Montserrat', sans-serif; 
          font-weight: 600; 
          margin-bottom: 16px; 
          color: #042326; 
        }
        
        .form { display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form input, .form select, .form textarea { 
          padding: 12px; 
          border: 2px solid #e0e0e0; 
          border-radius: 8px; 
          font-size: 14px;
          transition: border-color 0.2s ease;
        }
        .form input:focus, .form select:focus, .form textarea:focus { 
          border-color: #00E4F2; 
          outline: none; 
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
          border: 2px solid #e0e0e0; 
          border-radius: 8px; 
          background: #f9f9f9; 
        }
        .checkbox-item { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 8px; 
          background: white; 
          border-radius: 6px; 
          cursor: pointer; 
          transition: all 0.2s ease; 
        }
        .checkbox-item:hover { 
          background: #f0f9ff; 
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
          color: #042326; 
        }
        .crafter-info small { 
          font-size: 12px; 
          color: #666; 
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
          border-bottom: 1px solid #e0e0e0; 
        }
        .table th { 
          background: #f8f9fa; 
          font-weight: 600; 
          color: #042326; 
        }
        .table tr:hover { background: #f8f9fa; }
        
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
          color: #666; 
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