// src/pages/RankingPage/index.jsx
// Leaderboard público da comunidade Discord CodeCraft Gen-Z.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Star, Flame, Share2, MessageSquare, Crown, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react';

import Navbar from '../../components/Navbar/Navbar';
import { useToast } from '../../components/UI/Toast';
import { useAuth } from '../../context/useAuth';
import { getPublicMemberRanking, getDiscordStatus } from '../../services/discordAPI.js';

import styles from './RankingPage.module.css';

const PAGE_SIZE = 20;

const ROLE_FILTERS = [
  { value: '',              label: 'Todos' },
  { value: 'novato',        label: 'Novato' },
  { value: 'crafter',       label: 'Crafter' },
  { value: 'crafter_elite', label: 'Crafter Elite' },
];

const ROLE_META = {
  novato:        { label: 'Novato',        cls: styles.roleNovato,   avatarColor: '#94a3b8', nextThreshold: 100,  nextLabel: 'Crafter' },
  crafter:       { label: 'Crafter',       cls: styles.roleCrafter,  avatarColor: '#00E4F2', nextThreshold: 500,  nextLabel: 'Crafter Elite' },
  crafter_elite: { label: 'Crafter Elite', cls: styles.roleElite,    avatarColor: '#FFD700', nextThreshold: null, nextLabel: null },
};

function getInitial(m) {
  const name = (m.displayName || m.username || '?').trim();
  return (name[0] || '?').toUpperCase();
}

function roleMeta(role) {
  return ROLE_META[role] || ROLE_META.novato;
}

function progressForRole(score, role) {
  const meta = roleMeta(role);
  if (!meta.nextThreshold) return { pct: 100, done: true, next: null };
  const base = role === 'crafter' ? 100 : 0;
  const span = meta.nextThreshold - base;
  const clamped = Math.max(0, Math.min(span, score - base));
  const pct = span > 0 ? (clamped / span) * 100 : 0;
  return { pct, done: false, next: meta.nextLabel, threshold: meta.nextThreshold };
}

function MedalOrNumber({ position }) {
  if (position === 1) return <span className={styles.positionMedal} aria-label="1º lugar">🥇</span>;
  if (position === 2) return <span className={styles.positionMedal} aria-label="2º lugar">🥈</span>;
  if (position === 3) return <span className={styles.positionMedal} aria-label="3º lugar">🥉</span>;
  return <>#{position}</>;
}

