import React, { useState, useEffect, useMemo } from 'react';
import { useDataSync } from '../context/DataSyncContext.jsx';

export default function AdminMentores() {
  // Estados principais
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Estados para formulário
  const [showForm, setShowForm] = useState(false);
  const [editingMentor, setEditingMentor] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    bio: '',
    especialidades: [],
    projetos_vinculados: []
  });
  
  // Estados para filtros e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [especialidadeFilter, setEspecialidadeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('nome');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Estados para vinculação de projetos
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [availableProjects, setAvailableProjects] = useState([]);

  // Usar contexto de sincronização de dados
  const { mentors, projects, teams, forceRefresh } = useDataSync();

  // Carregar dados
  useEffect(() => {
    forceRefresh();
  }, []);

  // Limpar mensagens após 3 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Processar mentores com informações de projetos
  const mentoresProcessados = useMemo(() => {
    return mentors.map(mentor => {
      const projetosMentor = projects.filter(projeto => projeto.mentor_id === mentor.id);
      const equipesMentor = teams.filter(equipe => equipe.mentor_id === mentor.id);
      
      return {
        ...mentor,
        projetos_count: projetosMentor.length,
        equipes_count: equipesMentor.length,
        projetos: projetosMentor,
        equipes: equipesMentor,
        especialidades: mentor.bio ? mentor.bio.split(',').map(s => s.trim()) : []
      };
    });
  }, [mentors, projects, teams]);

  // Filtrar e ordenar mentores
  const mentoresFiltrados = useMemo(() => {
    let filtered = mentoresProcessados.filter(mentor => {
      const matchesSearch = mentor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           mentor.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEspecialidade = !especialidadeFilter || 
                                  mentor.especialidades.some(esp => 
                                    esp.toLowerCase().includes(especialidadeFilter.toLowerCase())
                                  );
      const matchesStatus = !statusFilter || 
                           (statusFilter === 'ativo' && mentor.projetos_count > 0) ||
                           (statusFilter === 'inativo' && mentor.projetos_count === 0);
      
      return matchesSearch && matchesEspecialidade && matchesStatus;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [mentoresProcessados, searchTerm, especialidadeFilter, statusFilter, sortField, sortDirection]);

  // Paginação
  const totalPages = Math.ceil(mentoresFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const mentoresPaginados = mentoresFiltrados.slice(startIndex, endIndex);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, especialidadeFilter, statusFilter]);

  // Função para ordenação
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Criar/Editar mentor
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email) {
      setMessage('Nome e email são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      
      const url = editingMentor ? `/api/mentores/${editingMentor.id}` : '/api/mentores';
      const method = editingMentor ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          bio: formData.especialidades.join(', ')
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar mentor');
      }

      setMessage(editingMentor ? 'Mentor atualizado com sucesso!' : 'Mentor criado com sucesso!');
      setShowForm(false);
      setEditingMentor(null);
      setFormData({ nome: '', email: '', telefone: '', bio: '', especialidades: [], projetos_vinculados: [] });
      
      await forceRefresh();
      
    } catch (err) {
      setError('Erro ao salvar mentor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Deletar mentor
  const handleDelete = async (mentor) => {
    if (!window.confirm(`Tem certeza que deseja deletar o mentor "${mentor.nome}"?`)) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/mentores/${mentor.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao deletar mentor');
      }

      setMessage('Mentor deletado com sucesso!');
      await forceRefresh();
      
    } catch (err) {
      setError('Erro ao deletar mentor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Editar mentor
  const handleEdit = (mentor) => {
    setEditingMentor(mentor);
    setFormData({
      nome: mentor.nome,
      email: mentor.email,
      telefone: mentor.telefone || '',
      bio: mentor.bio || '',
      especialidades: mentor.especialidades || [],
      projetos_vinculados: mentor.projetos.map(p => p.id) || []
    });
    setShowForm(true);
  };

  // Vincular projetos ao mentor
  const handleVincularProjetos = (mentor) => {
    setSelectedMentor(mentor);
    setAvailableProjects(projects.filter(p => !p.mentor_id || p.mentor_id === mentor.id));
    setShowProjectModal(true);
  };

  // Salvar vinculação de projetos
  const handleSaveProjectLinks = async (projectIds) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/mentores/${selectedMentor.id}/projetos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projeto_ids: projectIds })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao vincular projetos');
      }

      setMessage('Projetos vinculados com sucesso!');
      setShowProjectModal(false);
      setSelectedMentor(null);
      await forceRefresh();
      
    } catch (err) {
      setError('Erro ao vincular projetos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Exportar CSV
  const exportarCSV = () => {
    const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Especialidades', 'Projetos', 'Equipes', 'Criado em'];
    const rows = mentoresFiltrados.map(mentor => [
      mentor.id,
      mentor.nome,
      mentor.email,
      mentor.telefone || '',
      mentor.especialidades.join('; '),
      mentor.projetos_count,
      mentor.equipes_count,
      new Date(mentor.created_at).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mentores_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Adicionar especialidade
  const adicionarEspecialidade = (especialidade) => {
    if (especialidade && !formData.especialidades.includes(especialidade)) {
      setFormData({
        ...formData,
        especialidades: [...formData.especialidades, especialidade]
      });
    }
  };

  // Remover especialidade
  const removerEspecialidade = (index) => {
    const novasEspecialidades = [...formData.especialidades];
    novasEspecialidades.splice(index, 1);
    setFormData({
      ...formData,
      especialidades: novasEspecialidades
    });
  };

  return (
    <div className="admin-mentores">
      {/* Header */}
      <div className="header">
        <h1>👨‍🏫 Gerenciamento de Mentores</h1>
        <div className="header-actions">
          <button 
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
            disabled={loading}
          >
            ➕ Novo Mentor
          </button>
          <button 
            onClick={exportarCSV}
            className="btn btn-secondary"
            disabled={mentoresFiltrados.length === 0}
          >
            📊 Exportar CSV
          </button>
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

      {/* Filtros */}
      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="🔍 Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <input
            type="text"
            placeholder="Filtrar por especialidade..."
            value={especialidadeFilter}
            onChange={(e) => setEspecialidadeFilter(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os status</option>
            <option value="ativo">Com projetos ativos</option>
            <option value="inativo">Sem projetos</option>
          </select>
        </div>
      </div>

      {/* Tabela de mentores */}
      {loading && <div className="loading">⏳ Carregando mentores...</div>}
      
      {!loading && (
        <>
          <div className="table-container">
            <table className="mentores-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('nome')} className="sortable">
                    Nome {sortField === 'nome' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('email')} className="sortable">
                    Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Especialidades</th>
                  <th onClick={() => handleSort('projetos_count')} className="sortable">
                    Projetos {sortField === 'projetos_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('equipes_count')} className="sortable">
                    Equipes {sortField === 'equipes_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {mentoresPaginados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      {searchTerm || especialidadeFilter || statusFilter ? 
                        'Nenhum mentor encontrado com os filtros aplicados' : 
                        'Nenhum mentor cadastrado'
                      }
                    </td>
                  </tr>
                ) : (
                  mentoresPaginados.map(mentor => (
                    <tr key={mentor.id}>
                      <td>
                        <div className="mentor-info">
                          <strong>{mentor.nome}</strong>
                          {mentor.telefone && <div className="phone">{mentor.telefone}</div>}
                        </div>
                      </td>
                      <td>{mentor.email}</td>
                      <td>
                        <div className="especialidades">
                          {mentor.especialidades.slice(0, 3).map((esp, index) => (
                            <span key={index} className="especialidade-tag">
                              {esp}
                            </span>
                          ))}
                          {mentor.especialidades.length > 3 && (
                            <span className="especialidade-tag more">
                              +{mentor.especialidades.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="count-badge">
                          {mentor.projetos_count}
                        </div>
                      </td>
                      <td>
                        <div className="count-badge">
                          {mentor.equipes_count}
                        </div>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            onClick={() => handleEdit(mentor)}
                            className="btn btn-sm btn-secondary"
                            title="Editar mentor"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleVincularProjetos(mentor)}
                            className="btn btn-sm btn-primary"
                            title="Vincular projetos"
                          >
                            🔗
                          </button>
                          <button
                            onClick={() => handleDelete(mentor)}
                            className="btn btn-sm btn-danger"
                            title="Deletar mentor"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
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
                <span>({mentoresFiltrados.length} mentores encontrados)</span>
              </div>
              
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="items-per-page"
              >
                <option value={5}>5 por página</option>
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
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
        </>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMentor ? 'Editar Mentor' : 'Novo Mentor'}</h2>
              <button onClick={() => setShowForm(false)} className="close-button">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="mentor-form">
              <div className="form-group">
                <label htmlFor="nome">Nome *</label>
                <input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefone">Telefone</label>
                <input
                  id="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Bio/Descrição</label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="form-control"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Especialidades</label>
                <div className="especialidades-input">
                  <input
                    type="text"
                    placeholder="Digite uma especialidade e pressione Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        adicionarEspecialidade(e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                    className="form-control"
                  />
                  <div className="especialidades-list">
                    {formData.especialidades.map((esp, index) => (
                      <span key={index} className="especialidade-item">
                        {esp}
                        <button
                          type="button"
                          onClick={() => removerEspecialidade(index)}
                          className="remove-especialidade"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : (editingMentor ? 'Atualizar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de vinculação de projetos */}
      {showProjectModal && selectedMentor && (
        <ProjectLinkModal
          mentor={selectedMentor}
          availableProjects={availableProjects}
          onSave={handleSaveProjectLinks}
          onClose={() => setShowProjectModal(false)}
        />
      )}

      <style jsx>{`
        .admin-mentores {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .header h1 {
          margin: 0;
          color: #333;
          font-size: 1.8rem;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
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

        .filters {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-group {
          flex: 1;
          min-width: 200px;
        }

        .search-input, .filter-input, .filter-select {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
        }

        .search-input:focus, .filter-input:focus, .filter-select:focus {
          outline: none;
          border-color: #007bff;
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 16px;
          color: #666;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .mentores-table {
          width: 100%;
          border-collapse: collapse;
        }

        .mentores-table th,
        .mentores-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #e1e5e9;
        }

        .mentores-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #495057;
        }

        .mentores-table th.sortable {
          cursor: pointer;
          user-select: none;
        }

        .mentores-table th.sortable:hover {
          background: #e9ecef;
        }

        .mentores-table tbody tr:hover {
          background: #f8f9fa;
        }

        .mentor-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .phone {
          font-size: 12px;
          color: #666;
        }

        .especialidades {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .especialidade-tag {
          background: #e9ecef;
          color: #495057;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
        }

        .especialidade-tag.more {
          background: #007bff;
          color: white;
        }

        .count-badge {
          background: #007bff;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          min-width: 24px;
        }

        .actions {
          display: flex;
          gap: 5px;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
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

        .mentor-form {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #333;
        }

        .form-control {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .form-control:focus {
          outline: none;
          border-color: #007bff;
        }

        .especialidades-input {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .especialidades-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .especialidade-item {
          background: #e9ecef;
          color: #495057;
          padding: 6px 10px;
          border-radius: 16px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .remove-especialidade {
          background: none;
          border: none;
          color: #dc3545;
          cursor: pointer;
          font-size: 14px;
          padding: 0;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 30px;
        }

        @media (max-width: 768px) {
          .admin-mentores {
            padding: 10px;
          }

          .header {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            justify-content: center;
          }

          .filters {
            flex-direction: column;
          }

          .filter-group {
            min-width: auto;
          }

          .mentores-table {
            font-size: 12px;
          }

          .mentores-table th,
          .mentores-table td {
            padding: 8px 10px;
          }

          .pagination {
            flex-direction: column;
            gap: 15px;
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

// Componente para modal de vinculação de projetos
function ProjectLinkModal({ mentor, availableProjects, onSave, onClose }) {
  const [selectedProjects, setSelectedProjects] = useState(
    mentor.projetos.map(p => p.id) || []
  );

  const handleToggleProject = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSave = () => {
    onSave(selectedProjects);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Vincular Projetos - {mentor.nome}</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="project-link-content">
          <p>Selecione os projetos que este mentor irá orientar:</p>
          
          <div className="projects-list">
            {availableProjects.length === 0 ? (
              <p>Nenhum projeto disponível para vinculação.</p>
            ) : (
              availableProjects.map(project => (
                <label key={project.id} className="project-item">
                  <input
                    type="checkbox"
                    checked={selectedProjects.includes(project.id)}
                    onChange={() => handleToggleProject(project.id)}
                  />
                  <div className="project-info">
                    <strong>{project.titulo}</strong>
                    <div className="project-description">{project.descricao}</div>
                    <div className="project-status">Status: {project.status}</div>
                  </div>
                </label>
              ))
            )}
          </div>
          
          <div className="form-actions">
            <button onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              Salvar Vinculações
            </button>
          </div>
        </div>

        <style jsx>{`
          .project-link-content {
            padding: 20px;
          }

          .projects-list {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            padding: 10px;
            margin: 15px 0;
          }

          .project-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px;
            border-bottom: 1px solid #f1f3f4;
            cursor: pointer;
          }

          .project-item:last-child {
            border-bottom: none;
          }

          .project-item:hover {
            background: #f8f9fa;
          }

          .project-info {
            flex: 1;
          }

          .project-description {
            font-size: 12px;
            color: #666;
            margin: 4px 0;
          }

          .project-status {
            font-size: 11px;
            color: #007bff;
          }

          .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
          }
        `}</style>
      </div>
    </div>
  );
}