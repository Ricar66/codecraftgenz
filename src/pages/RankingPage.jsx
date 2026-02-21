// src/pages/RankingPage.jsx
// Leaderboard Estilo Game - Cyberpunk/Glassmorphism Design
import React, { useEffect, useState, useMemo } from 'react';

import Navbar from '../components/Navbar/Navbar';
import { realtime } from '../lib/realtime';
import { getRanking } from '../services/rankingAPI.js';

import styles from './RankingPage.module.css';

/**
 * Componente do Pódio - Top 3
 */
const PodiumItem = ({ data, position }) => {
  if (!data) return null;

  const positionClass = position === 1
    ? styles.firstPlace
    : position === 2
      ? styles.secondPlace
      : styles.thirdPlace;

  const positionLabels = {
    1: '1º Lugar',
    2: '2º Lugar',
    3: '3º Lugar'
  };

  const medals = {
    1: null, // Crown for first
    2: '🥈',
    3: '🥉'
  };

  return (
    <div className={`${styles.podiumItem} ${positionClass}`}>
      {position === 1 && (
        <div className={styles.crownBadge} title="Campeão">
          👑
        </div>
      )}

      <div className={styles.avatarFrame}>
        {data.avatar ? (
          <img
            src={data.avatar}
            alt={data.name}
            className={styles.avatarImage}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>👤</div>
        )}
        {medals[position] && (
          <span className={styles.medalBadge}>{medals[position]}</span>
        )}
      </div>

      <div className={styles.podiumInfo}>
        <span className={styles.podiumPosition}>{positionLabels[position]}</span>
        <h3 className={styles.podiumName}>{data.name || '—'}</h3>
        <span className={styles.podiumScore}>
          ⭐ {data.score ?? 0} pts
        </span>
        {data.reward && (
          <span className={styles.podiumReward}>🎁 {data.reward}</span>
        )}
      </div>
    </div>
  );
};

/**
 * Componente do Card de Rank
 */
const RankCard = ({ data, position }) => {
  const isTop10 = position <= 10;

  return (
    <li className={styles.rankCard}>
      <div className={`${styles.rankPosition} ${isTop10 ? styles.rankTop10 : ''}`}>
        #{position}
      </div>

      <div className={styles.rankAvatar}>
        {data.avatar ? (
          <img
            src={data.avatar}
            alt={data.name}
            className={styles.rankAvatarImg}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className={styles.rankAvatarPlaceholder}>👤</div>
        )}
      </div>

      <div className={styles.rankInfo}>
        <h4 className={styles.rankName}>{data.name}</h4>
        {data.area && <span className={styles.rankArea}>{data.area}</span>}
      </div>

      <div className={styles.rankScore}>
        <span className={styles.scoreIcon}>⭐</span>
        {data.score} pts
      </div>
    </li>
  );
};

/**
 * Página de Ranking - Game-style Leaderboard
 */