function PodiumCard({ member, position }) {
  if (!member) return null;
  const meta = roleMeta(member.currentRole);
  const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';
  return (
    <motion.div
      className={`${styles.podiumCard} ${position === 1 ? styles.podium1 : ''}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: position === 1 ? -18 : 0 }}
      transition={{ duration: 0.45, delay: 0.08 * position }}
    >
      <div className={styles.podiumMedal}>{medal}</div>
      <div
        className={styles.podiumAvatar}
        style={{ background: `linear-gradient(135deg, ${meta.avatarColor} 0%, #0a0a0f 140%)` }}
      >
        {getInitial(member)}
      </div>
      <h3 className={styles.podiumName}>{member.displayName || member.username}</h3>
      <p className={styles.podiumUser}>@{member.username}</p>
      <span className={styles.podiumScore}>
        <Star size={14} aria-hidden /> {member.score} pts
      </span>
    </motion.div>
  );
}

function RankRow({ member, position, highlighted }) {
  const meta = roleMeta(member.currentRole);
  const prog = progressForRole(member.score, member.currentRole);

  return (
    <motion.div
      className={`${styles.row} ${highlighted ? styles.rowHighlight : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <div className={styles.position}>
        <MedalOrNumber position={position} />
      </div>

      <div
        className={styles.avatar}
        style={{ background: `linear-gradient(135deg, ${meta.avatarColor} 0%, #0a0a0f 160%)` }}
        aria-hidden
      >
        {getInitial(member)}
      </div>

      <div className={styles.identity}>
        <span className={styles.displayName}>{member.displayName || member.username}</span>
        <span className={styles.badgeRow}>
          <span className={`${styles.roleBadge} ${meta.cls}`}>{meta.label}</span>
          <span className={styles.username}>@{member.username}</span>
        </span>
      </div>

      <span className={styles.points}>
        <Star size={14} aria-hidden /> {member.score}
      </span>

      <span className={`${styles.streak} ${(member.streakDays ?? 0) < 1 ? styles.streakDim : ''}`}>
        <Flame size={14} aria-hidden /> {(member.streakDays ?? 0) > 0 ? `${member.streakDays}d` : '—'}
      </span>

      <div className={styles.progress}>
        {prog.done ? (
          <>
            <span className={styles.progressLabel}>
              <span>Cargo máximo</span>
              <Crown size={12} aria-hidden />
            </span>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} style={{ width: '100%' }} />
            </div>
          </>
        ) : (
          <>
            <span className={styles.progressLabel}>
              <span>Próx.: {prog.next}</span>
              <span>{member.score}/{prog.threshold}</span>
            </span>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} style={{ width: `${prog.pct}%` }} />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function RankingPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ members: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myDiscordId, setMyDiscordId] = useState(null);

  // ?highlight=DISCORD_ID — destaca card específico.
  const highlightFromUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('highlight') || '';
  }, []);

  // Detecta Discord do usuário logado (se aplicável).
  const statusFetched = useRef(false);
  useEffect(() => {
    if (!user || statusFetched.current) return;
    statusFetched.current = true;
    getDiscordStatus()
      .then(d => {
        if (d?.linked && d.discordId) setMyDiscordId(String(d.discordId));
      })
      .catch(() => { /* silencioso: perfil pode não ter Discord vinculado */ });
  }, [user]);

  const highlightedId = highlightFromUrl || myDiscordId || '';

  const fetchRanking = useCallback(async (opts = {}) => {
    const p = opts.page ?? page;
    const r = opts.role ?? role;
    setLoading(true);
    setError('');
    try {
      const res = await getPublicMemberRanking({ page: p, limit: PAGE_SIZE, role: r });
      setData({
        members: Array.isArray(res?.members) ? res.members : [],
        total: Number(res?.total ?? 0),
        pages: Number(res?.pages ?? 1),
      });
    } catch (err) {
      setError(err?.message || 'Não foi possível carregar o ranking.');
      setData({ members: [], total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, role]);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  const handleRoleChange = (next) => {
    setRole(next);
    setPage(1);
  };

  const handleShare = async () => {
    if (!highlightedId) {
      toast.info('Vincule seu Discord no perfil para compartilhar sua posição!');
      return;
    }
    const url = `${window.location.origin}/ranking?highlight=${encodeURIComponent(highlightedId)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    } catch {
      // Fallback para ambientes sem permissão do clipboard.
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.success('Link copiado!');
      } catch {
        toast.error('Não foi possível copiar o link. Copie manualmente: ' + url);
      }
    }
  };

  const top3 = page === 1 && !role ? data.members.slice(0, 3) : [];
  const rest = page === 1 && !role ? data.members.slice(3) : data.members;
  const totalPages = Math.max(1, data.pages || 1);

  return (
    <div className={`${styles.page} starfield-bg`}>
      <Navbar />

      {/* Hero */}
      <section className={styles.hero}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className={styles.heroBadge}>
            <Sparkles size={14} aria-hidden /> Comunidade Discord
          </span>
          <h1 className={styles.heroTitle}>
            🏆 Ranking da <span>Comunidade</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Ganhe pontos interagindo no Discord da CodeCraft Gen-Z. Mensagens, reações,
            participação em threads e presença em voz contam. Streak de 7 dias dá bônus.
          </p>
          <div className={styles.heroPoints}>
            <span className={styles.pointBadge}><MessageSquare size={12} aria-hidden /> <strong>+1</strong> por mensagem</span>
            <span className={styles.pointBadge}><Star size={12} aria-hidden /> <strong>+2</strong> por reação recebida</span>
            <span className={styles.pointBadge}><Flame size={12} aria-hidden /> <strong>Bônus</strong> streak semanal</span>
            <span className={styles.pointBadge}><Crown size={12} aria-hidden /> <strong>100 pts</strong> → Crafter</span>
            <span className={styles.pointBadge}><Trophy size={12} aria-hidden /> <strong>500 pts</strong> → Crafter Elite</span>
          </div>
        </motion.div>
      </section>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.roleFilter} role="tablist" aria-label="Filtrar por cargo">
          {ROLE_FILTERS.map(opt => (
            <button
              key={opt.value || 'all'}
              type="button"
              role="tab"
              aria-selected={role === opt.value}
              className={`${styles.pill} ${role === opt.value ? styles.pillActive : ''}`}
              onClick={() => handleRoleChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button type="button" className={styles.shareBtn} onClick={handleShare}>
          <Share2 size={16} aria-hidden />
          Compartilhar minha posição
        </button>
      </div>

      {/* Podium */}
      {!loading && !error && top3.length > 0 && (
        <section className={styles.podium}>
          {top3[1] && <PodiumCard member={top3[1]} position={2} />}
          {top3[0] && <PodiumCard member={top3[0]} position={1} />}
          {top3[2] && <PodiumCard member={top3[2]} position={3} />}
        </section>
      )}

      {/* List */}
      <section className={styles.listWrapper}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p className={styles.emptyText}>Carregando ranking...</p>
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <h2 className={styles.errorTitle}>Oops, algo deu errado</h2>
            <p className={styles.errorText}>{error}</p>
            <button type="button" className={styles.retryBtn} onClick={() => fetchRanking()}>
              Tentar novamente
            </button>
          </div>
        ) : data.members.length === 0 ? (
          <div className={styles.empty}>
            <h2 className={styles.emptyTitle}>Nenhum membro encontrado</h2>
            <p className={styles.emptyText}>
              Entre no servidor do Discord e participe para aparecer aqui!
            </p>
          </div>
        ) : (
          <>
            <div className={styles.listHeader}>
              <span>Posição · Membro</span>
              <span>Pontos · Streak · Progresso</span>
            </div>

            <motion.div
              className={styles.list}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 1 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
              }}
            >
              <AnimatePresence initial={false}>
                {rest.map((m, idx) => {
                  const position = (page - 1) * PAGE_SIZE + (page === 1 && !role ? 4 + idx : idx + 1);
                  const highlighted = !!highlightedId && String(m.discordId) === String(highlightedId);
                  return (
                    <RankRow
                      key={m.discordId}
                      member={m}
                      position={position}
                      highlighted={highlighted}
                    />
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} aria-hidden /> Anterior
                </button>
                <span className={styles.pageInfo}>
                  Página {page} de {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Próxima página"
                >
                  Próxima <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
