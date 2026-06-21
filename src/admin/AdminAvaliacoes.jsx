// src/admin/AdminAvaliacoes.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Star, Mail, User, Calendar, Tag, Eye, EyeOff, Trash2, RefreshCw, ExternalLink } from 'lucide-react';

import { useToast } from '../components/UI/Toast';
import { listReviews, markReviewLida, deleteReview, REVIEW_TIPOS } from '../services/reviewAPI.js';

import styles from './AdminAvaliacoes.module.css';

const TIPO_EMOJI = REVIEW_TIPOS.reduce((acc, t) => ({ ...acc, [t.value]: t.emoji }), {});
const TIPO_LABEL = REVIEW_TIPOS.reduce((acc, t) => ({ ...acc, [t.value]: t.label }), {});

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function Stars({ n }) {
  return (
    <span className={styles.starsRow}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} fill={i <= n ? '#fbbf24' : 'none'} className={i <= n ? styles.starFilled : styles.starEmpty} />
      ))}
    </span>
  );
}

export default function AdminAvaliacoes() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterLida, setFilterLida] = useState(''); // '', 'true', 'false'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listReviews({
        limit: 100,
        tipo: filterTipo || undefined,
        lida: filterLida === '' ? undefined : (filterLida === 'true'),
      });
      setItems(data?.items || []);
      setNaoLidas(data?.naoLidas || 0);
      setTotal(data?.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  }, [filterTipo, filterLida, toast]);

  useEffect(() => { load(); }, [load]);

  async function handleToggleLida(item) {
    try {
      await markReviewLida(item.id, !item.lida);
      setItems(prev => prev.map(r => r.id === item.id ? { ...r, lida: !item.lida } : r));
      setNaoLidas(prev => Math.max(0, prev + (item.lida ? 1 : -1)));
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar');
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Excluir avaliação #${item.id}?`)) return;
    try {
      await deleteReview(item.id);
      setItems(prev => prev.filter(r => r.id !== item.id));
      setTotal(prev => prev - 1);
      if (!item.lida) setNaoLidas(prev => Math.max(0, prev - 1));
      toast.success('Avaliação excluída');
    } catch (err) {
      toast.error(err?.message || 'Erro ao excluir');
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Avaliações do site
            {naoLidas > 0 && <span className={styles.badge}>{naoLidas} não lidas</span>}
          </h1>
          <p className={styles.subtitle}>
            Opiniões enviadas pela página <code>/avaliacao</code>. Notificações também aparecem no canal admin do Discord.
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={loading} title="Recarregar">
          <RefreshCw size={16} className={loading ? styles.spin : ''} /> Recarregar
        </button>
      </header>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Tipo:</label>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
            <option value="">Todos</option>
            {REVIEW_TIPOS.map(t => (
              <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Status:</label>
          <select value={filterLida} onChange={e => setFilterLida(e.target.value)}>
            <option value="">Todos</option>
            <option value="false">Não lidas</option>
            <option value="true">Lidas</option>
          </select>
        </div>
        <div className={styles.summary}>
          {total} {total === 1 ? 'avaliação' : 'avaliações'}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <h3>Sem avaliações ainda</h3>
          <p>Envie o link <code>https://codecraftgenz.com.br/avaliacao?ref=wpp</code> para receber opiniões.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map(item => (
            <article key={item.id} className={`${styles.card} ${!item.lida ? styles.cardUnread : ''}`}>
              <div className={styles.cardHead}>
                <span className={`${styles.tipoChip} ${styles[`tipo_${item.tipo}`]}`}>
                  {TIPO_EMOJI[item.tipo] || '•'} {TIPO_LABEL[item.tipo] || item.tipo}
                </span>
                <Stars n={item.nota} />
                <span className={styles.metaItem}><Calendar size={12} /> {fmtDate(item.createdAt)}</span>
                <span className={styles.metaItem}><Tag size={12} /> {item.ref || 'direto'}</span>
                {!item.lida && <span className={styles.unreadDot} title="Não lida" />}
              </div>

              <p className={styles.mensagem}>{item.mensagem}</p>

              <div className={styles.cardFoot}>
                <div className={styles.contactInfo}>
                  {item.nome && <span><User size={12} /> {item.nome}</span>}
                  {item.email && (
                    <a href={`mailto:${item.email}?subject=Sobre%20sua%20avalia%C3%A7%C3%A3o%20%23${item.id}`}>
                      <Mail size={12} /> {item.email} <ExternalLink size={10} />
                    </a>
                  )}
                  {!item.nome && !item.email && <span className={styles.anon}>Anônimo</span>}
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.actionBtn} onClick={() => handleToggleLida(item)}>
                    {item.lida ? (<><EyeOff size={14} /> Marcar não lida</>) : (<><Eye size={14} /> Marcar lida</>)}
                  </button>
                  <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => handleDelete(item)}>
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