export default function RankingPage() {
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('admin') === '1';

  const [top3, setTop3] = useState([]);
  const [table, setTable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [minScore, setMinScore] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchRanking = async () => {
    try {
      setLoading(true);
      setError('');
      const json = await getRanking();

      // Normalize crafters data
      const crafters = Array.isArray(json?.crafters) ? json.crafters : [];
      const normalizedCrafters = crafters.map(c => ({
        ...c,
        id: c.id,
        nome: c.nome || c.name || c.nome_completo || '',
        points: c.points ?? c.pontos ?? c.score ?? 0,
        area: c.area_interesse || c.area || c.stack || c.especialidade || '',
        avatar_url: c.avatar_url || c.avatarUrl || c.foto || c.photo || null,
      }));

      // Build Top 3
      const t3 = Array.isArray(json?.top3) ? json.top3.map(t => {
        const crafterId = t.crafter_id || t.crafterId || t.id;
        const c = normalizedCrafters.find(cr => cr.id === crafterId) || {};
        return {
          place: t.position || t.posicao,
          name: c.nome || '—',
          score: c.points ?? 0,
          reward: t.reward || t.recompensa || '',
          avatar: c.avatar_url || null,
        };
      }) : [];

      // Build table from crafters
      const tb = normalizedCrafters.map(c => ({
        id: c.id,
        name: c.nome || '—',
        score: Number.isFinite(c.points) ? c.points : 0,
        area: c.area || '',
        avatar: c.avatar_url || null,
      }));

      setTop3(t3);
      setTable(tb);
    } catch (err) {
      console.error('Erro ao carregar ranking:', err);
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('conexão') || msg.includes('fetch') || msg.includes('network') || msg.includes('failed')) {
        setError('Erro de conexão: Verifique sua internet e tente novamente');
      } else if (msg.includes('401') || msg.includes('403')) {
        setError('Acesso não autorizado ao ranking');
      } else {
        setError('Ranking em processamento. Volte em instantes!');
      }
      setTop3([]);
      setTable([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
    const unsub = realtime.subscribe('ranking_changed', () => { fetchRanking(); });
    return () => unsub();
  }, []);

  // Get unique areas for filter
  const areas = useMemo(() => {
    return Array.from(new Set((table || []).map(r => r.area).filter(Boolean))).sort();
  }, [table]);

  // Filter and sort table data
  const filtered = useMemo(() => {
    return (table || [])
      .filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
      .filter(r => !areaFilter || r.area === areaFilter)
      .filter(r => (r.score ?? 0) >= (Number(minScore) || 0))
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
        if (sortBy === 'area') return (a.area || '').localeCompare(b.area || '') * dir;
        return ((a.score ?? 0) - (b.score ?? 0)) * dir;
      });
  }, [table, query, areaFilter, minScore, sortBy, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Get podium data by place
  const getPodiumData = (place) => (top3 || []).find(p => p.place === place);

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Ranking dos Crafters</h1>
          <p className={styles.heroSubtitle}>
            Os maiores destaques da semana nos projetos CodeCraft.
            Conquiste pontos, suba no ranking e ganhe recompensas!
          </p>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Carregando ranking...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryBtn} onClick={fetchRanking}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Podium Section - Top 3 */}
          {top3.length > 0 && (
            <section className={styles.podiumSection}>
              <div className={styles.podiumContainer}>
                <PodiumItem data={getPodiumData(2)} position={2} />
                <PodiumItem data={getPodiumData(1)} position={1} />
                <PodiumItem data={getPodiumData(3)} position={3} />
              </div>
            </section>
          )}

          {/* Filters Section */}
          <section className={styles.filtersSection}>
            <div className={styles.filtersContainer}>
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                className={styles.searchInput}
                aria-label="Buscar por nome"
              />

              <select
                value={areaFilter}
                onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }}
                className={styles.filterSelect}
                aria-label="Filtrar por área"
              >
                <option value="">Todas as áreas</option>
                {areas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <div className={styles.minScoreWrapper}>
                <label htmlFor="minScore" className={styles.minScoreLabel}>Mín. pontos</label>
                <input
                  id="minScore"
                  type="number"
                  min="0"
                  value={minScore}
                  onChange={(e) => { setMinScore(e.target.value); setPage(1); }}
                  className={styles.minScoreInput}
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={styles.filterSelect}
                aria-label="Ordenar por"
              >
                <option value="score">Pontuação</option>
                <option value="name">Nome</option>
                <option value="area">Área</option>
              </select>

              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
                className={styles.filterSelect}
                aria-label="Direção da ordenação"
              >
                <option value="desc">Maior → Menor</option>
                <option value="asc">Menor → Maior</option>
              </select>
            </div>
          </section>

          {/* Leaderboard List */}
          <section className={styles.leaderboardSection}>
            <div className={styles.leaderboardHeader}>
              <h2 className={styles.leaderboardTitle}>Leaderboard</h2>
              <span className={styles.leaderboardCount}>
                {filtered.length} participante{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {pageItems.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🏆</div>
                <h3 className={styles.emptyTitle}>Nenhum participante encontrado</h3>
                <p className={styles.emptyText}>
                  Ajuste os filtros ou volte em breve para ver os rankings.
                </p>
              </div>
            ) : (
              <>
                <ul className={styles.rankCardsList} aria-live="polite">
                  {pageItems.map((data, idx) => (
                    <RankCard
                      key={data.id || `${data.name}-${idx}`}
                      data={data}
                      position={(page - 1) * pageSize + idx + 1}
                    />
                  ))}
                </ul>

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.paginationBtn}
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      aria-label="Página anterior"
                    >
                      ◀
                    </button>
                    <span className={styles.paginationInfo}>
                      Página {page} de {totalPages}
                    </span>
                    <button
                      className={styles.paginationBtn}
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      aria-label="Próxima página"
                    >
                      ▶
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Admin Panel */}
          {isAdmin && (
            <section className={styles.leaderboardSection}>
              <aside className={styles.adminPanel} aria-label="Área administrativa">
                <h3 className={styles.adminTitle}>Administração</h3>
                <form
                  className={styles.adminForm}
                  onSubmit={(e) => { e.preventDefault(); console.log('Salvar pontuação'); }}
                >
                  <div className={styles.formRow}>
                    <input
                      type="text"
                      placeholder="Nome do participante"
                      className={styles.adminInput}
                    />
                    <input
                      type="number"
                      placeholder="Pontuação"
                      className={styles.adminInput}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <select defaultValue="badge" className={styles.adminSelect}>
                      <option value="badge">Badge</option>
                      <option value="moeda">Moedas</option>
                      <option value="certificado">Certificado</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Descrição da recompensa"
                      className={styles.adminInput}
                    />
                  </div>
                  <div className={styles.adminActions}>
                    <button type="submit" className={styles.btnPrimary}>
                      Salvar
                    </button>
                  </div>
                </form>
                <p className={styles.adminHint}>
                  Para exibir esta área: adicionar "?admin=1" à URL.
                </p>
              </aside>
            </section>
          )}
        </>
      )}
    </div>
  );
}
