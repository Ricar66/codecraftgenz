// src/components/Feedbacks/FeedbackList.jsx
import React from 'react';

import useFeedbacks from '../../hooks/useFeedbacks';

export default function FeedbackList({ pageSize = 5 }) {
  const { items, pagination, loading, error, setPage, filters, setFilters } = useFeedbacks({ pageSize });

  return (
    <section aria-label="Feedbacks recebidos" style={{ display: 'grid', gap: '12px' }}>
      <header style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <strong>Feedbacks</strong>
        <label>
          Tipo:&nbsp;
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} aria-label="Filtrar por tipo">
            <option value="all">Todos</option>
            <option value="elogio">Elogios</option>
            <option value="sugestao">Sugestões</option>
            <option value="critica">Críticas</option>
          </select>
        </label>
        <label>
          Nota mínima:&nbsp;
          <select value={filters.minRating} onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })} aria-label="Filtrar por avaliação mínima">
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </header>

      {loading && <div role="status">Carregando feedbacks...</div>}
      {error && <div role="alert" style={{ color: 'red' }}>{error.message}</div>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
        {items.map(item => (
          <li key={item.ID || item.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{item.Author || item.Company || item.author || item.company || 'Anônimo'}</strong>
              <span aria-label={`Avaliação ${item.Rating || item.rating} de 5`}>
                {'★'.repeat(item.Rating || item.rating)}{'☆'.repeat(5 - (item.Rating || item.rating))}
              </span>
            </div>
            <small style={{ color: '#666' }}>{new Date(item.CreatedAt || item.createdAt).toLocaleString()}</small>
            <p style={{ marginTop: 8 }}>{item.Message || item.message}</p>
            <small style={{ background: '#f3f3f3', borderRadius: 6, padding: '2px 6px' }}>{item.Type || item.type}</small>
            {item.approved === false && (
              <small style={{ marginLeft: 8, color: '#a00' }}>Pendente de moderação</small>
            )}
          </li>
        ))}
      </ul>

      <nav aria-label="Paginação" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setPage(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1} aria-label="Página anterior">Anterior</button>
        <span>Página {pagination.page} de {pagination.totalPages || 1}</span>
        <button onClick={() => setPage(Math.min(pagination.totalPages || 1, pagination.page + 1))} disabled={(pagination.page >= (pagination.totalPages || 1))} aria-label="Próxima página">Próxima</button>
      </nav>
    </section>
  );
}