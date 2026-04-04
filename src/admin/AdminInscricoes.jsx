// src/admin/AdminInscricoes.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest, apiConfig } from '../lib/apiConfig.js';

import './AdminInscricoes.css';
import './AdminCommon.css';

const AdminInscricoes = () => {
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('pendente');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string }
  const [updatingId, setUpdatingId] = useState(null);
  const [crafters, setCrafters] = useState([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const navigate = useNavigate();

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
    // Usa configuração central: em dev, apiConfig.baseURL cai para http://localhost:8080
    if (import.meta.env.DEV && !apiConfig.baseURL) {
      setError("Backend não configurado: defina VITE_API_URL ou inicie o servidor local em 8080.");
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
      const arr = Array.isArray(data) ? data : (data?.data || []);
      setInscricoes(arr);
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
      // Se confirmado, incluir automaticamente na tabela de crafters (se não existir)
      if (novoStatus === 'confirmado') {
        try {
          const atual = (inscricoes || []).find(i => i.id === id);
          const emailNorm = normalizaEmail(atual?.email);
          const jaExiste = !!(emailNorm && craftersPorEmail[emailNorm] && craftersPorEmail[emailNorm].length > 0);
          if (!jaExiste && emailNorm) {
            const payload = {
              nome: String(atual?.nome || '').trim(),
              email: String(atual?.email || '').trim(),
              avatar_url: ''
            };
            await apiRequest('/api/crafters', { method: 'POST', body: JSON.stringify(payload) });
            // Atualiza lista de crafters para refletir criação
            try {
              const data = await apiRequest(`/api/crafters`, { method: 'GET' });
              const arr = Array.isArray(data) ? data : (data?.data || []);
              setCrafters(arr);
            } catch (e) {
              if (import.meta.env?.DEV) console.warn('Ignorando erro ao atualizar lista de crafters:', e);
            }
            setToast({ type: 'success', message: 'Status atualizado e crafter criado com sucesso.' });
          } else {
            setToast({ type: 'success', message: 'Status atualizado. Crafter já existente para este email.' });
          }
        } catch (e) {
          setToast({ type: 'error', message: `Status atualizado, mas falhou ao criar crafter: ${e.message}` });
        }
      } else {
        setToast({ type: 'success', message: 'Status atualizado com sucesso.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: `Erro ao atualizar status: ${err.message}` });
    } finally {
      setUpdatingId(null);
      // Recarrega inscrições do backend para refletir o status real
      try { await fetchInscricoes(); } catch (e) {
        if (import.meta.env?.DEV) console.warn('Falha ao recarregar inscrições após status:', e);
      }
    }
  };

  const deleteInscricao = async (id) => {
    if (!window.confirm('Confirma excluir esta inscrição?')) return;
    try {
      await apiRequest(`/api/inscricoes/${id}`, { method: 'DELETE' });
      setInscricoes(prev => prev.filter(i => i.id !== id));
      setToast({ type: 'success', message: 'Inscrição excluída com sucesso.' });
    } catch (err) {
      setToast({ type: 'error', message: `Erro ao excluir inscrição: ${err.message}` });
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

  // Buscar crafters para auditoria
  useEffect(() => {
    const fetchCrafters = async () => {
      // Usa configuração central: não bloquear em dev se baseURL default existir
      if (import.meta.env.DEV && !apiConfig.baseURL) {
        setCrafters([]);
        return;
      }
      try {
        const data = await apiRequest(`/api/crafters`, { method: 'GET' });
        const arr = Array.isArray(data) ? data : (data?.data || []);
        setCrafters(arr);
      } catch {
        setCrafters([]);
      }
    };
    fetchCrafters();
  }, []);

  // Auditoria Inscrições ↔ Crafters
  const normalizaEmail = (e) => (e || '').trim().toLowerCase();

  const inscricoesPorEmail = useMemo(() => {
    const map = {};
    inscricoes.forEach(i => {
      const email = normalizaEmail(i.email);
      if (!email) return;
      if (!map[email]) map[email] = [];
      map[email].push(i);
    });
    return map;
  }, [inscricoes]);

  const craftersPorEmail = useMemo(() => {
    const map = {};
    crafters.forEach(c => {
      const email = normalizaEmail(c.email);
      if (!email) return;
      if (!map[email]) map[email] = [];
      map[email].push(c);
    });
    return map;
  }, [crafters]);

  const inscricoesSemCrafter = useMemo(() =>
    inscricoes.filter(i => {
      const email = normalizaEmail(i.email);
      return email && !(craftersPorEmail[email] && craftersPorEmail[email].length > 0);
    }),
    [inscricoes, craftersPorEmail]
  );

  const craftersSemInscricao = useMemo(() =>
    crafters.filter(c => {
      const email = normalizaEmail(c.email);
      return email && !(inscricoesPorEmail[email] && inscricoesPorEmail[email].length > 0);
    }),
    [crafters, inscricoesPorEmail]
  );

  const inscricoesDuplicadasEmail = useMemo(() => {
    const dupes = [];
    Object.values(inscricoesPorEmail).forEach((list) => {
      if (list.length > 1) {
        dupes.push(...list);
      }
    });
    return dupes;
  }, [inscricoesPorEmail]);

  const nomesDivergentesMesmoEmail = useMemo(() => {
    const mismatches = [];
    Object.entries(inscricoesPorEmail).forEach(([email, inscList]) => {
      const crafter = (craftersPorEmail[email] || [])[0];
      if (!crafter) return;
      inscList.forEach(i => {
        if ((i.nome || '').trim().toLowerCase() !== (crafter.nome || '').trim().toLowerCase()) {
          mismatches.push({ email, inscricao: i, crafter });
        }
      });
    });
    return mismatches;
  }, [inscricoesPorEmail, craftersPorEmail]);

  const exportAuditCsv = () => {
    const headers = ['categoria','id','nome','email','extra'];
    const rows = [];
    inscricoesSemCrafter.forEach(i => rows.push(['inscricao_sem_crafter', i.id, i.nome || '', i.email || '', i.cidade || '']));
    craftersSemInscricao.forEach(c => rows.push(['crafter_sem_inscricao', c.id, c.nome || '', c.email || '', '']));
    inscricoesDuplicadasEmail.forEach(i => rows.push(['inscricao_duplicada_email', i.id, i.nome || '', i.email || '', '']));
    nomesDivergentesMesmoEmail.forEach(({ email, inscricao, crafter }) => {
      rows.push(['nome_divergente_mesmo_email', `${inscricao?.id || ''}/${crafter?.id || ''}`, `${(inscricao?.nome || '')} vs ${(crafter?.nome || '')}`.trim(), email || '', '']);
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(v => String(v).replace(/\n/g,' ').replace(/"/g,'"')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'auditoria_inscricoes.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const filteredInscricoes = inscricoes.filter(inscricao => {
    // Filtro por status - quando filtroStatus está vazio, mostra tudo exceto confirmados
    const matchesStatus = filtroStatus === '' 
      ? inscricao.status !== 'confirmado'  // Mostra tudo exceto confirmados quando filtro está vazio
      : !filtroStatus || inscricao.status === filtroStatus;
    
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
    
    return matchesStatus && matchesSearch && matchesArea && matchesData;
  });

  const totalPages = Math.ceil(filteredInscricoes.length / ITEMS_PER_PAGE);
  const paginatedInscricoes = filteredInscricoes.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

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
      <div className={"adminContent admin-content"}>
        <div className={"loadingState"}>
          <div className={"spinner"}></div>
          <p>Carregando inscrições...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={"adminContent admin-content"}>
        <div className={"errorState"}>
          <h2>Erro ao carregar inscrições</h2>
          <p>{error}</p>
          <button onClick={fetchInscricoes} className={"retryBtn"}>
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
        <h1 className="title">Inscrições de Crafters</h1>
        <p className="muted">Gerencie as inscrições recebidas através do formulário "Quero ser um Crafter"</p>
      </div>

        <div className={"filtersSection filters-section"}>
        <div className={"searchBox"}>
          <input
            type="text"
            placeholder="Buscar por nome, email, cidade, estado ou área..."
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
            <button
              className={"btn btn-outline"}
              style={{ marginLeft: 8 }}
              onClick={() => setFiltroStatus(prev => prev === '' ? 'pendente' : '')}
              aria-label="Alternar entre pendentes e todos exceto confirmados"
            >
              {filtroStatus === '' ? 'Mostrar pendentes' : 'Mostrar todos (exceto confirmados)'}
            </button>
          </div>

          <div className={"areaFilter"}>
            <select
              value={filtroArea}
              onChange={(e) => { setFiltroArea(e.target.value); setPage(1); }}
              className={"areaSelect filter-select"}
            >
              <option value="">Todas as áreas</option>
              {areasInteresse.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className={"dateFilter"}>
            <select
              value={filtroData}
              onChange={(e) => { setFiltroData(e.target.value); setPage(1); }}
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
          {filteredInscricoes.length} inscrições encontradas
          {totalPages > 1 && ` — Página ${page} de ${totalPages}`}
        </span>
      </div>

      {/* Auditoria Inscrições ↔ Crafters */}
      <div className={"section"}>
        <h2>🔎 Auditoria: Inscrições ↔ Crafters</h2>
        <p className="muted">Verifica sincronização por email entre inscrições e crafters cadastrados.</p>
        <div style={{ margin: '8px 0' }}>
          <button className="btn btn-secondary" onClick={exportAuditCsv}>Exportar CSV das inconsistências</button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Verificação</th>
                <th>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Verificação">Inscrições sem crafter correspondente</td>
                <td data-label="Quantidade">{inscricoesSemCrafter.length}</td>
              </tr>
              <tr>
                <td data-label="Verificação">Crafters sem inscrição correspondente</td>
                <td data-label="Quantidade">{craftersSemInscricao.length}</td>
              </tr>
              <tr>
                <td data-label="Verificação">Inscrições duplicadas por email</td>
                <td data-label="Quantidade">{inscricoesDuplicadasEmail.length}</td>
              </tr>
              <tr>
                <td data-label="Verificação">Nome divergente para o mesmo email</td>
                <td data-label="Quantidade">{nomesDivergentesMesmoEmail.length}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="audit-details-grid" style={{ marginTop: '12px' }}>
          {inscricoesSemCrafter.length > 0 && (
            <div className="audit-card">
              <h4>Inscrições sem Crafter</h4>
              <ul>
                {inscricoesSemCrafter.map(i => (
                  <li key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{i.nome} — {i.email}</span>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => {
                        const params = new URLSearchParams({
                          prefill_nome: i.nome || '',
                          prefill_email: i.email || '',
                          scroll: 'create-crafter'
                        });
                        navigate(`/admin/equipes?${params.toString()}`);
                      }}
                    >
                      Criar Crafter
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {craftersSemInscricao.length > 0 && (
            <div className="audit-card">
              <h4>Crafters sem Inscrição</h4>
              <ul>
                {craftersSemInscricao.map(c => (
                  <li key={c.id}>{c.nome} — {c.email}</li>
                ))}
              </ul>
            </div>
          )}

          {inscricoesDuplicadasEmail.length > 0 && (
            <div className="audit-card">
              <h4>Inscrições Duplicadas (Email)</h4>
              <ul>
                {inscricoesDuplicadasEmail.map(i => (
                  <li key={i.id}>#{i.id} — {i.nome} — {i.email}</li>
                ))}
              </ul>
            </div>
          )}

          {nomesDivergentesMesmoEmail.length > 0 && (
            <div className="audit-card">
              <h4>Nome Divergente (mesmo email)</h4>
              <ul>
                {nomesDivergentesMesmoEmail.map(({ email, inscricao, crafter }, idx) => (
                  <li key={`${email}-${idx}`}>
                    {email}: inscrição "{inscricao.nome}" vs crafter "{crafter.nome}"
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className={"inscricoesGrid"}>
        {filteredInscricoes.length === 0 ? (
          <div className={"emptyState"}>
            <h3>Nenhuma inscrição encontrada</h3>
            <p>
              {searchTerm || filtroStatus || filtroArea || filtroData
                ? 'Tente ajustar os filtros de busca.'
                : 'Ainda não há inscrições de crafters.'}
            </p>
          </div>
        ) : (
          paginatedInscricoes.map(inscricao => {
            const statusInfo = getStatusInfo(inscricao.status);
            
            return (
              <div key={inscricao.id} className={"inscricaoCard card"}>
                <div className={"cardHeader"}>
                  <h3>{inscricao.nome}</h3>
                  <div 
                    className={"statusBadge"}
                    style={{ backgroundColor: statusInfo.color }}
                  >
                    {statusInfo.label}
                  </div>
                </div>

                <div className={"cardContent"}>
                  <div className={"infoRow"}>
                    <strong>Email:</strong>
                    <a href={`mailto:${inscricao.email}`}>{inscricao.email}</a>
                  </div>

                  <div className={"infoRow"}>
                    <strong>Telefone:</strong>
                    <span>{inscricao.telefone || <em style={{ color: '#555' }}>Nao informado</em>}</span>
                  </div>

                  <div className={"infoRow"}>
                    <strong>Rede Social:</strong>
                    {inscricao.rede_social ? (
                      <a href={inscricao.rede_social.startsWith('http') ? inscricao.rede_social : `https://${inscricao.rede_social}`} target="_blank" rel="noopener noreferrer">
                        {inscricao.rede_social}
                      </a>
                    ) : (
                      <span><em style={{ color: '#555' }}>Nao informado</em></span>
                    )}
                  </div>

                  <div className={"infoRow"}>
                    <strong>Localização:</strong>
                    <span>
                      {inscricao.cidade || inscricao.estado
                        ? [inscricao.cidade, inscricao.estado].filter(Boolean).join(', ')
                        : <em style={{ color: '#555' }}>Nao informado</em>}
                      {inscricao.cep && ` — CEP: ${inscricao.cep}`}
                    </span>
                  </div>

                  <div className={"infoRow"}>
                    <strong>Área de Interesse:</strong>
                    {inscricao.area_interesse
                      ? <span className={"areaTag"}>{inscricao.area_interesse}</span>
                      : <span><em style={{ color: '#555' }}>Nao informado</em></span>}
                  </div>

                  <div className={"infoRow messageRow"}>
                    <strong>Mensagem:</strong>
                    <p className={"messageText"}>
                      {inscricao.mensagem || <em style={{ color: '#555' }}>Sem mensagem</em>}
                    </p>
                  </div>

                  <div className={"infoRow"}>
                    <strong>Data da Inscrição:</strong>
                    <span>{formatDate(inscricao.data_inscricao || inscricao.created_at || inscricao.createdAt || inscricao.dataInscricao)}</span>
                  </div>
                </div>

                <div className={"cardActions"}>
                  <select
                    value={inscricao.status}
                    onChange={(e) => updateStatus(inscricao.id, e.target.value)}
                    className={"statusSelectInline"}
                    disabled={updatingId === inscricao.id}
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
                    onClick={() => deleteInscricao(inscricao.id)}
                    aria-label={`Excluir inscrição de ${inscricao.nome}`}
                  >
                    Excluir inscrição
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '24px 0' }}>
          <button
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span style={{ color: '#a0a0b0', fontSize: '0.85rem', padding: '0 12px' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-outline"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminInscricoes;