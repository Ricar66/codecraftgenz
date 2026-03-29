// src/admin/AdminParcerias.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { apiRequest } from '../lib/apiConfig.js';

import './AdminInscricoes.css';
import './AdminCommon.css';

const statusOptions = [
  { value: 'novo', label: 'Novo', color: '#f39c12' },
  { value: 'em_analise', label: 'Em Análise', color: '#3498db' },
  { value: 'reuniao_agendada', label: 'Reunião Agendada', color: '#9b59b6' },
  { value: 'fechado', label: 'Parceria Fechada', color: '#27ae60' },
  { value: 'recusado', label: 'Recusado', color: '#e74c3c' },
];

const tipoLabels = {
  tecnologia: 'Parceria Tecnológica',
  investimento: 'Investimento',
  patrocinio: 'Patrocínio',
  squads: 'Contratação de Squads',
  mentoria_corporativa: 'Mentoria Corporativa',
  estagio: 'Programa de Estágio',
  outro: 'Outro',
};

const tipoOptions = Object.entries(tipoLabels).map(([value, label]) => ({ value, label }));

const AdminParcerias = () => {
  const [parcerias, setParcerias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [toast, setToast] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 25 });

  const fetchParcerias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.append('status', filtroStatus);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', String(page));
      params.append('limit', '25');

      const data = await apiRequest(`/api/parcerias?${params.toString()}`, { method: 'GET' });
      const arr = Array.isArray(data) ? data : (data?.data || []);
      setParcerias(arr);
      if (data?.meta) {
        setMeta(data.meta);
      } else {
        setMeta({ total: arr.length, page, limit: 25 });
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      setParcerias([]);
    } finally {
      setLoading(false);
    }
  }, [filtroStatus, searchTerm, page]);

  useEffect(() => {
    fetchParcerias();
  }, [fetchParcerias]);

  // Auto-dismiss do toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const updateStatus = async (id, novoStatus) => {
    const allowed = statusOptions.map(o => o.value);
    if (!allowed.includes(novoStatus)) {
      setToast({ type: 'error', message: 'Status inválido selecionado.' });
      return;
    }

    try {
      setUpdatingId(id);
      await apiRequest(`/api/parcerias/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: novoStatus }) });

      setParcerias(prev =>
        prev.map(p =>
          p.id === id ? { ...p, status: novoStatus } : p
        )
      );
      setToast({ type: 'success', message: 'Status atualizado com sucesso.' });
    } catch (err) {
      setToast({ type: 'error', message: `Erro ao atualizar status: ${err.message}` });
    } finally {
      setUpdatingId(null);
      try { await fetchParcerias(); } catch (e) {
        if (import.meta.env?.DEV) console.warn('Falha ao recarregar parcerias após status:', e);
      }
    }
  };

  const deleteParceria = async (id) => {
    if (!window.confirm('Confirma excluir esta parceria?')) return;
    try {
      await apiRequest(`/api/parcerias/${id}`, { method: 'DELETE' });
      setParcerias(prev => prev.filter(p => p.id !== id));
      setToast({ type: 'success', message: 'Parceria excluída com sucesso.' });
    } catch (err) {
      setToast({ type: 'error', message: `Erro ao excluir parceria: ${err.message}` });
    }
  };

  const filteredParcerias = useMemo(() => {
    return parcerias.filter(parceria => {
      const matchesTipo = !filtroTipo || parceria.tipo === filtroTipo;

      const matchesData = !filtroData || (() => {
        const parceriaDate = new Date(parceria.data || parceria.created_at || parceria.createdAt);
        const today = new Date();
        const diffDays = Math.floor((today - parceriaDate) / (1000 * 60 * 60 * 24));

        switch (filtroData) {
          case 'hoje': return diffDays === 0;
          case 'semana': return diffDays <= 7;
          case 'mes': return diffDays <= 30;
          case 'trimestre': return diffDays <= 90;
          default: return true;
        }
      })();

      return matchesTipo && matchesData;
    });
  }, [parcerias, filtroTipo, filtroData]);

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

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  if (loading) {
    return (
      <div className={"adminContent admin-content"}>
        <div className={"loadingState"}>
          <div className={"spinner"}></div>
          <p>Carregando parcerias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={"adminContent admin-content"}>
        <div className={"errorState"}>
          <h2>Erro ao carregar parcerias</h2>
          <p>{error}</p>
          <button onClick={fetchParcerias} className={"retryBtn"}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={"adminContent admin-content"}>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: toast.type === 'success' ? '#10B981' : '#ef4444'
          }}
        >
          {toast.message}
        </div>
      )}

      <div className={"pageHeader"}>
        <h1 className="title">Parcerias</h1>
        <p className="muted">Gerencie as propostas de parceria recebidas</p>
      </div>

      <div className={"filtersSection filters-section"}>
        <div className={"searchBox"}>
          <input
            type="text"
            placeholder="Buscar por nome, empresa, email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className={"searchInput search-input"}
          />
        </div>

        <div className={"filtersRow"}>
          <div className={"statusFilter"}>
            <select
              value={filtroStatus}
              onChange={(e) => { setFiltroStatus(e.target.value); setPage(1); }}
              className={"statusSelect filter-select"}
            >
              <option value="">Todos os status</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={"areaFilter"}>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className={"areaSelect filter-select"}
            >
              <option value="">Todos os tipos</option>
              {tipoOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={"dateFilter"}>
            <select
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className={"dateSelect filter-select"}
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

      <div className={"stats"}>
        <span className="stat-item">
          Total: {filteredParcerias.length}
          {meta.total > 0 && filteredParcerias.length !== meta.total && ` (de ${meta.total})`}
        </span>
      </div>

      <div className={"inscricoesGrid"}>
        {filteredParcerias.length === 0 ? (
          <div className={"emptyState"}>
            <h3>Nenhuma parceria encontrada</h3>
            <p>
              {searchTerm || filtroStatus || filtroTipo || filtroData
                ? 'Tente ajustar os filtros de busca.'
                : 'Ainda não há propostas de parceria.'}
            </p>
          </div>
        ) : (
          filteredParcerias.map(parceria => {
            const statusInfo = getStatusInfo(parceria.status);

            return (
              <div key={parceria.id} className={"inscricaoCard card"}>
                <div className={"cardHeader"}>
                  <h3>{parceria.nome_contato || parceria.nome || <em style={{ color: '#555' }}>Sem nome</em>}</h3>
                  <div
                    className={"statusBadge"}
                    style={{ backgroundColor: statusInfo.color }}
                  >
                    {statusInfo.label}
                  </div>
                </div>

                <div className={"cardContent"}>
                  <div className={"infoRow"}>
                    <strong>Empresa:</strong>
                    <span style={{ fontWeight: 600, color: '#F5F5F7' }}>
                      {parceria.empresa || <em style={{ color: '#555', fontWeight: 400 }}>Não informado</em>}
                    </span>
                  </div>

                  <div className={"infoRow"}>
                    <strong>Email:</strong>
                    {parceria.email ? (
                      <a href={`mailto:${parceria.email}`}>{parceria.email}</a>
                    ) : (
                      <span><em style={{ color: '#555' }}>Não informado</em></span>
                    )}
                  </div>

                  <div className={"infoRow"}>
                    <strong>Telefone:</strong>
                    <span>{parceria.telefone || <em style={{ color: '#555' }}>Não informado</em>}</span>
                  </div>

                  <div className={"infoRow"}>
                    <strong>Cargo:</strong>
                    <span>{parceria.cargo || <em style={{ color: '#555' }}>Não informado</em>}</span>
                  </div>

                  <div className={"infoRow"}>
                    <strong>Site:</strong>
                    {parceria.site ? (
                      <a href={parceria.site.startsWith('http') ? parceria.site : `https://${parceria.site}`} target="_blank" rel="noopener noreferrer">
                        {parceria.site}
                      </a>
                    ) : (
                      <span><em style={{ color: '#555' }}>Não informado</em></span>
                    )}
                  </div>

                  <div className={"infoRow"}>
                    <strong>Tipo de Parceria:</strong>
                    <span className={"areaTag"}>
                      {tipoLabels[parceria.tipo] || parceria.tipo || 'Não informado'}
                    </span>
                  </div>

                  <div className={"infoRow messageRow"}>
                    <strong>Mensagem:</strong>
                    <p className={"messageText"}>
                      {parceria.mensagem || <em style={{ color: '#555' }}>Sem mensagem</em>}
                    </p>
                  </div>

                  <div className={"infoRow"}>
                    <strong>Data:</strong>
                    <span>{formatDate(parceria.data || parceria.created_at || parceria.createdAt)}</span>
                  </div>
                </div>

                <div className={"cardActions"}>
                  <select
                    value={parceria.status}
                    onChange={(e) => updateStatus(parceria.id, e.target.value)}
                    className={"statusSelectInline"}
                    disabled={updatingId === parceria.id}
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className={"btn btn-danger"}
                    style={{ marginLeft: 8 }}
                    onClick={() => deleteParceria(parceria.id)}
                    aria-label={`Excluir parceria de ${parceria.nome_contato || parceria.nome || 'desconhecido'}`}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '2rem',
          flexWrap: 'wrap'
        }}>
          <button
            className={"btn btn-outline"}
            disabled={page <= 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
          >
            Anterior
          </button>
          <span style={{ color: '#a0a0b0', fontSize: '0.9rem' }}>
            Página {page} de {totalPages}
          </span>
          <button
            className={"btn btn-outline"}
            disabled={page >= totalPages}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminParcerias;
