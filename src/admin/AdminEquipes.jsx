import React, { useState, useEffect } from 'react';

export default function AdminEquipes() {
  const [mentores, setMentores] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [crafters, setCrafters] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mentores');

  // Estados para formulários
  const [novoMentor, setNovoMentor] = useState({ nome: '', email: '', telefone: '', bio: '' });
  const [novoCrafter, setNovoCrafter] = useState({ nome: '', email: '', avatar_url: '' });
  const [novaEquipe, setNovaEquipe] = useState({ mentor_id: '', crafter_id: '', projeto_id: '', status_inscricao: 'inscrito' });
  const [mentorProjeto, setMentorProjeto] = useState({ projeto_id: '', mentor_id: '' });

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [mentoresRes, projetosRes, craftersRes, equipesRes] = await Promise.all([
        fetch('http://localhost:8080/api/sqlite/mentores'),
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

      setMentores(mentoresData.data || []);
      setProjetos(projetosData.data || []);
      setCrafters(craftersData.data || []);
      setEquipes(equipesData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarMentor = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8080/api/sqlite/mentores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoMentor)
      });
      
      if (response.ok) {
        setNovoMentor({ nome: '', email: '', telefone: '', bio: '' });
        carregarDados();
      }
    } catch (error) {
      console.error('Erro ao criar mentor:', error);
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
      const response = await fetch('http://localhost:8080/api/sqlite/equipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaEquipe)
      });
      
      if (response.ok) {
        setNovaEquipe({ mentor_id: '', crafter_id: '', projeto_id: '', status_inscricao: 'inscrito' });
        carregarDados();
      }
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
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
            <h2>Criar Novo Mentor</h2>
            <form onSubmit={criarMentor} className="form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Nome"
                  value={novoMentor.nome}
                  onChange={(e) => setNovoMentor({...novoMentor, nome: e.target.value})}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={novoMentor.email}
                  onChange={(e) => setNovoMentor({...novoMentor, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="tel"
                  placeholder="Telefone"
                  value={novoMentor.telefone}
                  onChange={(e) => setNovoMentor({...novoMentor, telefone: e.target.value})}
                />
                <textarea
                  placeholder="Bio"
                  value={novoMentor.bio}
                  onChange={(e) => setNovoMentor({...novoMentor, bio: e.target.value})}
                />
              </div>
              <button type="submit" className="btn btn-primary">Criar Mentor</button>
            </form>
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

          <div className="section">
            <h2>Mentores Cadastrados</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Bio</th>
                  </tr>
                </thead>
                <tbody>
                  {mentores.map(mentor => (
                    <tr key={mentor.id}>
                      <td>{mentor.nome}</td>
                      <td>{mentor.email}</td>
                      <td>{mentor.telefone || '-'}</td>
                      <td>{mentor.bio ? mentor.bio.substring(0, 50) + '...' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                <select
                  value={novaEquipe.crafter_id}
                  onChange={(e) => setNovaEquipe({...novaEquipe, crafter_id: e.target.value})}
                  required
                >
                  <option value="">Selecione um Crafter</option>
                  {crafters.map(crafter => (
                    <option key={crafter.id} value={crafter.id}>
                      {crafter.nome}
                    </option>
                  ))}
                </select>
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
                    <th>Crafter</th>
                    <th>Status</th>
                    <th>Data Inscrição</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {equipes.map(equipe => {
                    const projeto = projetos.find(p => p.id === equipe.projeto_id);
                    const mentor = mentores.find(m => m.id === equipe.mentor_id);
                    const crafter = crafters.find(c => c.id === equipe.crafter_id);
                    
                    return (
                      <tr key={equipe.id}>
                        <td>{projeto?.titulo || 'N/A'}</td>
                        <td>{mentor?.nome || 'N/A'}</td>
                        <td>{crafter?.nome || 'N/A'}</td>
                        <td>
                          <span className={`status status-${equipe.status_inscricao}`}>
                            {equipe.status_inscricao}
                          </span>
                        </td>
                        <td>{equipe.data_inscricao ? new Date(equipe.data_inscricao).toLocaleDateString() : '-'}</td>
                        <td>
                          <div className="btn-group">
                            {equipe.status_inscricao === 'inscrito' && (
                              <button 
                                className="btn btn-sm btn-secondary"
                                onClick={() => alterarStatusEquipe(equipe.id, 'confirmado')}
                              >
                                Confirmar
                              </button>
                            )}
                            {equipe.status_inscricao === 'confirmado' && (
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => alterarStatusEquipe(equipe.id, 'finalizado')}
                              >
                                Finalizar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          outline: none; 
          border-color: #00E4F2; 
        }
        .form textarea { resize: vertical; min-height: 80px; }
        
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