// src/pages/AppHubPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import AppCard from '../components/AppCard/AppCard.jsx';
import Navbar from '../components/Navbar/Navbar.jsx';
import { getAllApps } from '../services/appsAPI.js';
import { appsCache } from '../utils/dataCache.js';

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

          <div className={styles.sortControls} style={{ marginTop: '1rem', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Ordenar por
              <select value={sortBy} onChange={(e) => { setPage(1); setSortBy(e.target.value); }} className={styles.filterButton} style={{ padding: '8px 12px' }}>
                <option value="name">Nome</option>
                <option value="price">Preço</option>
                <option value="updatedAt">Atualização</option>
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Ordem
              <select value={sortOrder} onChange={(e) => { setPage(1); setSortOrder(e.target.value); }} className={styles.filterButton} style={{ padding: '8px 12px' }}>
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Página
              <input type="number" min={1} value={page} onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))} style={{ padding: '8px 12px', width: '80px' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Itens por página
              <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }} className={styles.filterButton} style={{ padding: '8px 12px' }}>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </label>
          </div>
        </div>
      </section>

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
                  <AppCard key={app.id} app={app} mode="public" />
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