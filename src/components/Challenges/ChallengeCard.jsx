import React from 'react';

import { sanitizeImageUrl } from '../../utils/urlSanitize.js';

import styles from './ChallengeCard.module.css';

function formatDate(iso) {
  try { return new Date(iso).toLocaleString('pt-BR'); } catch { return '—'; }
}

function countdown(iso) {
  try {
    const end = new Date(iso).getTime();
    const diff = Math.max(0, end - Date.now());
    const d = Math.floor(diff / (24*60*60*1000));
    const h = Math.floor((diff % (24*60*60*1000)) / (60*60*1000));
    const m = Math.floor((diff % (60*60*1000)) / (60*1000));
    return `${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}h`;
  } catch { return '—'; }
}

export default function ChallengeCard({ challenge }) {
  const c = challenge || {};
  const diffLabel = (d) => {
    const v = String(d || '').toLowerCase();
    if (v==='starter') return 'Starter';
    if (v==='intermediate') return 'Intermediário';
    if (v==='pro') return 'Pro';
    return '—';
  };
  const statusLabel = (s) => {
    const v = String(s || '').toLowerCase();
    if (v==='active') return 'Ativo';
    if (v==='closed') return 'Encerrado';
    if (v==='archived') return 'Arquivado';
    if (v==='draft') return 'Rascunho';
    return '—';
  };

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        {c.thumb_url ? (<img className={styles.thumb} src={sanitizeImageUrl(c.thumb_url)} alt="Thumb" />) : null}
        <h3 className={styles.name}>{c.name}</h3>
        <span className={styles.pill}>{diffLabel(c.difficulty)}</span>
      </div>
      <div className={styles.tags}>
        {(Array.isArray(c.tags)?c.tags:[]).map((t,i)=>(<span key={i} className={styles.pill}>{t}</span>))}
      </div>
      <p className={styles.objective}>{c.objective || c.description || ''}</p>
      <div className={styles.meta}>
        <span className={styles.countdown}>⏳ {countdown(c.deadline)}</span>
        {c.reward ? (<span className={styles.reward}>🎁 {c.reward}</span>) : null}
        {typeof c.base_points==='number' && c.base_points>0 ? (<span className={styles.pill}>+{c.base_points} pts</span>) : null}
        <span className={styles.pill}>{statusLabel(c.status)}</span>
      </div>
      <div className={styles.meta}><span>Deadline: {formatDate(c.deadline)}</span></div>
    </article>
  );
}