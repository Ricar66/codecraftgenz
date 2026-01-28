// src/admin/AdminProposals.jsx
// Gestão de Propostas B2B (CRM)

import React, { useState, useCallback, useMemo } from 'react';
import { FaBriefcase, FaEye, FaTimes, FaCheck, FaArchive, FaSearch, FaFilter } from 'react-icons/fa';

import AdminCard from './components/AdminCard';
import AdminTable from './components/AdminTable';
import StatusBadge from './components/StatusBadge';
import { mockProposals, proposalStatusConfig, projectTypeConfig } from './data/mockDashboardData';
import styles from './AdminProposals.module.css';

/**
 * Página de Gestão de Propostas B2B
 */
const AdminProposals = () => {
  const [proposals, setProposals] = useState(mockProposals);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar propostas
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchStatus = !statusFilter || p.status === statusFilter;
      const matchType = !typeFilter || p.tipoProjeto === typeFilter;
      const matchSearch = !searchTerm ||
        p.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contato.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchType && matchSearch;
    });
  }, [proposals, statusFilter, typeFilter, searchTerm]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: proposals.length,
    novos: proposals.filter(p => p.status === 'novo').length,
    emAnalise: proposals.filter(p => p.status === 'em_analise').length,
    respondidos: proposals.filter(p => p.status === 'respondido').length,
    pipelineTotal: proposals
      .filter(p => p.status !== 'arquivado')
      .reduce((sum, p) => sum + (p.orcamentoValor || 0), 0),
  }), [proposals]);

  // Abrir modal de detalhes
  const handleViewDetails = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setIsModalOpen(true);
  }, []);

  // Fechar modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedProposal(null);
  }, []);

  // Atualizar status
  const handleStatusChange = useCallback((proposalId, newStatus) => {
    setProposals(prev => prev.map(p =>
      p.id === proposalId
        ? { ...p, status: newStatus, dataAtualizacao: new Date().toISOString() }
        : p
    ));
    if (selectedProposal?.id === proposalId) {
      setSelectedProposal(prev => prev ? { ...prev, status: newStatus } : null);
    }
  }, [selectedProposal]);

  // Formatar data
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Colunas da tabela
  const columns = [
    {
      key: 'empresa',
      label: 'Empresa',
      render: (val, row) => (
        <div className={styles.empresaCell}>
          <strong>{val}</strong>
          <span className={styles.contatoInfo}>{row.contato}</span>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (val) => (
        <a href={`mailto:${val}`} className={styles.emailLink}>{val}</a>
      )
    },
    {
      key: 'tipoProjeto',
      label: 'Tipo',
      render: (val) => projectTypeConfig[val]?.label || val
    },
    {
      key: 'orcamentoLabel',
      label: 'Orçamento',
      render: (val) => <span className={styles.orcamento}>{val}</span>
    },
    {
      key: 'dataCriacao',
      label: 'Data',
      render: (val) => formatDate(val)
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        const config = proposalStatusConfig[val];
        return (
          <StatusBadge variant={config?.variant || 'neutral'} dot pulse={val === 'novo'}>
            {config?.label || val}
          </StatusBadge>
        );
      }
    },
    {
      key: 'actions',
      label: 'Ações',
      align: 'center',
      render: (_, row) => (
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            onClick={(e) => { e.stopPropagation(); handleViewDetails(row); }}
            title="Ver detalhes"
          >
            <FaEye />
          </button>
        </div>
      )
    },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <FaBriefcase className={styles.headerIcon} />
          <div>
            <h1>Gestão de Propostas B2B</h1>
            <p>Gerencie as solicitações de orçamento recebidas</p>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <section className={styles.statsGrid}>
        <AdminCard variant="elevated" className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Total de Propostas</span>
          </div>
        </AdminCard>
        <AdminCard variant="elevated" className={`${styles.statCard} ${styles.statNovo}`}>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.novos}</span>
            <span className={styles.statLabel}>Novas</span>
          </div>
        </AdminCard>
        <AdminCard variant="elevated" className={`${styles.statCard} ${styles.statAnalise}`}>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.emAnalise}</span>
            <span className={styles.statLabel}>Em Análise</span>
          </div>
        </AdminCard>
        <AdminCard variant="elevated" className={`${styles.statCard} ${styles.statPipeline}`}>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              R$ {stats.pipelineTotal.toLocaleString('pt-BR')}
            </span>
            <span className={styles.statLabel}>Pipeline Total</span>
          </div>
        </AdminCard>
      </section>

      {/* Filters */}
      <section className={styles.filters}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar empresa, contato ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <FaFilter className={styles.filterIcon} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Todos os Status</option>
            <option value="novo">Novo</option>
            <option value="em_analise">Em Análise</option>
            <option value="respondido">Respondido</option>
            <option value="arquivado">Arquivado</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Todos os Tipos</option>
            <option value="web">Aplicação Web</option>
            <option value="mobile">App Mobile</option>
            <option value="desktop">Software Desktop</option>
            <option value="api">API/Backend</option>
            <option value="fullstack">Solução Completa</option>
          </select>
        </div>
      </section>

      {/* Table */}
      <AdminCard variant="outlined" padding="sm">
        <AdminTable
          columns={columns}
          data={filteredProposals}
          onRowClick={handleViewDetails}
          emptyMessage="Nenhuma proposta encontrada"
          hoverable
        />
      </AdminCard>

      {/* Modal de Detalhes */}
      {isModalOpen && selectedProposal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h2>Detalhes da Proposta</h2>
              <button className={styles.modalClose} onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </header>

            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                <div className={styles.modalField}>
                  <label>Empresa</label>
                  <span>{selectedProposal.empresa}</span>
                </div>
                <div className={styles.modalField}>
                  <label>Contato</label>
                  <span>{selectedProposal.contato}</span>
                </div>
                <div className={styles.modalField}>
                  <label>Email</label>
                  <a href={`mailto:${selectedProposal.email}`}>{selectedProposal.email}</a>
                </div>
                <div className={styles.modalField}>
                  <label>Tipo de Projeto</label>
                  <span>{selectedProposal.tipoProjetoLabel}</span>
                </div>
                <div className={styles.modalField}>
                  <label>Orçamento Estimado</label>
                  <span className={styles.orcamentoDestaque}>{selectedProposal.orcamentoLabel}</span>
                </div>
                <div className={styles.modalField}>
                  <label>Status Atual</label>
                  <StatusBadge
                    variant={proposalStatusConfig[selectedProposal.status]?.variant}
                    dot
                  >
                    {proposalStatusConfig[selectedProposal.status]?.label}
                  </StatusBadge>
                </div>
                <div className={styles.modalField}>
                  <label>Data de Criação</label>
                  <span>{formatDate(selectedProposal.dataCriacao)}</span>
                </div>
                <div className={styles.modalField}>
                  <label>Última Atualização</label>
                  <span>{formatDate(selectedProposal.dataAtualizacao)}</span>
                </div>
              </div>

              <div className={styles.descricaoSection}>
                <label>Descrição do Projeto</label>
                <p className={styles.descricaoTexto}>{selectedProposal.descricao}</p>
              </div>
            </div>

            <footer className={styles.modalFooter}>
              <span className={styles.footerLabel}>Alterar Status:</span>
              <div className={styles.statusButtons}>
                <button
                  className={`${styles.statusBtn} ${styles.statusNovo}`}
                  onClick={() => handleStatusChange(selectedProposal.id, 'novo')}
                  disabled={selectedProposal.status === 'novo'}
                >
                  Novo
                </button>
                <button
                  className={`${styles.statusBtn} ${styles.statusAnalise}`}
                  onClick={() => handleStatusChange(selectedProposal.id, 'em_analise')}
                  disabled={selectedProposal.status === 'em_analise'}
                >
                  Em Análise
                </button>
                <button
                  className={`${styles.statusBtn} ${styles.statusRespondido}`}
                  onClick={() => handleStatusChange(selectedProposal.id, 'respondido')}
                  disabled={selectedProposal.status === 'respondido'}
                >
                  <FaCheck /> Respondido
                </button>
                <button
                  className={`${styles.statusBtn} ${styles.statusArquivado}`}
                  onClick={() => handleStatusChange(selectedProposal.id, 'arquivado')}
                  disabled={selectedProposal.status === 'arquivado'}
                >
                  <FaArchive /> Arquivar
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProposals;
