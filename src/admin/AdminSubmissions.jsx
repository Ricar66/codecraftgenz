// src/admin/AdminSubmissions.jsx
// Gestão de submissões de desafios (admin)

import {
  Award,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import Modal from '../components/UI/Modal/Modal.jsx';
import { useToast } from '../components/UI/Toast';
import {
  listSubmissions,
  reviewSubmission,
} from '../services/challengeSubmissionsAPI.js';

import styles from './AdminSubmissions.module.css';

import './AdminCommon.css';

const TABS = [
  { key: '', label: 'Todas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'approved', label: 'Aprovadas' },
  { key: 'rejected', label: 'Rejeitadas' },
];

const STATUS_META = {
  pending: { label: 'Pendente', className: 'statusPending', emoji: '🟡' },
  approved: { label: 'Aprovada', className: 'statusApproved', emoji: '✅' },
  rejected: { label: 'Rejeitada', className: 'statusRejected', emoji: '❌' },
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

export default function AdminSubmissions() {
  const toast = useToast();

  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [data, setData] = useState({ items: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review modal state
  const [reviewModal, setReviewModal] = useState({
    open: false,
    submission: null,
    action: null, // 'approved' | 'rejected'
  });
  const [reviewForm, setReviewForm] = useState({ feedback: '', points: '' });
  const [reviewFormErrors, setReviewFormErrors] = useState({});
  const [reviewing, setReviewing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listSubmissions({
        status: filter || undefined,
        page,
        limit,
      });
      setData({
        items: res?.items || [],
        total: res?.total || 0,
        totalPages: res?.totalPages || 0,
      });
    } catch (e) {
      setError(e?.message || 'Falha ao carregar submissões');
      setData({ items: [], total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [filter, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = (key) => {
    setFilter(key);
    setPage(1);
  };

  const openReview = (submission, action) => {
    setReviewModal({ open: true, submission, action });
    setReviewForm({
      feedback: submission?.feedback || '',
      points:
        action === 'approved'
          ? String(
              submission?.points ||
                submission?.challenge?.basePoints ||
                submission?.challenge?.base_points ||
                0
            )
          : '0',
    });
    setReviewFormErrors({});
  };

  const closeReview = () => {
    if (reviewing) return;
    setReviewModal({ open: false, submission: null, action: null });
  };

  const validateReview = () => {
    const errs = {};
    if (reviewModal.action === 'approved') {
      const n = Number(reviewForm.points);
      if (!Number.isFinite(n) || n < 0) {
        errs.points = 'Informe um número válido (>= 0)';
      }
    }
    return errs;
  };

  const handleReviewBlur = () => {
    setReviewFormErrors(validateReview());
  };

  const submitReview = async (e) => {
    e?.preventDefault?.();
    if (!reviewModal.submission || !reviewModal.action) return;

    const errs = validateReview();
    setReviewFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.warning('Corrija os campos destacados.');
      return;
    }

    const payload = {
      status: reviewModal.action,
      feedback: reviewForm.feedback.trim() || undefined,
    };
    if (reviewModal.action === 'approved') {
      payload.points = Number(reviewForm.points) || 0;
    }

    try {
      setReviewing(true);
      await reviewSubmission(reviewModal.submission.id, payload);
      toast.success(
        reviewModal.action === 'approved'
          ? 'Submissão aprovada com sucesso!'
          : 'Submissão rejeitada.'
      );
      setReviewModal({ open: false, submission: null, action: null });
      await load();
    } catch (err) {
      toast.error(err?.message || 'Falha ao revisar submissão.');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.headerIcon}>
            <Award size={24} />
          </div>
          <div>
            <h1>Submissões de Desafios</h1>
            <p>Aprove ou rejeite entregas e conceda pontos aos Crafters.</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={load}
          disabled={loading}
          aria-label="Recarregar"
        >
          <RefreshCw size={16} className={loading ? styles.spin : ''} />
          Atualizar
        </button>
      </header>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key || 'all'}
            role="tab"
            aria-selected={filter === t.key}
            className={`${styles.tab} ${filter === t.key ? styles.tabActive : ''}`}
            onClick={() => handleFilterChange(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
        <span className={styles.tabCount}>
          Total: <strong>{data.total}</strong>
        </span>
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          {error}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Desafio</th>
              <th>Usuário</th>
              <th>Repositório</th>
              <th>Enviada em</th>
              <th>Status</th>
              <th>Pontos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className={styles.tableEmpty}>
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.tableEmpty}>
                  Nenhuma submissão encontrada.
                </td>
              </tr>
            )}
            {!loading &&
              data.items.map((s) => {
                const meta = STATUS_META[s.status] || {
                  label: s.status,
                  className: '',
                  emoji: '•',
                };
                const repo = s.repo_url || s.deliveryUrl;
                return (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.challenge?.name || s.desafio_id}</td>
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.userName}>{s.user?.name || '—'}</span>
                        <span className={styles.userEmail}>{s.user?.email || ''}</span>
                      </div>
                    </td>
                    <td>
                      {repo ? (
                        <a
                          href={repo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.repoLink}
                        >
                          <ExternalLink size={14} />
                          <span>Abrir</span>
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{formatDate(s.submitted_at || s.created_at)}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${styles[meta.className] || ''}`}
                      >
                        {meta.emoji} {meta.label}
                      </span>
                    </td>
                    <td>
                      {s.status === 'approved' ? (
                        <strong className={styles.pointsCell}>+{s.points || 0}</strong>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {s.status === 'pending' ? (
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.btnApprove}
                            onClick={() => openReview(s, 'approved')}
                          >
                            <CheckCircle2 size={14} /> Aprovar
                          </button>
                          <button
                            type="button"
                            className={styles.btnReject}
                            onClick={() => openReview(s, 'rejected')}
                          >
                            <XCircle size={14} /> Rejeitar
                          </button>
                        </div>
                      ) : (
                        s.feedback && (
                          <span className={styles.feedbackPreview} title={s.feedback}>
                            {s.feedback.length > 40 ? `${s.feedback.slice(0, 40)}…` : s.feedback}
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className={styles.pageInfo}>
            Página {page} de {data.totalPages}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page >= data.totalPages || loading}
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
          >
            Próxima
          </button>
        </div>
      )}

      <Modal
        isOpen={reviewModal.open}
        onClose={closeReview}
        title={
          reviewModal.action === 'approved'
            ? 'Aprovar submissão'
            : reviewModal.action === 'rejected'
              ? 'Rejeitar submissão'
              : 'Revisar submissão'
        }
        size="md"
        footer={
          <>
            <button
              type="button"
              className={styles.modalBtnGhost}
              onClick={closeReview}
              disabled={reviewing}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={
                reviewModal.action === 'approved'
                  ? styles.modalBtnApprove
                  : styles.modalBtnReject
              }
              onClick={submitReview}
              disabled={reviewing}
            >
              {reviewing
                ? 'Enviando...'
                : reviewModal.action === 'approved'
                  ? 'Confirmar aprovação'
                  : 'Confirmar rejeição'}
            </button>
          </>
        }
      >
        {reviewModal.submission && (
          <form onSubmit={submitReview} className={styles.modalForm}>
            <div className={styles.modalSummary}>
              <div>
                <strong>Desafio:</strong>{' '}
                {reviewModal.submission.challenge?.name || reviewModal.submission.desafio_id}
              </div>
              <div>
                <strong>Usuário:</strong>{' '}
                {reviewModal.submission.user?.name} ({reviewModal.submission.user?.email})
              </div>
              {reviewModal.submission.repo_url && (
                <div>
                  <strong>Repositório:</strong>{' '}
                  <a
                    href={reviewModal.submission.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.repoLink}
                  >
                    {reviewModal.submission.repo_url}
                  </a>
                </div>
              )}
              {reviewModal.submission.description && (
                <div>
                  <strong>Descrição:</strong>
                  <p className={styles.description}>{reviewModal.submission.description}</p>
                </div>
              )}
            </div>

            <div className={styles.modalField}>
              <label htmlFor="feedback" className={styles.modalLabel}>
                Feedback (opcional)
              </label>
              <textarea
                id="feedback"
                className={styles.modalTextarea}
                rows={4}
                maxLength={2000}
                value={reviewForm.feedback}
                onChange={(e) =>
                  setReviewForm((p) => ({ ...p, feedback: e.target.value }))
                }
                disabled={reviewing}
                placeholder="Comentários para o Crafter..."
              />
            </div>

            {reviewModal.action === 'approved' && (
              <div className={styles.modalField}>
                <label htmlFor="points" className={styles.modalLabel}>
                  Pontos concedidos
                </label>
                <input
                  id="points"
                  type="number"
                  min="0"
                  step="1"
                  className={`${styles.modalInput} ${reviewFormErrors.points ? styles.modalInputError : ''}`}
                  value={reviewForm.points}
                  onChange={(e) =>
                    setReviewForm((p) => ({ ...p, points: e.target.value }))
                  }
                  onBlur={handleReviewBlur}
                  disabled={reviewing}
                />
                {reviewFormErrors.points && (
                  <p className={styles.modalFieldError}>{reviewFormErrors.points}</p>
                )}
                <p className={styles.modalHelp}>
                  Pontos base do desafio:{' '}
                  {reviewModal.submission.challenge?.basePoints ||
                    reviewModal.submission.challenge?.base_points ||
                    0}
                </p>
              </div>
            )}
          </form>
        )}
      </Modal>

    </div>
  );
}
