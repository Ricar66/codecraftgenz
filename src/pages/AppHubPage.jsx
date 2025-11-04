// src/pages/AppHubPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar.jsx';
import { getAllApps } from '../services/appsAPI.js';

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

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const json = await getAllApps({ page: 1, pageSize: 50 });
      const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      setApps(list);
    } catch (err) {
      setError('Erro ao carregar aplicativos');
      console.error('Erro ao carregar apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = apps.filter(app => {
    const matchesFilter = filter === 'all' || app.category === filter;
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchTerm.toLowerCase());
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <div className={styles.searchIcon}>🔍</div>
          </div>
        </div>
      </section>

      {/* Filter Section */}
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
                <p>{filteredApps.length} aplicativo(s) encontrado(s)</p>
              </div>
              
              <div className={styles.appsGrid}>
                {filteredApps.map(app => (
                  <div key={app.id} className={styles.appCard}>
                    <div className={styles.appImage}>
                      {app.image ? (
                        <img src={app.image} alt={app.name} />
                      ) : (
                        <div className={styles.appPlaceholder}>
                          📱
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.appContent}>
                      <h3 className={styles.appName}>{app.name}</h3>
                      <p className={styles.appDescription}>
                        {app.description || 'Sem descrição disponível'}
                      </p>
                      
                      <div className={styles.appMeta}>
                        {app.category && (
                          <span className={styles.appCategory}>
                            {app.category}
                          </span>
                        )}
                        {app.price && (
                          <span className={styles.appPrice}>
                            R$ {app.price}
                          </span>
                        )}
                      </div>
                      
                      <div className={styles.appActions}>
                        <Link 
                          to={`/apps/${app.id}/compra`}
                          className={styles.buyButton}
                        >
                          Comprar Agora
                        </Link>
                        
                        {app.demoUrl && (
                          <a 
                            href={app.demoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.demoButton}
                          >
                            Ver Demo
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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