import React, { useState, useEffect, useMemo } from 'react';

import { useAuth } from '../context/useAuth';

export default function AdminUsuarios() {
  // Estados principais
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Estados para formulário
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'user',
    status: 'active'
  });
  
  // Estados para filtros e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('nome');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Estados para auditoria
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  
  const { user: currentUser } = useAuth();

  // Carregar usuários
  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/usuarios');
      if (!response.ok) throw new Error('Erro ao carregar usuários');
      
      const data = await response.json();
      setUsuarios(Array.isArray(data) ? data : data.usuarios || []);
      setError('');
    } catch (err) {
      setError('Erro ao carregar usuários: ' + err.message);
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar logs de auditoria
  const loadAuditLogs = async () => {
    try {
      const response = await fetch('/api/usuarios/audit-logs');
      if (!response.ok) throw new Error('Erro ao carregar logs');
      
      const data = await response.json();
      setAuditLogs(Array.isArray(data) ? data : data.logs || []);
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
    }
  };

  useEffect(() => {
    loadUsuarios();
    loadAuditLogs();
  }, []);

  // Limpar mensagens após 3 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Filtrar e ordenar usuários
  const filteredUsuarios = useMemo(() => {
    let filtered = usuarios.filter(usuario => {
      const matchesSearch = usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || usuario.role === roleFilter;
      const matchesStatus = !statusFilter || usuario.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
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
  }, [usuarios, searchTerm, roleFilter, statusFilter, sortField, sortDirection]);

  // Paginação
  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const usuariosPaginados = filteredUsuarios.slice(startIndex, endIndex);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // Função para ordenação
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Criar/Editar usuário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email) {
      setMessage('Nome e email são obrigatórios');
      return;
    }

    if (!editingUser && !formData.senha) {
      setMessage('Senha é obrigatória para novos usuários');
      return;
    }

    try {
      setLoading(true);
      
      const url = editingUser ? `/api/usuarios/${editingUser.id}` : '/api/usuarios';
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar usuário');
      }

      await response.json();
      
      setMessage(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
      setShowForm(false);
      setEditingUser(null);
      setFormData({ nome: '', email: '', senha: '', role: 'user', status: 'active' });
      
      await loadUsuarios();
      await loadAuditLogs();
      
    } catch (err) {
      setError('Erro ao salvar usuário: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Deletar usuário
  const handleDelete = async (usuario) => {
    if (!window.confirm(`Tem certeza que deseja deletar o usuário "${usuario.nome}"?`)) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao deletar usuário');
      }

      setMessage('Usuário deletado com sucesso!');
      await loadUsuarios();
      await loadAuditLogs();
      
    } catch (err) {
      setError('Erro ao deletar usuário: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Alterar status do usuário
  const handleToggleStatus = async (usuario) => {
    const novoStatus = usuario.status === 'active' ? 'inactive' : 'active';
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/usuarios/${usuario.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: novoStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao alterar status');
      }

      setMessage(`Status do usuário alterado para ${novoStatus === 'active' ? 'ativo' : 'inativo'}!`);
      await loadUsuarios();
      await loadAuditLogs();
      
    } catch (err) {
      setError('Erro ao alterar status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Editar usuário
  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      role: usuario.role,
      status: usuario.status
    });
    setShowForm(true);
  };

  // Exportar CSV
  const exportarCSV = () => {
    const headers = ['ID', 'Nome', 'Email', 'Role', 'Status', 'Último Login', 'Criado em'];
    const rows = filteredUsuarios.map(usuario => [
      usuario.id,
      usuario.nome,
      usuario.email,
      usuario.role,
      usuario.status,
      usuario.ultimo_login || 'Nunca',
      new Date(usuario.created_at).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRoleLabel = (role) => {
    const roles = {
      'admin': 'Administrador',
      'editor': 'Editor',
      'user': 'Usuário'
    };
    return roles[role] || role;
  };

  const getStatusLabel = (status) => {
    const statuses = {
      'active': 'Ativo',
      'inactive': 'Inativo',
      'suspended': 'Suspenso'
    };
    return statuses[status] || status;
  };

  return (
    <div className="admin-usuarios">
      {/* Header */}
      <div className="header">
        <h1>👥 Gerenciamento de Usuários</h1>
        <div className="header-actions">
          <button 
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
            disabled={loading}
          >
            ➕ Novo Usuário
          </button>
          <button 
            onClick={() => setShowAuditLog(!showAuditLog)}
            className="btn btn-secondary"
          >
            📋 {showAuditLog ? 'Ocultar' : 'Ver'} Auditoria
          </button>
          <button 
            onClick={exportarCSV}
            className="btn btn-secondary"
            disabled={filteredUsuarios.length === 0}
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
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas as funções</option>
            <option value="admin">Administrador</option>
            <option value="editor">Editor</option>
            <option value="user">Usuário</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>
      </div>

      {/* Tabela de usuários */}
      {loading && <div className="loading">⏳ Carregando usuários...</div>}
      
      {!loading && (
        <>
          <div className="table-container">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('nome')} className="sortable">
                    Nome {sortField === 'nome' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('email')} className="sortable">
                    Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('role')} className="sortable">
                    Função {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('status')} className="sortable">
                    Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('ultimo_login')} className="sortable">
                    Último Login {sortField === 'ultimo_login' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      {searchTerm || roleFilter || statusFilter ? 
                        'Nenhum usuário encontrado com os filtros aplicados' : 
                        'Nenhum usuário cadastrado'
                      }
                    </td>
                  </tr>
                ) : (
                  usuariosPaginados.map(usuario => (
                    <tr key={usuario.id}>
                      <td>
                        <div className="user-info">
                          <strong>{usuario.nome}</strong>
                          {usuario.id === currentUser?.id && <span className="current-user">(Você)</span>}
                        </div>
                      </td>
                      <td>{usuario.email}</td>
                      <td>
                        <span className={`role-badge role-${usuario.role}`}>
                          {getRoleLabel(usuario.role)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${usuario.status}`}>
                          {getStatusLabel(usuario.status)}
                        </span>
                      </td>
                      <td>
                        {usuario.ultimo_login ? 
                          new Date(usuario.ultimo_login).toLocaleString('pt-BR') : 
                          'Nunca'
                        }
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="btn btn-sm btn-secondary"
                            title="Editar usuário"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleStatus(usuario)}
                            className={`btn btn-sm ${usuario.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                            title={usuario.status === 'active' ? 'Desativar' : 'Ativar'}
                            disabled={usuario.id === currentUser?.id}
                          >
                            {usuario.status === 'active' ? '🔒' : '🔓'}
                          </button>
                          <button
                            onClick={() => handleDelete(usuario)}
                            className="btn btn-sm btn-danger"
                            title="Deletar usuário"
                            disabled={usuario.id === currentUser?.id}
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
                <span>({filteredUsuarios.length} usuários encontrados)</span>
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
              <h2>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={() => setShowForm(false)} className="close-button">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="user-form">
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
                <label htmlFor="senha">
                  Senha {editingUser ? '(deixe em branco para manter a atual)' : '*'}
                </label>
                <input
                  id="senha"
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({...formData, senha: e.target.value})}
                  required={!editingUser}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Função *</label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                  className="form-control"
                >
                  <option value="user">Usuário</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  required
                  className="form-control"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="suspended">Suspenso</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log de auditoria */}
      {showAuditLog && (
        <div className="audit-log">
          <h3>📋 Log de Auditoria</h3>
          <div className="audit-entries">
            {auditLogs.length === 0 ? (
              <p>Nenhum log de auditoria encontrado.</p>
            ) : (
              auditLogs.slice(0, 50).map((log, index) => (
                <div key={index} className="audit-entry">
                  <div className="audit-time">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </div>
                  <div className="audit-action">
                    <strong>{log.actor}</strong> {log.action} 
                    {log.target && <span> em <em>{log.target}</em></span>}
                  </div>
                  {log.details && (
                    <div className="audit-details">{log.details}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-usuarios {
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

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background: #1e7e34;
        }

        .btn-warning {
          background: #ffc107;
          color: #212529;
        }

        .btn-warning:hover:not(:disabled) {
          background: #e0a800;
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

        .usuarios-table {
          width: 100%;
          border-collapse: collapse;
        }

        .usuarios-table th,
        .usuarios-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #e1e5e9;
        }

        .usuarios-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #495057;
        }

        .usuarios-table th.sortable {
          cursor: pointer;
          user-select: none;
        }

        .usuarios-table th.sortable:hover {
          background: #e9ecef;
        }

        .usuarios-table tbody tr:hover {
          background: #f8f9fa;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .current-user {
          font-size: 12px;
          color: #007bff;
          font-weight: normal;
        }

        .role-badge, .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .role-admin {
          background: #dc3545;
          color: white;
        }

        .role-editor {
          background: #ffc107;
          color: #212529;
        }

        .role-user {
          background: #6c757d;
          color: white;
        }

        .status-active {
          background: #d4edda;
          color: #155724;
        }

        .status-inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .status-suspended {
          background: #fff3cd;
          color: #856404;
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
          max-width: 500px;
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

        .user-form {
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

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 30px;
        }

        .audit-log {
          margin-top: 30px;
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .audit-log h3 {
          margin: 0 0 20px 0;
          color: #333;
        }

        .audit-entries {
          max-height: 400px;
          overflow-y: auto;
        }

        .audit-entry {
          padding: 10px;
          border-bottom: 1px solid #e1e5e9;
        }

        .audit-entry:last-child {
          border-bottom: none;
        }

        .audit-time {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }

        .audit-action {
          font-size: 14px;
          color: #333;
        }

        .audit-details {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }

        @media (max-width: 768px) {
          .admin-usuarios {
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

          .usuarios-table {
            font-size: 12px;
          }

          .usuarios-table th,
          .usuarios-table td {
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