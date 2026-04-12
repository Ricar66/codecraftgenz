// src/components/Challenges/ChallengeCard.jsx
import { sanitizeImageUrl } from '../../utils/urlSanitize.js';
import styles from './ChallengeCard.module.css';

const DIFF_MAP = {
  starter:      { label: 'Starter',       cls: styles.pillGreen },
  intermediate: { label: 'Intermediário', cls: styles.pillYellow },
  pro:          { label: 'Pro',           cls: styles.pillRed },
};

const STATUS_MAP = {
  active:   { label: 'Ativo',     cls: styles.pillGreen },
  closed:   { label: 'Encerrado', cls: styles.pillGray },
  archived: { label: 'Arquivado', cls: styles.pillGray },
  draft:    { label: 'Rascunho',  cls: styles.pillYellow },
};

export default function ChallengeCard({ challenge }) {
  const c = challenge || {};
  const tags = Array.isArray(c.tags) ? c.tags : [];
  const diff   = DIFF_MAP[String(c.difficulty || '').toLowerCase()] || { label: '—', cls: '' };
  const status = STATUS_MAP[String(c.status || '').toLowerCase()]   || { label: '—', cls: '' };
  const hasPoints = typeof c.base_points === 'number' && c.base_points > 0;

  return (
    <article className={styles.card}>
      {/* ── Header ── */}
      <div className={styles.header}>
        {c.thumb_url && (
          <img
            className={styles.thumb}
            src={sanitizeImageUrl(c.thumb_url)}
            alt={c.name}
            loading="lazy"
          />
        )}
        <div className={styles.headerText}>
          <h3 className={styles.name}>{c.name}</h3>
          <div className={styles.badges}>
            <span className={`${styles.pill} ${diff.cls}`}>{diff.label}</span>
            <span className={`${styles.pill} ${status.cls}`}>{status.label}</span>
          </div>
        </div>
      </div>

      {/* ── Tags ── */}
      {tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map((t, i) => (
            <span key={i} className={`${styles.pill} ${styles.pillCyan}`}>{t}</span>
          ))}
        </div>
      )}

      {/* ── Objective — expands to fill ── */}
      <p className={styles.objective}>
        {c.objective || c.description || ''}
      </p>

      {/* ── Footer: points + reward ── */}
      <div className={styles.footer}>
        {hasPoints && (
          <span className={`${styles.pill} ${styles.pillIndigo}`}>+{c.base_points} pts</span>
        )}
        {c.reward && (
          <span className={styles.reward}>🎁 {c.reward}</span>
        )}
      </div>
    </article>
  );
}
