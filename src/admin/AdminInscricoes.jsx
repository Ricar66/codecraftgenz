// src/admin/AdminInscricoes.jsx
import React, { useState, useEffect, useCallback } from 'react';

const AdminInscricoes = () => {
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroData, setFiltroData] = useState('');

  const areasInteresse = [
    'Front-end',
    'Back-end', 
    'Dados',
    'Design',
    'DevOps',
    'Outros'
  ];

  const statusOptions = [
    { value: 'pendente', label: 'Pendente', color: '#f39c12' },
    { value: 'contato_realizado', label: 'Contato Realizado', color: '#3498db' },
    { value: 'confirmado', label: 'Confirmado', color: '#27ae60' },
    { value: 'rejeitado', label: 'Rejeitado', color: '#e74c3c' }
  ];

  const fetchInscricoes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroStatus) {
        params.append('status', filtroStatus);
      }
      
      const response = await fetch(`/api/inscricoes?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar inscrições');
      }
      
      const data = await response.json();
      setInscricoes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

  const updateStatus = async (id, novoStatus) => {
    try {
      const response = await fetch(`/api/inscricoes/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }

      // Atualizar a lista local
      setInscricoes(prev => 
        prev.map(inscricao => 
          inscricao.id === id 
            ? { ...inscricao, status: novoStatus }
            : inscricao
        )
      );
    } catch (err) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  useEffect(() => {
    fetchInscricoes();
  }, [fetchInscricoes]);

  const filteredInscricoes = inscricoes.filter(inscricao => {
    const matchesSearch = !searchTerm || 
      inscricao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inscricao.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inscricao.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inscricao.estado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inscricao.area_interesse?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArea = !filtroArea || inscricao.area_interesse === filtroArea;
    
    const matchesData = !filtroData || (() => {
      const inscricaoDate = new Date(inscricao.data_inscricao);
      const today = new Date();
      const diffDays = Math.floor((today - inscricaoDate) / (1000 * 60 * 60 * 24));
      
      switch(filtroData) {
        case 'hoje': return diffDays === 0;
        case 'semana': return diffDays <= 7;
        case 'mes': return diffDays <= 30;
        case 'trimestre': return diffDays <= 90;
        default: return true;
      }
    })();
    
    return matchesSearch && matchesArea && matchesData;
  });

  const getStatusInfo = (status) => {
    return statusOptions.find(opt => opt.value === status) || 
           { value: status, label: status, color: '#95a5a6' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-content">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando inscrições...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-content">
        <div className="error-state">
          <h2>Erro ao carregar inscrições</h2>
          <p>{error}</p>
          <button onClick={fetchInscricoes} className="retry-btn">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="page-header">
        <h1>Inscrições de Crafters</h1>
        <p>Gerencie as inscrições recebidas através do formulário "Quero ser um Crafter"</p>
      </div>

        <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nome, email, cidade, estado ou área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filters-row">
          <div className="status-filter">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="status-select"
            >
              <option value="">Todos os status</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="area-filter">
            <select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              className="area-select"
            >
              <option value="">Todas as áreas</option>
              {areasInteresse.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className="date-filter">
            <select
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="date-select"
            >
              <option value="">Todas as datas</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Última semana</option>
              <option value="mes">Último mês</option>
              <option value="trimestre">Último trimestre</option>
            </select>
          </div>
        </div>
      </div>

      <div className="stats">
        <span className="stat-item">
          Total: {filteredInscricoes.length}
        </span>
      </div>

      <div className="inscricoes-grid">
        {filteredInscricoes.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhuma inscrição encontrada</h3>
            <p>
              {searchTerm || filtroStatus || filtroArea || filtroData
                ? 'Tente ajustar os filtros de busca.'
                : 'Ainda não há inscrições de crafters.'}
            </p>
          </div>
        ) : (
          filteredInscricoes.map(inscricao => {
            const statusInfo = getStatusInfo(inscricao.status);
            
            return (
              <div key={inscricao.id} className="inscricao-card">
                <div className="card-header">
                  <h3>{inscricao.nome}</h3>
                  <div 
                    className="status-badge"
                    style={{ backgroundColor: statusInfo.color }}
                  >
                    {statusInfo.label}
                  </div>
                </div>

                <div className="card-content">
                  <div className="info-row">
                    <strong>Email:</strong>
                    <a href={`mailto:${inscricao.email}`}>{inscricao.email}</a>
                  </div>
                  
                  {inscricao.telefone && (
                    <div className="info-row">
                      <strong>Telefone:</strong>
                      <span>{inscricao.telefone}</span>
                    </div>
                  )}
                  
                  {(inscricao.cidade || inscricao.estado) && (
                    <div className="info-row">
                      <strong>Localização:</strong>
                      <span>
                        {[inscricao.cidade, inscricao.estado].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {inscricao.area_interesse && (
                    <div className="info-row">
                      <strong>Área de Interesse:</strong>
                      <span className="area-tag">{inscricao.area_interesse}</span>
                    </div>
                  )}
                  
                  {inscricao.mensagem && (
                    <div className="info-row message-row">
                      <strong>Mensagem:</strong>
                      <p className="message-text">{inscricao.mensagem}</p>
                    </div>
                  )}
                  
                  <div className="info-row">
                    <strong>Data da Inscrição:</strong>
                    <span>{formatDate(inscricao.data_inscricao)}</span>
                  </div>
                </div>

                <div className="card-actions">
                  <select
                    value={inscricao.status}
                    onChange={(e) => updateStatus(inscricao.id, e.target.value)}
                    className="status-select-inline"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        .admin-content {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          color: #2c3e50;
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: #7f8c8d;
          font-size: 1.1rem;
        }

        .filters-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .search-box {
          width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          font-size: 1rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #3498db;
        }

        .filters-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .status-filter,
        .area-filter,
        .date-filter {
          flex: 1;
          min-width: 200px;
        }

        .status-select,
        .area-select,
        .date-select {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
        }

        .stats {
          color: #7f8c8d;
          font-weight: 500;
        }

        .inscricoes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .inscricao-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .inscricao-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 1.5rem 1rem;
          border-bottom: 1px solid #f1f3f4;
        }

        .card-header h3 {
          margin: 0;
          color: #2c3e50;
          font-size: 1.2rem;
        }

        .status-badge {
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .card-content {
          padding: 0 1.5rem 1rem;
        }

        .info-row {
          display: flex;
          margin-bottom: 0.75rem;
          gap: 0.5rem;
        }

        .info-row strong {
          min-width: 120px;
          color: #2c3e50;
          font-weight: 600;
        }

        .info-row a {
          color: #3498db;
          text-decoration: none;
        }

        .info-row a:hover {
          text-decoration: underline;
        }

        .area-tag {
          background: #e8f4fd;
          color: #2980b9;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .message-row {
          flex-direction: column;
          align-items: flex-start;
        }

        .message-text {
          margin: 0.5rem 0 0 0;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
          line-height: 1.5;
          color: #495057;
          width: 100%;
          box-sizing: border-box;
        }

        .card-actions {
          padding: 1rem 1.5rem;
          border-top: 1px solid #f1f3f4;
          background: #f8f9fa;
        }

        .status-select-inline {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          background: white;
          font-size: 0.875rem;
        }

        .loading-state,
        .error-state,
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #7f8c8d;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .retry-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
        }

        .retry-btn:hover {
          background: #2980b9;
        }

        @media (max-width: 768px) {
          .admin-content {
            padding: 1rem;
          }

          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }

          .filters-row {
            flex-direction: column;
          }

          .status-filter,
          .area-filter,
          .date-filter {
            min-width: auto;
          }

          .inscricoes-grid {
            grid-template-columns: 1fr;
          }

          .info-row {
            flex-direction: column;
            gap: 0.25rem;
          }

          .info-row strong {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminInscricoes;