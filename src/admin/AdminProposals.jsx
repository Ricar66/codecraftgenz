// src/admin/AdminProposals.jsx
// Gestão de Propostas B2B (CRM) - DADOS REAIS

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  FaBriefcase, FaEye, FaTimes, FaCheck, FaArchive, FaSearch,
  FaFilter, FaPlus, FaSync, FaExclamationTriangle, FaTrash
} from 'react-icons/fa';

import AdminCard from './components/AdminCard';
import AdminTable from './components/AdminTable';
import StatusBadge from './components/StatusBadge';
import {
  listProposals,
  getProposalStats,
  updateProposalStatus,
  createProposal,
  deleteProposal
} from '../services/proposalAPI';
import styles from './AdminProposals.module.css';

// Configuração de status
const proposalStatusConfig = {
  new: { label: 'Novo', variant: 'info' },
  contacted: { label: 'Contatado', variant: 'warning' },
  negotiating: { label: 'Negociando', variant: 'purple' },
  approved: { label: 'Aprovado', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'danger' },
};

// Configuração de orçamentos
const budgetRangeConfig = {
  under5k: 'Até R$ 5.000',
  '5k-15k': 'R$ 5.000 - R$ 15.000',
  '15k-50k': 'R$ 15.000 - R$ 50.000',
  '50k-100k': 'R$ 50.000 - R$ 100.000',
  above100k: 'Acima de R$ 100.000',
  undefined: 'A definir',
};

// Configuração de tipos de projeto
const projectTypeConfig = {
  web: { label: 'Aplicação Web' },
  mobile: { label: 'App Mobile' },
  desktop: { label: 'Software Desktop' },
  api: { label: 'API/Backend' },
  fullstack: { label: 'Solução Completa' },
  custom: { label: 'Customizado' },
};

/**
 * Página de Gestão de Propostas B2B - Dados Reais
 */
const AdminProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, negotiating: 0, pipelineTotal: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [toast, setToast] = useState(null);

  // Estado do formulário de criação
  const [createForm, setCreateForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    projectType: 'custom',
    budgetRange: '',
    description: '',
  });

  // Carregar propostas
  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listProposals({
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setProposals(result.proposals || []);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 0,
      }));
    } catch (err) {
      console.error('Erro ao carregar propostas:', err);
      setError(err.message || 'Erro ao carregar propostas');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, pagination.page, pagination.limit]);

  // Carregar estatísticas
  const fetchStats = useCallback(async () => {
    try {
      const result = await getProposalStats();
      setStats({
        total: result.total || 0,
        new: result.byStatus?.new || 0,
        contacted: result.byStatus?.contacted || 0,
        negotiating: result.byStatus?.negotiating || 0,
        approved: result.byStatus?.approved || 0,
        conversionRate: result.conversionRate || '0',
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
    fetchStats();
  }, [fetchProposals, fetchStats]);

  // Filtrar localmente por tipo (se necessário)
  const filteredProposals = useMemo(() => {
    if (!typeFilter) return proposals;
    return proposals.filter(p => p.projectType === typeFilter);
  }, [proposals, typeFilter]);

  // Mostrar toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Abrir modal de detalhes
  const handleViewDetails = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setIsModalOpen(true);
  }, []);

  // Fechar modais
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedProposal(null);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setCreateForm({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      projectType: 'custom',
      budgetRange: '',
      description: '',
    });
  }, []);

  // Atualizar status
  const handleStatusChange = useCallback(async (proposalId, newStatus) => {
    try {
      await updateProposalStatus(proposalId, newStatus);
      setProposals(prev => prev.map(p =>
        p.id === proposalId ? { ...p, status: newStatus, updatedAt: new Date().toISOString() } : p
      ));
      if (selectedProposal?.id === proposalId) {
        setSelectedProposal(prev => prev ? { ...prev, status: newStatus } : null);
      }
      showToast('Status atualizado com sucesso');
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar status', 'error');
    }
  }, [selectedProposal, fetchStats]);

  // Criar proposta
  const handleCreateProposal = useCallback(async (e) => {
    e.preventDefault();
    if (!createForm.companyName.trim() || !createForm.contactName.trim() || !createForm.email.trim()) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }
    try {
      await createProposal(createForm);
      showToast('Proposta criada com sucesso');
      handleCloseCreateModal();
      fetchProposals();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Erro ao criar proposta', 'error');
    }
  }, [createForm, fetchProposals, fetchStats, handleCloseCreateModal]);

  // Excluir proposta
  const handleDeleteProposal = useCallback(async (proposalId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta proposta?')) return;
    try {
      await deleteProposal(proposalId);
      showToast('Proposta excluída com sucesso');
      handleCloseModal();
      fetchProposals();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Erro ao excluir proposta', 'error');
    }
  }, [fetchProposals, fetchStats, handleCloseModal]);

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
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
      key: 'companyName',
      label: 'Empresa',
      render: (val, row) => (
        <div className={styles.empresaCell}>
          <strong>{val || '—'}</strong>
          <span className={styles.contatoInfo}>{row.contactName || ''}</span>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (val) => (
        <a href={`mailto:${val}`} className={styles.emailLink}>{val || '—'}</a>
      )
    },
    {
      key: 'projectType',
      label: 'Tipo',
      render: (val) => projectTypeConfig[val]?.label || val || '—'
    },
    {
      key: 'budgetRange',
      label: 'Orçamento',
      render: (val) => <span className={styles.orcamento}>{budgetRangeConfig[val] || val || '—'}</span>
    },
    {
      key: 'createdAt',
      label: 'Data',
      render: (val) => formatDate(val)
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        const config = proposalStatusConfig[val];
        return (
          <StatusBadge variant={config?.variant || 'neutral'} dot pulse={val === 'new'}>
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

  // Loading state
  if (loading && proposals.length === 0) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <span>Carregando propostas...</span>
      </div>
    );
  }

  // Error state
  if (error && proposals.length === 0) {
    return (
      <div className={styles.errorState}>
        <FaExclamationTriangle size={48} />
        <h2>Erro ao carregar propostas</h2>
        <p>{error}</p>
        <button onClick={fetchProposals} className={styles.retryBtn}>
          <FaSync /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast${toast.type === 'error' ? 'Error' : 'Success'}`]}`}>
          {toast.type === 'error' ? <FaExclamationTriangle /> : <FaCheck />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <FaBriefcase className={styles.headerIcon} />
          <div>
            <h1>Gestão de Propostas B2B</h1>
            <p>Gerencie as solicitações de orçamento recebidas</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={fetchProposals}
            className={styles.refreshBtn}
            disabled={loading}
            title="Atualizar"
          >
            <FaSync className={loading ? styles.spinning : ''} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className={styles.createBtn}
          >
            <FaPlus /> Nova Proposta
          </button>
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
            <span className={styles.statValue}>{stats.new}</span>
            <span className={styles.statLabel}>Novas</span>
          </div>
        </AdminCard>
        <AdminCard variant="elevated" className={`${styles.statCard} ${styles.statAnalise}`}>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.negotiating}</span>
            <span className={styles.statLabel}>Negociando</span>
          </div>
        </AdminCard>
        <AdminCard variant="elevated" className={`${styles.statCard} ${styles.statPipeline}`}>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.conversionRate}%</span>
            <span className={styles.statLabel}>Taxa de Conversão</span>
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
            <option value="new">Novo</option>
            <option value="contacted">Contatado</option>
            <option value="negotiating">Negociando</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
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
            <option value="custom">Customizado</option>
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page <= 1}
            className={styles.pageBtn}
          >
            Anterior
          </button>
          <span>Página {pagination.page} de {pagination.totalPages}</span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages}
            className={styles.pageBtn}
          >
            Próxima
          </button>
        </div>
      )}

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
                  <span>{selectedProposal.companyName}</span>
                </div>
                <div className={styles.modalField}>
                  <label>Contato</label>
                  <span>{selectedProposal.contactName}</span>
                </div>
                <div className={styles.modalField}>
                  <label>Email</label>
                  <a href={`mailto:${selectedProposal.email}`}>{selectedProposal.email}</a>
                </div>
                <div className={styles.modalField}>
                  <label>Telefone</label>
                  <span>{selectedProposal.phone || '—'}</span>
                </div>
                <div className={styles.modalField}>
                  <label>Tipo de Projeto</label>
                  <span>{projectTypeConfig[selectedProposal.projectType]?.label || selectedProposal.projectType}</span>
                </div>
                <div className={styles.modalField}>
                  <label>Orçamento Estimado</label>
                  <span className={styles.orcamentoDestaque}>{budgetRangeConfig[selectedProposal.budgetRange] || selectedProposal.budgetRange || '—'}</span>
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
                  <span>{formatDate(selectedProposal.createdAt)}</span>
                </div>
              </div>

              <div className={styles.descricaoSection}>
                <label>Descrição do Projeto</label>
                <p className={styles.descricaoTexto}>{selectedProposal.description || 'Sem descrição'}</p>
              </div>

              {selectedProposal.notes && (
                <div className={styles.descricaoSection}>
                  <label>Notas Internas</label>
                  <p className={styles.descricaoTexto}>{selectedProposal.notes}</p>
                </div>
              )}
            </div>

            <footer className={styles.modalFooter}>
              <div className={styles.footerLeft}>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteProposal(selectedProposal.id)}
                >
                  <FaTrash /> Excluir
                </button>
              </div>
              <div className={styles.statusButtons}>
                <span className={styles.footerLabel}>Alterar Status:</span>
                <button
                  className={`${styles.statusBtn} ${styles.statusNovo}`}
                  onClick={() => handleStatusChange(selectedProposal.id, 'new')}
                  disabled={selectedProposal.status === 'new'}
                >
                  Novo
                </button>
                <button
                  className={`${styles.statusBtn} ${styles.statusContacted}`}
                  onClick={() => handleStatusChange(selectedProposal.id, 'contacted')}
                  disabled={selectedProposal.status === 'contacted'}
                >
                  Contatado
                </button>
                <button
                  className={`${styles.statusBtn} ${styles.statusNegotiating}`}
                  onClick={() => handleStatusChange(selectedProposal.id, 'negotiating')}
                  disabled={selectedProposal.status === 'negotiating'}
                >
                  Negociando
                </button>
                <button
                  className={`${styles.statusBtn} ${styles.statusApproved}`}
                  onClick={() => handleStatusChange(selectedProposal.id, 'approved')}
                  disabled={selectedProposal.status === 'approved'}
                >
                  <FaCheck /> Aprovado
                </button>
                <button
                  className={`${styles.statusBtn} ${styles.statusRejected}`}
                  onClick={() => handleStatusChange(selectedProposal.id, 'rejected')}
                  disabled={selectedProposal.status === 'rejected'}
                >
                  <FaArchive /> Rejeitado
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Modal de Criação */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseCreateModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h2>Nova Proposta B2B</h2>
              <button className={styles.modalClose} onClick={handleCloseCreateModal}>
                <FaTimes />
              </button>
            </header>

            <form onSubmit={handleCreateProposal} className={styles.modalBody}>
              <div className={styles.modalGrid}>
                <div className={styles.formGroup}>
                  <label>Empresa *</label>
                  <input
                    type="text"
                    value={createForm.companyName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, companyName: e.target.value }))}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Contato *</label>
                  <input
                    type="text"
                    value={createForm.contactName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, contactName: e.target.value }))}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Email *</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Telefone</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Tipo de Projeto</label>
                  <select
                    value={createForm.projectType}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, projectType: e.target.value }))}
                    className={styles.select}
                  >
                    <option value="web">Aplicação Web</option>
                    <option value="mobile">App Mobile</option>
                    <option value="desktop">Software Desktop</option>
                    <option value="api">API/Backend</option>
                    <option value="fullstack">Solução Completa</option>
                    <option value="custom">Customizado</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Orçamento Estimado</label>
                  <input
                    type="text"
                    value={createForm.budgetRange}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, budgetRange: e.target.value }))}
                    className={styles.input}
                    placeholder="Ex: R$ 5.000 - R$ 10.000"
                  />
                </div>
              </div>

              <div className={styles.formGroupFull}>
                <label>Descrição do Projeto</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className={styles.textarea}
                  rows={4}
                  placeholder="Descreva os detalhes do projeto..."
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={handleCloseCreateModal} className={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submitBtn}>
                  <FaPlus /> Criar Proposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProposals;
