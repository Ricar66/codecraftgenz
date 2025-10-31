// src/admin/AdminInscricoes.jsx
import React, { useState, useEffect, useCallback } from 'react';

import styles from './AdminInscricoes.module.css';

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
      <div className={styles.adminContent}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Carregando inscrições...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.adminContent}>
        <div className={styles.errorState}>
          <h2>Erro ao carregar inscrições</h2>
          <p>{error}</p>
          <button onClick={fetchInscricoes} className={styles.retryBtn}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminContent}>
      <div className={styles.pageHeader}>
        <h1>Inscrições de Crafters</h1>
        <p>Gerencie as inscrições recebidas através do formulário "Quero ser um Crafter"</p>
      </div>

        <div className={styles.filtersSection}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por nome, email, cidade, estado ou área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filtersRow}>
          <div className={styles.statusFilter}>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className={styles.statusSelect}
            >
              <option value="">Todos os status</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.areaFilter}>
            <select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              className={styles.areaSelect}
            >
              <option value="">Todas as áreas</option>
              {areasInteresse.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.dateFilter}>
            <select
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className={styles.dateSelect}
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

      <div className={styles.stats}>
        <span className="stat-item">
          Total: {filteredInscricoes.length}
        </span>
      </div>

      <div className={styles.inscricoesGrid}>
        {filteredInscricoes.length === 0 ? (
          <div className={styles.emptyState}>
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
              <div key={inscricao.id} className={styles.inscricaoCard}>
                <div className={styles.cardHeader}>
                  <h3>{inscricao.nome}</h3>
                  <div 
                    className={styles.statusBadge}
                    style={{ backgroundColor: statusInfo.color }}
                  >
                    {statusInfo.label}
                  </div>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.infoRow}>
                    <strong>Email:</strong>
                    <a href={`mailto:${inscricao.email}`}>{inscricao.email}</a>
                  </div>
                  
                  {inscricao.telefone && (
                    <div className={styles.infoRow}>
                      <strong>Telefone:</strong>
                      <span>{inscricao.telefone}</span>
                    </div>
                  )}
                  
                  {(inscricao.cidade || inscricao.estado) && (
                    <div className={styles.infoRow}>
                      <strong>Localização:</strong>
                      <span>
                        {[inscricao.cidade, inscricao.estado].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {inscricao.area_interesse && (
                    <div className={styles.infoRow}>
                      <strong>Área de Interesse:</strong>
                      <span className={styles.areaTag}>{inscricao.area_interesse}</span>
                    </div>
                  )}
                  
                  {inscricao.mensagem && (
                    <div className={`${styles.infoRow} ${styles.messageRow}`}>
                      <strong>Mensagem:</strong>
                      <p className={styles.messageText}>{inscricao.mensagem}</p>
                    </div>
                  )}
                  
                  <div className={styles.infoRow}>
                    <strong>Data da Inscrição:</strong>
                    <span>{formatDate(inscricao.data_inscricao)}</span>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <select
                    value={inscricao.status}
                    onChange={(e) => updateStatus(inscricao.id, e.target.value)}
                    className={styles.statusSelectInline}
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
    </div>
  );
};

export default AdminInscricoes;