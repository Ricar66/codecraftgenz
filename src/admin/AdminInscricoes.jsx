// src/admin/AdminInscricoes.jsx
import React, { useState, useEffect, useCallback } from 'react';

import { apiRequest } from '../lib/apiConfig.js';

import styles from './AdminInscricoes.module.css';
import './AdminCommon.css';

const AdminInscricoes = () => {
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string }
  const [updatingId, setUpdatingId] = useState(null);

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
    setLoading(true);
    if (!import.meta.env.VITE_API_URL && import.meta.env.DEV) {
      setError("O backend não está configurado. Defina VITE_API_URL no seu arquivo .env.development para carregar os dados.");
      setInscricoes([]);
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filtroStatus) {
        params.append('status', filtroStatus);
      }
      
      const data = await apiRequest(`/api/inscricoes?${params.toString()}`, { method: 'GET' });
      setInscricoes(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setInscricoes([]);
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

  const updateStatus = async (id, novoStatus) => {
    const allowed = statusOptions.map(o => o.value);
    if (!allowed.includes(novoStatus)) {
      setToast({ type: 'error', message: 'Status inválido selecionado.' });
      return;
    }

    try {
      setUpdatingId(id);
      await apiRequest(`/api/inscricoes/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: novoStatus }) });

      // Atualizar a lista local
      setInscricoes(prev => 
        prev.map(inscricao => 
          inscricao.id === id 
            ? { ...inscricao, status: novoStatus }
            : inscricao
        )
      );
      setToast({ type: 'success', message: 'Status atualizado com sucesso.' });
    } catch (err) {
      setToast({ type: 'error', message: `Erro ao atualizar status: ${err.message}` });
    } finally {
      setUpdatingId(null);
    }
  };

  // Auto-dismiss do toast após alguns segundos
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

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
      <div className={styles.adminContent + ' admin-content'}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Carregando inscrições...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.adminContent + ' admin-content'}>
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
    <div className={styles.adminContent + ' admin-content'}>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: toast.type === 'success' ? '#27ae60' : '#e74c3c',
            background: toast.type === 'success' ? '#ecf9f1' : '#fee',
            color: toast.type === 'success' ? '#2c3e50' : '#8e2f2f'
          }}
        >
          {toast.message}
        </div>
      )}
      <div className={styles.pageHeader}>
        <h1 className="title">Inscrições de Crafters</h1>
        <p className="muted">Gerencie as inscrições recebidas através do formulário "Quero ser um Crafter"</p>
      </div>

        <div className={styles.filtersSection + ' filters-section'}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por nome, email, cidade, estado ou área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput + ' search-input'}
          />
        </div>
        
        <div className={styles.filtersRow}>
          <div className={styles.statusFilter}>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className={styles.statusSelect + ' filter-select'}
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
              className={styles.areaSelect + ' filter-select'}
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
              className={styles.dateSelect + ' filter-select'}
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
              <div key={inscricao.id} className={styles.inscricaoCard + ' card'}>
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
                    disabled={updatingId === inscricao.id}
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