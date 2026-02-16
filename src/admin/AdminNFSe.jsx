// src/admin/AdminNFSe.jsx
// Gestao de NFS-e (Nota Fiscal de Servico Eletronica)

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  FaFileInvoiceDollar, FaEye, FaPaperPlane, FaSearch,
  FaSync, FaTimes, FaCheck, FaCode, FaFilter
} from 'react-icons/fa';

import AdminCard from './components/AdminCard';
import AdminTable from './components/AdminTable';
import StatusBadge from './components/StatusBadge';
import {
  listInvoices,
  getInvoiceById,
  enviarInvoice,
  consultarInvoice,
  cancelarInvoice,
  getInvoiceXml,
} from '../services/nfseAPI';
import styles from './AdminNFSe.module.css';

// Configuracao de status
const statusConfig = {
  pending: { label: 'Pendente', variant: 'warning' },
  submitted: { label: 'Enviada', variant: 'info' },
  approved: { label: 'Aprovada', variant: 'success' },
  rejected: { label: 'Rejeitada', variant: 'error' },
  cancelled: { label: 'Cancelada', variant: 'neutral' },
  error: { label: 'Erro', variant: 'error' },
};

const AdminNFSe = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [xmlData, setXmlData] = useState(null);
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [toast, setToast] = useState(null);

  // Carregar invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listInvoices({
        status: statusFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      const data = result?.data || result;
      setInvoices(data?.data || data?.items || []);
      const meta = data?.meta || {};
      setPagination(prev => ({
        ...prev,
        total: meta.total || 0,
        totalPages: meta.totalPages || 0,
      }));
    } catch (err) {
      console.error('Erro ao carregar NFS-e:', err);
      setError(err.message || 'Erro ao carregar notas fiscais');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Abrir detalhes
  const handleViewDetails = useCallback(async (invoice) => {
    try {
      const result = await getInvoiceById(invoice.id);
      const data = result?.data?.data || result?.data || result;
      setSelectedInvoice(data);
      setIsModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Erro ao carregar detalhes', 'error');
    }
  }, []);

  // Fechar modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  }, []);

  // Enviar para prefeitura
  const handleEnviar = useCallback(async (invoiceId) => {
    if (!window.confirm('Enviar esta NFS-e para a prefeitura?')) return;
    setActionLoading(invoiceId);
    try {
      await enviarInvoice(invoiceId);
      showToast('NFS-e enviada para prefeitura com sucesso');
      fetchInvoices();
      if (selectedInvoice?.id === invoiceId) handleCloseModal();
    } catch (err) {
      showToast(err.message || 'Erro ao enviar NFS-e', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [fetchInvoices, selectedInvoice, handleCloseModal]);

  // Consultar status na prefeitura
  const handleConsultar = useCallback(async (invoiceId) => {
    setActionLoading(invoiceId);
    try {
      await consultarInvoice(invoiceId);
      showToast('Status atualizado com sucesso');
      fetchInvoices();
      if (selectedInvoice?.id === invoiceId) handleCloseModal();
    } catch (err) {
      showToast(err.message || 'Erro ao consultar status', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [fetchInvoices, selectedInvoice, handleCloseModal]);

  // Cancelar NFS-e
  const handleCancelar = useCallback(async (invoiceId) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta NFS-e?')) return;
    setActionLoading(invoiceId);
    try {
      await cancelarInvoice(invoiceId);
      showToast('NFS-e cancelada com sucesso');
      fetchInvoices();
      if (selectedInvoice?.id === invoiceId) handleCloseModal();
    } catch (err) {
      showToast(err.message || 'Erro ao cancelar NFS-e', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [fetchInvoices, selectedInvoice, handleCloseModal]);

  // Ver XML
  const handleVerXml = useCallback(async (invoiceId) => {
    try {
      const result = await getInvoiceXml(invoiceId);
      const data = result?.data?.data || result?.data || result;
      setXmlData(data);
      setIsXmlModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Erro ao carregar XML', 'error');
    }
  }, []);

  // Filtro local por busca
  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    const term = searchTerm.toLowerCase();
    return invoices.filter(inv =>
      (inv.venda_id || '').toLowerCase().includes(term) ||
      (inv.nfse_numero || '').toLowerCase().includes(term) ||
      (inv.tomador?.documento || '').includes(term) ||
      (inv.tomador?.razao_social || '').toLowerCase().includes(term) ||
      (inv.tomador?.email || '').toLowerCase().includes(term)
    );
  }, [invoices, searchTerm]);

  // Contadores por status
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, submitted: 0, approved: 0, rejected: 0, cancelled: 0, error: 0, total: invoices.length };
    invoices.forEach(inv => {
      if (counts[inv.status] !== undefined) counts[inv.status]++;
    });
    return counts;
  }, [invoices]);

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Formatar valor
  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '\u2014';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Colunas da tabela
  const columns = [
    {
      key: 'venda_id',
      label: 'Venda',
      render: (val) => (
        <span className={styles.vendaId}>{val || '\u2014'}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        const cfg = statusConfig[val] || { label: val, variant: 'neutral' };
        return <StatusBadge variant={cfg.variant}>{cfg.label}</StatusBadge>;
      }
    },
    {
      key: 'tomador',
      label: 'Tomador',
      render: (_, row) => (
        <div className={styles.tomadorCell}>
          <strong>{row.tomador?.razao_social || row.tomador?.documento || '\u2014'}</strong>
          {row.tomador?.email && <span className={styles.tomadorEmail}>{row.tomador.email}</span>}
        </div>
      )
    },
    {
      key: 'servico',
      label: 'Valor',
      render: (_, row) => formatCurrency(row.servico?.valor_servicos)
    },
    {
      key: 'nfse_numero',
      label: 'NFS-e',
      render: (val) => val || '\u2014'
    },
    {
      key: 'data_emissao',
      label: 'Emissao',
      render: (val) => formatDate(val)
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (_, row) => (
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            onClick={(e) => { e.stopPropagation(); handleViewDetails(row); }}
            title="Ver detalhes"
          >
            <FaEye />
          </button>
          {row.status === 'pending' && (
            <button
              className={`${styles.actionBtn} ${styles.actionSend}`}
              onClick={(e) => { e.stopPropagation(); handleEnviar(row.id); }}
              disabled={actionLoading === row.id}
              title="Enviar para prefeitura"
            >
              <FaPaperPlane />
            </button>
          )}
          {row.status === 'submitted' && (
            <button
              className={`${styles.actionBtn} ${styles.actionConsult}`}
              onClick={(e) => { e.stopPropagation(); handleConsultar(row.id); }}
              disabled={actionLoading === row.id}
              title="Consultar status"
            >
              <FaSync />
            </button>
          )}
          {row.status === 'error' && (
            <button
              className={`${styles.actionBtn} ${styles.actionSend}`}
              onClick={(e) => { e.stopPropagation(); handleEnviar(row.id); }}
              disabled={actionLoading === row.id}
              title="Reenviar"
            >
              <FaPaperPlane />
            </button>
          )}
        </div>
      )
    },
  ];

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type] || ''}`}>
          {toast.type === 'error' ? <FaTimes /> : <FaCheck />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.headerIcon}><FaFileInvoiceDollar /></div>
          <div>
            <h1>Notas Fiscais (NFS-e)</h1>
            <p>Gestao de notas fiscais de servico eletronica</p>
          </div>
        </div>
        <button className={styles.btnRefresh} onClick={fetchInvoices} disabled={loading}>
          <FaSync className={loading ? styles.spinning : ''} /> Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <AdminCard variant="outlined" className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={`${styles.statValue} ${styles.statTotal}`}>{statusCounts.total}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
        </AdminCard>
        <AdminCard variant="outlined" className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={`${styles.statValue} ${styles.statPending}`}>{statusCounts.pending}</span>
            <span className={styles.statLabel}>Pendentes</span>
          </div>
        </AdminCard>
        <AdminCard variant="outlined" className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={`${styles.statValue} ${styles.statApproved}`}>{statusCounts.approved}</span>
            <span className={styles.statLabel}>Aprovadas</span>
          </div>
        </AdminCard>
        <AdminCard variant="outlined" className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={`${styles.statValue} ${styles.statError}`}>{statusCounts.error + statusCounts.rejected}</span>
            <span className={styles.statLabel}>Erros</span>
          </div>
        </AdminCard>
      </div>

      {/* Filters */}
      <AdminCard variant="outlined" className={styles.filtersCard}>
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por venda, documento, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <FaFilter className={styles.filterIcon} />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className={styles.filterSelect}
            >
              <option value="">Todos os status</option>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </div>
      </AdminCard>

      {/* Error */}
      {error && (
        <div className={styles.errorBox}>
          <FaTimes /> {error}
          <button onClick={fetchInvoices} className={styles.retryBtn}>Tentar novamente</button>
        </div>
      )}

      {/* Table */}
      <AdminCard variant="outlined">
        <AdminTable
          columns={columns}
          data={filteredInvoices}
          loading={loading}
          hoverable
          onRowClick={handleViewDetails}
          emptyMessage="Nenhuma nota fiscal encontrada"
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              className={styles.pageBtn}
            >
              Anterior
            </button>
            <span className={styles.pageInfo}>
              Pagina {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              className={styles.pageBtn}
            >
              Proxima
            </button>
          </div>
        )}
      </AdminCard>

      {/* Modal Detalhes */}
      {isModalOpen && selectedInvoice && (
        <div className={styles.overlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Detalhes da NFS-e</h2>
              <button onClick={handleCloseModal} className={styles.closeBtn}><FaTimes /></button>
            </div>

            <div className={styles.modalBody}>
              {/* Status e ID */}
              <div className={styles.detailRow}>
                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>Status</span>
                  <StatusBadge variant={statusConfig[selectedInvoice.status]?.variant || 'neutral'}>
                    {statusConfig[selectedInvoice.status]?.label || selectedInvoice.status}
                  </StatusBadge>
                </div>
                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>ID</span>
                  <span className={styles.detailValue}>{selectedInvoice.id}</span>
                </div>
              </div>

              {/* Dados da venda */}
              <div className={styles.detailSection}>
                <h3>Venda</h3>
                <div className={styles.detailRow}>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Venda ID</span>
                    <span className={styles.detailValue}>{selectedInvoice.venda_id || '\u2014'}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Data Emissao</span>
                    <span className={styles.detailValue}>{formatDate(selectedInvoice.data_emissao)}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Valor</span>
                    <span className={styles.detailValue}>{formatCurrency(selectedInvoice.servico?.valor_servicos)}</span>
                  </div>
                </div>
              </div>

              {/* Tomador */}
              <div className={styles.detailSection}>
                <h3>Tomador</h3>
                <div className={styles.detailRow}>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Tipo</span>
                    <span className={styles.detailValue}>{selectedInvoice.tomador?.tipo || '\u2014'}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Documento</span>
                    <span className={styles.detailValue}>{selectedInvoice.tomador?.documento || '\u2014'}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Razao Social</span>
                    <span className={styles.detailValue}>{selectedInvoice.tomador?.razao_social || '\u2014'}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Email</span>
                    <span className={styles.detailValue}>{selectedInvoice.tomador?.email || '\u2014'}</span>
                  </div>
                </div>
              </div>

              {/* Servico */}
              <div className={styles.detailSection}>
                <h3>Servico</h3>
                <div className={styles.detailRow}>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Descricao</span>
                    <span className={styles.detailValue}>{selectedInvoice.servico?.descricao || '\u2014'}</span>
                  </div>
                </div>
                <div className={styles.detailRow}>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>ISS Retido</span>
                    <span className={styles.detailValue}>{selectedInvoice.servico?.iss_retido ? 'Sim' : 'Nao'}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Aliquota ISS</span>
                    <span className={styles.detailValue}>{selectedInvoice.servico?.aliquota_iss ? `${selectedInvoice.servico.aliquota_iss}%` : '\u2014'}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Valor ISS</span>
                    <span className={styles.detailValue}>{formatCurrency(selectedInvoice.servico?.valor_iss)}</span>
                  </div>
                </div>
              </div>

              {/* NFS-e / Protocolo */}
              <div className={styles.detailSection}>
                <h3>Prefeitura</h3>
                <div className={styles.detailRow}>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>NFS-e Numero</span>
                    <span className={styles.detailValue}>{selectedInvoice.nfse_numero || '\u2014'}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Codigo Verificacao</span>
                    <span className={styles.detailValue}>{selectedInvoice.codigo_verificacao || '\u2014'}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Protocolo</span>
                    <span className={styles.detailValue}>{selectedInvoice.protocolo || '\u2014'}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>RPS</span>
                    <span className={styles.detailValue}>
                      {selectedInvoice.rps_numero ? `${selectedInvoice.rps_numero}/${selectedInvoice.rps_serie || '1'}` : '\u2014'}
                    </span>
                  </div>
                </div>
                {selectedInvoice.mensagem_erro && (
                  <div className={styles.errorMsg}>
                    <FaTimes /> {selectedInvoice.mensagem_erro}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className={styles.modalFooter}>
              <button
                className={styles.btnXml}
                onClick={() => handleVerXml(selectedInvoice.id)}
              >
                <FaCode /> Ver XML
              </button>

              {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'error') && (
                <button
                  className={styles.btnSend}
                  onClick={() => handleEnviar(selectedInvoice.id)}
                  disabled={actionLoading === selectedInvoice.id}
                >
                  <FaPaperPlane /> {actionLoading === selectedInvoice.id ? 'Enviando...' : 'Enviar para Prefeitura'}
                </button>
              )}

              {selectedInvoice.status === 'submitted' && (
                <button
                  className={styles.btnConsult}
                  onClick={() => handleConsultar(selectedInvoice.id)}
                  disabled={actionLoading === selectedInvoice.id}
                >
                  <FaSync /> {actionLoading === selectedInvoice.id ? 'Consultando...' : 'Consultar Status'}
                </button>
              )}

              {selectedInvoice.status === 'approved' && (
                <button
                  className={styles.btnCancel}
                  onClick={() => handleCancelar(selectedInvoice.id)}
                  disabled={actionLoading === selectedInvoice.id}
                >
                  <FaTimes /> {actionLoading === selectedInvoice.id ? 'Cancelando...' : 'Cancelar NFS-e'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal XML */}
      {isXmlModalOpen && xmlData && (
        <div className={styles.overlay} onClick={() => setIsXmlModalOpen(false)}>
          <div className={`${styles.modal} ${styles.xmlModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>XML da NFS-e</h2>
              <button onClick={() => setIsXmlModalOpen(false)} className={styles.closeBtn}><FaTimes /></button>
            </div>
            <div className={styles.modalBody}>
              {xmlData.xmlEnvio && (
                <div className={styles.xmlSection}>
                  <h3>XML de Envio</h3>
                  <pre className={styles.xmlPre}>{xmlData.xmlEnvio}</pre>
                </div>
              )}
              {xmlData.xmlRetorno && (
                <div className={styles.xmlSection}>
                  <h3>XML de Retorno</h3>
                  <pre className={styles.xmlPre}>{xmlData.xmlRetorno}</pre>
                </div>
              )}
              {!xmlData.xmlEnvio && !xmlData.xmlRetorno && (
                <p className={styles.noXml}>Nenhum XML disponivel. Envie a NFS-e para gerar o XML.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNFSe;
