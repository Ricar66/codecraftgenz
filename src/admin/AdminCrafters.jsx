import React, { useState, useEffect, useMemo } from 'react';

import { useDataSync } from '../context/DataSyncContext.jsx';

export default function AdminCrafters() {
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Estados locais para UI
  const [message, setMessage] = useState('');
  // Função para criar novo crafter
  const handleCreateCrafter = async () => {
    if (!newCrafter.nome || !newCrafter.email) {
      setMessage('Nome e email são obrigatórios');
      return;
    }

    try {
      await createCrafter(newCrafter);
      setNewCrafter({ nome: '', email: '', avatar_url: '' });
      setMessage('Crafter criado com sucesso!');
      notifyDataChange();
    } catch (error) {
      console.error('Erro ao criar crafter:', error);
      setMessage('Erro ao criar crafter: ' + error.message);
    }
  };

  // Limpar mensagem após 3 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Usar dados sincronizados do contexto
  const {
    crafters,
    projects,
    loading,
    error,
    createCrafter,
    notifyDataChange,
    craftersWithTeamInfo
  } = useDataSync();
  
  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [filterProjeto, setFilterProjeto] = useState('');
  const [sortField, setSortField] = useState('nome');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Estado para novo crafter
  const [newCrafter, setNewCrafter] = useState({ nome: '', email: '', avatar_url: '' });

  // Processar dados dos crafters com informações de equipe e projeto (usando dados do contexto)
  const craftersProcessados = useMemo(() => {
    return craftersWithTeamInfo;
  }, [craftersWithTeamInfo]);

  // Filtrar e ordenar crafters
  const craftersFiltrados = useMemo(() => {
    let resultado = craftersProcessados;

    // Aplicar busca por nome ou email
    if (searchTerm) {
      resultado = resultado.filter(crafter =>
        crafter.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crafter.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por equipe/projeto
    if (filterProjeto) {
      resultado = resultado.filter(crafter => crafter.projeto_id === parseInt(filterProjeto));
    }

    // Filtrar por status de equipe
    if (filterEquipe) {
      resultado = resultado.filter(crafter => crafter.status_inscricao === filterEquipe);
    }

    // Ordenar
    resultado.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return resultado;
  }, [craftersProcessados, searchTerm, filterProjeto, filterEquipe, sortField, sortDirection]);

  // Paginação
  const totalPages = Math.ceil(craftersFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const craftersPaginados = craftersFiltrados.slice(startIndex, endIndex);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterProjeto, filterEquipe]);

  // Função para ordenação
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Função para exportar CSV
  const exportarCSV = () => {
    const headers = ['Nome Completo', 'Email', 'Telefone', 'Projeto', 'Mentor', 'Status da Equipe'];
    const csvContent = [
      headers.join(','),
      ...craftersFiltrados.map(crafter => [
        `"${crafter.nome}"`,
        `"${crafter.email}"`,
        `"${crafter.telefone || 'Não informado'}"`,
        `"${crafter.projeto_nome}"`,
        `"${crafter.mentor_nome}"`,
        `"${crafter.status_inscricao}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `crafters_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Obter lista única de status para filtro
  const statusUnicos = [...new Set(craftersProcessados.map(c => c.status_inscricao))];

  if (loading) {
    return (
      <div className="admin-crafters">
        <div className="loading">Carregando dados dos crafters...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-crafters">
        <div className="error">{error}</div>
        <button onClick={() => window.location.reload()} className="btn btn-primary">Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div className="admin-crafters">
      {/* Mensagem de feedback */}
      {message && (
        <div className={`message ${message.includes('Erro') ? 'error' : 'success'}`}>
          {message}
          <button onClick={() => setMessage('')} className="close-message">×</button>
        </div>
      )}

      <div className="header">
        <div className="header-content">
          <div>
            <h1 className="title">Gerenciamento de Crafters</h1>
            <p className="subtitle">
              Visualize e gerencie todos os crafters cadastrados no sistema
            </p>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => notifyDataChange()} 
              className="btn btn-secondary"
              disabled={loading}
            >
              🔄 {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Seção de criação de novo crafter */}
      <div className="create-crafter-section">
        <h2>Criar Novo Crafter</h2>
        <div className="form-row">
          <input
            type="text"
            placeholder="Nome completo"
            value={newCrafter.nome}
            onChange={(e) => setNewCrafter({...newCrafter, nome: e.target.value})}
            className="form-control"
          />
          <input
            type="email"
            placeholder="Email"
            value={newCrafter.email}
            onChange={(e) => setNewCrafter({...newCrafter, email: e.target.value})}
            className="form-control"
          />
          <input
            type="url"
            placeholder="URL do Avatar (opcional)"
            value={newCrafter.avatar_url}
            onChange={(e) => setNewCrafter({...newCrafter, avatar_url: e.target.value})}
            className="form-control"
          />
          <button
            onClick={handleCreateCrafter}
            disabled={!newCrafter.nome || !newCrafter.email}
            className="btn btn-primary"
          >
            Criar Crafter
          </button>
        </div>
      </div>

      {/* Controles de filtro e busca */}
      <div className="controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-section">
          <select
            value={filterProjeto}
            onChange={(e) => setFilterProjeto(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os projetos</option>
            {projects.map(projeto => (
              <option key={projeto.id} value={projeto.id}>
                {projeto.nome}
              </option>
            ))}
          </select>

          <select
            value={filterEquipe}
            onChange={(e) => setFilterEquipe(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os status</option>
            {statusUnicos.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button onClick={exportarCSV} className="btn btn-secondary">
            📊 Exportar CSV
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="stats">
        <div className="stat-card">
          <h3>{crafters.length}</h3>
          <p>Total de Crafters</p>
        </div>
        <div className="stat-card">
          <h3>{craftersFiltrados.length}</h3>
          <p>Crafters Filtrados</p>
        </div>
        <div className="stat-card">
          <h3>{craftersProcessados.filter(c => c.equipe_id).length}</h3>
          <p>Com Equipe</p>
        </div>
        <div className="stat-card">
          <h3>{craftersProcessados.filter(c => !c.equipe_id).length}</h3>
          <p>Sem Equipe</p>
        </div>
      </div>

      {/* Tabela de crafters */}
      <div className="table-container">
        <table className="crafters-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('nome')} className="sortable">
                Nome Completo
                {sortField === 'nome' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('email')} className="sortable">
                Email
                {sortField === 'email' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th>Telefone</th>
              <th onClick={() => handleSort('projeto_nome')} className="sortable">
                Projeto Associado
                {sortField === 'projeto_nome' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('mentor_nome')} className="sortable">
                Mentor
                {sortField === 'mentor_nome' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('status_inscricao')} className="sortable">
                Status da Equipe
                {sortField === 'status_inscricao' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th>Pontos</th>
            </tr>
          </thead>
          <tbody>
            {craftersPaginados.length > 0 ? (
              craftersPaginados.map(crafter => (
                <tr key={crafter.id}>
                  <td>
                    <div className="crafter-info">
                      {crafter.avatar_url && (
                        <img 
                          src={crafter.avatar_url} 
                          alt={crafter.nome}
                          className="avatar"
                        />
                      )}
                      <span className="nome">{crafter.nome}</span>
                    </div>
                  </td>
                  <td>{crafter.email}</td>
                  <td>{crafter.telefone || 'Não informado'}</td>
                  <td>
                    <span className={`projeto-tag ${crafter.projeto_id ? 'assigned' : 'unassigned'}`}>
                      {crafter.projeto_nome}
                    </span>
                  </td>
                  <td>
                    <span className={`mentor-tag ${crafter.mentor_id ? 'assigned' : 'unassigned'}`}>
                      {crafter.mentor_nome}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${crafter.status_inscricao.toLowerCase().replace(' ', '-')}`}>
                      {crafter.status_inscricao}
                    </span>
                  </td>
                  <td>
                    <span className="points">{crafter.points || 0}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  {searchTerm || filterProjeto || filterEquipe
                    ? 'Nenhum crafter encontrado com os filtros aplicados.'
                    : 'Nenhum crafter cadastrado no sistema.'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de paginação */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary"
          >
            ← Anterior
          </button>
          
          <div className="pagination-info">
            <span>Página {currentPage} de {totalPages}</span>
            <span>({craftersFiltrados.length} crafters encontrados)</span>
          </div>
          
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="items-per-page"
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="btn btn-secondary"
          >
            Próxima →
          </button>
        </div>
      )}

      <style jsx>{`
        .admin-crafters {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          margin-bottom: 30px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .header-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        .last-update {
          font-size: 0.9rem;
          color: #666;
          font-style: italic;
        }

        .title {
          font-size: 2.5rem;
          color: #333;
          margin-bottom: 10px;
        }

        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }

        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .search-section {
          flex: 1;
          min-width: 300px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s;
        }

        .search-input:focus {
          outline: none;
          border-color: #007bff;
        }

        .filters-section {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .filter-select {
          padding: 10px 12px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          background: white;
          min-width: 150px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }

        .stat-card h3 {
          font-size: 2rem;
          color: #007bff;
          margin: 0 0 5px 0;
        }

        .stat-card p {
          color: #666;
          margin: 0;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .crafters-table {
          width: 100%;
          border-collapse: collapse;
        }

        .crafters-table th,
        .crafters-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e1e5e9;
        }

        .crafters-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #333;
        }

        .sortable {
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s;
        }

        .sortable:hover {
          background: #e9ecef;
        }

        .sort-indicator {
          color: #007bff;
          font-weight: bold;
        }

        .crafter-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .nome {
          font-weight: 500;
        }

        .projeto-tag,
        .mentor-tag {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .projeto-tag.assigned,
        .mentor-tag.assigned {
          background: #d4edda;
          color: #155724;
        }

        .projeto-tag.unassigned,
        .mentor-tag.unassigned {
          background: #f8d7da;
          color: #721c24;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .status-inscrito {
          background: #fff3cd;
          color: #856404;
        }

        .status-confirmado {
          background: #d4edda;
          color: #155724;
        }

        .status-finalizado {
          background: #d1ecf1;
          color: #0c5460;
        }

        .status-sem-equipe {
          background: #f8d7da;
          color: #721c24;
        }

        .points {
          font-weight: 600;
          color: #007bff;
        }

        .no-data {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 40px;
        }

        .loading,
        .error {
          text-align: center;
          padding: 40px;
          font-size: 1.1rem;
        }

        .error {
          color: #dc3545;
        }

        .create-crafter-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }

        .create-crafter-section h2 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .form-row {
          display: flex;
          gap: 15px;
          align-items: center;
          flex-wrap: wrap;
        }

        .form-control {
          padding: 10px 12px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
          min-width: 200px;
          flex: 1;
        }

        .form-control:focus {
          outline: none;
          border-color: #007bff;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .pagination-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          font-size: 0.9rem;
          color: #666;
        }

        .items-per-page {
          padding: 8px 12px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          background: white;
        }

        @media (max-width: 768px) {
          .controls {
            flex-direction: column;
            align-items: stretch;
          }

          .filters-section {
            flex-direction: column;
            gap: 10px;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .table-container {
            overflow-x: auto;
          }

          .crafters-table {
            min-width: 800px;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}