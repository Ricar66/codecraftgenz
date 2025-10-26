// src/hooks/useFeedbacks.js
import { useState, useEffect, useCallback } from 'react';

import { getFeedbacks, submitFeedback, FeedbackValidator, isSpamSubmission } from '../services/feedbackAPI';

export default function useFeedbacks(options = {}) {
  const {
    autoFetch = true,
    pageSize = 5,
    moderationEnabled = (import.meta.env.VITE_FEEDBACK_MODERATION === 'true')
  } = options;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ type: 'all', minRating: 1 });
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 0 });

  const fetchAll = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFeedbacks({
        page: opts.page || page,
        limit: pageSize,
        type: opts.type ?? filters.type,
        minRating: opts.minRating ?? filters.minRating,
        onlyApproved: moderationEnabled,
      });
      setItems(res.items);
      setPagination(res.pagination);
    } catch (e) {
      setError({ message: e.message });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters.type, filters.minRating, moderationEnabled]);

  const submit = useCallback(async (data, { honeypot = '' } = {}) => {
    const { isValid, errors } = FeedbackValidator.validate(data);
    if (!isValid) {
      const err = new Error('Campos inválidos');
      err.details = errors;
      throw err;
    }
    if (isSpamSubmission(honeypot)) {
      const err = new Error('Submissão identificada como spam');
      throw err;
    }
    const saved = await submitFeedback(data, { useMockData: true, honeypot });
    await fetchAll({ page: 1 });
    return saved;
  }, [fetchAll]);

  useEffect(() => {
    if (autoFetch) fetchAll({ page: 1 });
  }, [autoFetch, fetchAll]);

  return {
    items,
    pagination,
    loading,
    error,
    page,
    setPage: (p) => { setPage(p); fetchAll({ page: p }); },
    filters,
    setFilters: (f) => { setFilters(f); fetchAll({ page: 1, ...f }); },
    submit,
  };
}