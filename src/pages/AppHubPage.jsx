// src/pages/AppHubPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import AppCard from '../components/AppCard/AppCard.jsx';
import Navbar from '../components/Navbar/Navbar.jsx';
import { getAllApps } from '../services/appsAPI.js';
import { getAppImageUrl } from '../utils/appModel.js';
import { appsCache } from '../utils/dataCache.js';
import { sanitizeSrcSet } from '../utils/urlSanitize.js';

import styles from './AppHubPage.module.css';

/**
 * Página pública do Hub de Aplicativos
 * Exibe todos os aplicativos disponíveis para compra sem necessidade de autenticação
 */
const AppHubPage = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [fromCache, setFromCache] = useState(false);
  const [showCacheBadge, setShowCacheBadge] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    loadApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, sortOrder]);

  // Debounce para busca
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadApps = async () => {
    try {
      setLoading(true);
      const cacheKey = appsCache.generateKey('publicApps', { page, pageSize, sortBy, sortOrder });
      const cached = appsCache.get(cacheKey);
      if (cached) {
        setApps(cached);
        setFromCache(true);
        setShowCacheBadge(true);
        setTimeout(() => setShowCacheBadge(false), 2000);
        return;
      }

      const json = await getAllApps({ page, pageSize, sortBy, sortOrder });
      const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      setApps(list);
      appsCache.set(cacheKey, list);
      setFromCache(false);
      setShowCacheBadge(false);
    } catch (err) {
      setError('Erro ao carregar aplicativos');
      console.error('Erro ao carregar apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = apps.filter(app => {
    const matchesFilter = filter === 'all' || app.category === filter;
    const term = (debouncedSearch || '').toLowerCase();
    const matchesSearch = app.name.toLowerCase().includes(term) ||
                         (app.description || '').toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const categories = ['all', ...new Set(apps.map(app => app.category).filter(Boolean))];
  const featuredApps = React.useMemo(() => {
    const list = Array.isArray(apps) ? apps : [];
    const dateVal = (d) => {
      try { return d ? new Date(d).getTime() : 0; } catch { return 0; }
    };
    const priceVal = (p) => {
      const n = Number(p);
      return Number.isFinite(n) ? n : 0;
    };
    const isAvailable = (s) => ['available', 'ready', 'finalizado'].includes(String(s||'').toLowerCase());

    const pinned = list.filter(a => a.isFeatured).sort((a,b) => (dateVal(b.updatedAt) - dateVal(a.updatedAt)) || (priceVal(b.price) - priceVal(a.price)) || String(a.name||'').localeCompare(String(b.name||'')) );
    const avail = list.filter(a => !a.isFeatured && isAvailable(a.status)).sort((a,b) => (dateVal(b.updatedAt) - dateVal(a.updatedAt)) || (priceVal(b.price) - priceVal(a.price)) || String(a.name||'').localeCompare(String(b.name||'')) );
    const rest = list.filter(a => !a.isFeatured && !isAvailable(a.status)).sort((a,b) => (dateVal(b.updatedAt) - dateVal(a.updatedAt)) || (priceVal(b.price) - priceVal(a.price)) || String(a.name||'').localeCompare(String(b.name||'')) );
    return [...pinned, ...avail, ...rest].slice(0, 6);
  }, [apps]);

  // Slider controls
  const trackRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const resumeTimerRef = useRef(null);
  const intervalRef = useRef(null);
  const scrollToIndex = (i) => {
    const el = trackRef.current?.children?.[i];
    if (el && trackRef.current) {
      trackRef.current.scrollTo({ left: el.offsetLeft, behavior: 'smooth' });
      setCurrentSlide(i);
    }
  };
  const handlePrev = () => {
    const prev = currentSlide - 1 < 0 ? Math.max(0, (featuredApps.length || 1) - 1) : currentSlide - 1;
    scrollToIndex(prev);
    pauseAndScheduleResume();
  };
  const handleNext = () => {
    const next = currentSlide + 1 >= (featuredApps.length || 1) ? 0 : currentSlide + 1;
    scrollToIndex(next);
    pauseAndScheduleResume();
  };
  const handleScroll = () => {
    const tr = trackRef.current;
    if (!tr) return;
    const mid = tr.scrollLeft + tr.clientWidth / 2;
    const children = Array.from(tr.children || []);
    let best = 0; let bestDist = Infinity;
    children.forEach((c, i) => {
      const center = c.offsetLeft + c.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    setCurrentSlide(best);
    pauseAndScheduleResume();
  };

  const pauseAndScheduleResume = () => {
    setIsAutoPlay(false);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setIsAutoPlay(true), 5000);
  };
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      handlePrev();
      pauseAndScheduleResume();
    } else if (e.key === 'ArrowRight') {
      // Avança com loop no keydown para experiência fluida
      const next = currentSlide + 1 >= featuredApps.length ? 0 : currentSlide + 1;
      scrollToIndex(next);
      pauseAndScheduleResume();
    } else if (e.key === 'PageUp') {
      handlePrev();
      pauseAndScheduleResume();
    } else if (e.key === 'PageDown') {
      handleNext();
      pauseAndScheduleResume();
    } else if (e.key === 'Home') {
      scrollToIndex(0);
      pauseAndScheduleResume();
    } else if (e.key === 'End') {
      const last = Math.max(0, (featuredApps.length || 1) - 1);
      scrollToIndex(last);
      pauseAndScheduleResume();
    }
  };

  const handleMouseEnter = () => setIsAutoPlay(false);
  const handleMouseLeave = () => setIsAutoPlay(true);
  const handleFocus = () => setIsAutoPlay(false);
  const handleBlur = () => setIsAutoPlay(true);

  useEffect(() => {
    if (!isAutoPlay || (featuredApps?.length || 0) < 2) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      const next = currentSlide + 1 >= featuredApps.length ? 0 : currentSlide + 1;
      scrollToIndex(next);
    }, 4000);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [isAutoPlay, currentSlide, featuredApps]);

  if (loading) {
    return (
      <div className={styles.appHubPage}>
        <Navbar />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Carregando aplicativos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.appHubPage}>
        <Navbar />
        <div className={styles.errorContainer}>
          <h2>Erro ao carregar aplicativos</h2>
          <p>{error}</p>
          <button onClick={loadApps} className={styles.retryButton}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.appHubPage}>
      <Navbar />
      
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Hub de Aplicativos
          </h1>
          <p className={styles.heroSubtitle}>
            Descubra e adquira os melhores aplicativos para impulsionar seu negócio
          </p>
          
          {/* Search Bar */}
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Buscar aplicativos..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className={styles.searchInput}
            />
            <div className={styles.searchIcon}>🔍</div>
          </div>
        </div>
      </section>

      {/* Filter & Sort Section */}
      <section className={styles.filterSection}>
        <div className={styles.filterContainer}>
          <h3>Filtrar por Categoria</h3>
          <div className={styles.filterButtons}>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`${styles.filterButton} ${filter === category ? styles.active : ''}`}
              >
                {category === 'all' ? 'Todos' : category}
              </button>
            ))}
          </div>

          <div className={styles.sortControls}>
            <label>
              Ordenar por
              <select value={sortBy} onChange={(e) => { setPage(1); setSortBy(e.target.value); }} className={styles.filterButton}>
                <option value="name">Nome</option>
                <option value="price">Preço</option>
                <option value="updatedAt">Atualização</option>
              </select>
            </label>
            <label>
              Ordem
              <select value={sortOrder} onChange={(e) => { setPage(1); setSortOrder(e.target.value); }} className={styles.filterButton}>
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </label>
            <label>
              Página
              <input type="number" min={1} value={page} onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))} className={styles.pageInput} />
            </label>
            <label>
              Itens por página
              <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }} className={styles.filterButton}>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      {featuredApps.length > 0 && (
        <section className={styles.highlightsSection}>
          <div className={styles.highlightsHeader}>
            <h3>Destaques</h3>
            <p>Apps recomendados para você — populares e atualizados</p>
          </div>
          <div
            className={styles.highlightsViewport}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-roledescription="carousel"
            aria-label="Destaques"
          >
            <div ref={trackRef} className={styles.highlightsTrack} onScroll={handleScroll}>
              {featuredApps.map((app, i) => (
                <div key={app.id} className={styles.highlightCard}>
                  <img
                    className={styles.highlightMedia}
                    src={getAppImageUrl(app)}
                    alt={app.name ? `Destaque: ${app.name}` : 'Destaque do Hub'}
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                    fetchpriority={i === 0 ? 'high' : 'low'}
                    sizes="(max-width: 640px) 80vw, (max-width: 1024px) 50vw, 360px"
                    srcSet={(app.thumbnail && app.image)
                      ? sanitizeSrcSet(`${app.thumbnail} 480w, ${app.image} 800w, ${app.image} 1200w`)
                      : (app.image ? sanitizeSrcSet(`${app.image} 800w, ${app.image} 1200w`) : undefined)}
                  />
                  <div className={styles.highlightOverlay}>
                    <div className={styles.highlightInfo}>
                      <h4 className={styles.highlightTitle}>{app.name}</h4>
                      <p className={styles.highlightDesc}>{(app.description || app.mainFeature || '').slice(0, 120)}</p>
                    </div>
                    <div className={styles.highlightActions}>
                      <Link to={`/apps/${app.id}/compra`} className={styles.ctaPrimary}>Comprar Agora</Link>
                      <Link to={`/apps/${app.id}/compra`} className={styles.ctaSecondary}>Ver Detalhes</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className={`${styles.navButton} ${styles.prev}`} onClick={handlePrev} aria-label="Anterior">‹</button>
            <button type="button" className={`${styles.navButton} ${styles.next}`} onClick={handleNext} aria-label="Próximo">›</button>
            <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
              Destaque {currentSlide + 1} de {featuredApps.length}: {featuredApps[currentSlide]?.name || ''}
            </div>
          </div>
          <div className={styles.highlightsDots} role="tablist" aria-label="Navegação dos destaques">
            {featuredApps.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.dot} ${i === currentSlide ? styles.active : ''}`}
                aria-label={`Ir ao destaque ${i + 1}`}
                aria-selected={i === currentSlide}
                onClick={() => scrollToIndex(i)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Apps Grid */}
      <section className={styles.appsSection}>
        <div className={styles.container}>
          {filteredApps.length === 0 ? (
            <div className={styles.noResults}>
              <h3>Nenhum aplicativo encontrado</h3>
              <p>Tente ajustar os filtros ou termos de busca</p>
            </div>
          ) : (
            <>
              <div className={styles.resultsInfo}>
                <p>
                  {filteredApps.length} aplicativo(s) encontrado(s)
                  {showCacheBadge && (
                    <span style={{
                      marginLeft: 12,
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: 'rgba(0,228,242,0.15)',
                      border: '1px solid rgba(0,228,242,0.45)',
                      color: '#00E4F2',
                      fontSize: 12
                    }} title={fromCache ? 'Dados carregados do cache em memória' : ''}>
                      carregado do cache
                    </span>
                  )}
                </p>
              </div>
              
              <div className={styles.appsGrid}>
                {filteredApps.map(app => (
                  <div key={app.id} className={styles.cardWrap}>
                    <AppCard app={app} mode="public" />
                  </div>
                ))}
              </div>
              
              {/* Conteúdos adicionais (ex.: demo) podem ficar abaixo dos cards, se necessário */}
              {/*
                {filteredApps.map(app => (
                  app.demoUrl && (
                    <a 
                          href={app.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.demoButton}
                        >
                          Ver Demo
                      </a>
                    )
                ))}
              */}

              {/* Pagination Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={styles.filterButton}
                  style={{ opacity: page === 1 ? 0.5 : 1 }}
                >
                  Página anterior
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span>Página {page}</span>
                  <span>•</span>
                  <span>Itens carregados: {apps.length}</span>
                </div>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={apps.length < pageSize}
                  className={styles.filterButton}
                  style={{ opacity: apps.length < pageSize ? 0.5 : 1 }}
                >
                  Próxima página
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <h2>Precisa de um aplicativo personalizado?</h2>
          <p>Entre em contato conosco para desenvolver uma solução sob medida para seu negócio</p>
          <div className={styles.ctaButtons}>
            <Link to="/login" className={styles.ctaButtonPrimary}>
              Fazer Login
            </Link>
            <a href="mailto:contato@codecraft.com" className={styles.ctaButtonSecondary}>
              Entrar em Contato
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>&copy; 2024 CodeCraft Gen-Z. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default AppHubPage;