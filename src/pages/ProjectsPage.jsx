// src/pages/ProjectsPage.jsx
// Galeria Imersiva de Projetos - Cyberpunk/Glassmorphism Design
import React, { useState, useMemo } from 'react';

import Navbar from '../components/Navbar/Navbar';
import useProjects from '../hooks/useProjects';
import styles from './ProjectsPage.module.css';

// Categorias de filtro
const FILTER_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: '🌟' },
  { id: 'ongoing', label: 'Em Andamento', icon: '⚡' },
  { id: 'finalizado', label: 'Finalizados', icon: '✅' },
  { id: 'rascunho', label: 'Rascunhos', icon: '📝' },
];

// Retorna tecnologias do banco ou fallback para extração da descrição
const getTechBadges = (project) => {
  // Prioridade: tecnologias do banco de dados
  const dbTechs = project.tecnologias || project.tags || [];
  if (Array.isArray(dbTechs) && dbTechs.length > 0) {
    return dbTechs.slice(0, 3);
  }

  // Fallback: extrai tecnologias da descrição/nome
  const techs = [];
  const desc = (project.descricao || project.description || '').toLowerCase();
  const name = (project.nome || project.titulo || project.title || '').toLowerCase();

  if (desc.includes('react') || name.includes('react')) techs.push('React');
  if (desc.includes('node') || name.includes('node')) techs.push('Node.js');
  if (desc.includes('python') || name.includes('python')) techs.push('Python');
  if (desc.includes('typescript') || desc.includes('ts')) techs.push('TypeScript');
  if (desc.includes('.net') || desc.includes('c#') || desc.includes('csharp')) techs.push('.NET');
  if (desc.includes('api') || desc.includes('backend')) techs.push('API');
  if (desc.includes('mobile') || desc.includes('app')) techs.push('Mobile');
  if (desc.includes('ia') || desc.includes('ai') || desc.includes('inteligência')) techs.push('AI');
  if (desc.includes('windows') || desc.includes('desktop')) techs.push('Desktop');

  if (techs.length === 0) techs.push('Full-Stack');
  return techs.slice(0, 3);
};

// Determinar categoria do card para cor
const getCardCategory = (project) => {
  const desc = (project.descricao || project.description || '').toLowerCase();
  if (desc.includes('design') || desc.includes('ui') || desc.includes('ux')) return 'design';
  if (desc.includes('negócio') || desc.includes('business') || desc.includes('gestão')) return 'business';
  return 'tech';
};

// Componente de Card de Projeto
const ProjectCard = ({ project }) => {
  const status = (project.status || '').toLowerCase();
  const progress = project.progresso ?? project.progress ?? 0;
  const title = project.titulo || project.title || project.nome || 'Projeto';
  const description = project.descricao || project.description || '';
  const thumbnail = project.thumb_url || project.thumbUrl || null;
  const category = getCardCategory(project);
  const techs = getTechBadges(project);

  const getStatusClass = () => {
    if (status.includes('finalizado') || status.includes('completed')) return styles.statusCompleted;
    if (status.includes('ongoing') || status.includes('andamento')) return styles.statusOngoing;
    return styles.statusActive;
  };

  const getStatusLabel = () => {
    if (status.includes('finalizado') || status.includes('completed')) return 'Concluído';
    if (status.includes('ongoing') || status.includes('andamento')) return 'Em Andamento';
    if (status.includes('rascunho') || status.includes('draft')) return 'Rascunho';
    return 'Ativo';
  };

  return (
    <article className={styles.projectCard} data-category={category}>
      <div className={styles.cardImageContainer}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className={styles.cardImage}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className={styles.cardImage} style={{
            background: `linear-gradient(135deg, rgba(0, 228, 242, 0.2) 0%, rgba(209, 43, 242, 0.2) 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            color: 'rgba(255,255,255,0.3)'
          }}>
            🚀
          </div>
        )}
        <div className={styles.cardImageOverlay} />
        <span className={`${styles.cardStatus} ${getStatusClass()}`}>
          {getStatusLabel()}
        </span>
      </div>

      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardDescription}>{description || 'Projeto em desenvolvimento na CodeCraft.'}</p>

        <div className={styles.techBadges}>
          {techs.map((tech, idx) => (
            <span key={idx} className={styles.techBadge}>{tech}</span>
          ))}
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressLabel}>
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
};

/**
 * Página de Projetos - Galeria Imersiva
 */
const PROJECTS_PER_PAGE = 6;

const ProjectsPage = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const {
    projects,
    loading,
    stats,
    refetch
  } = useProjects({
    autoFetch: true,
    refetchInterval: 60000,
    timeout: 8000,
    maxRetries: 2,
    useAdminStore: false,
    publicOnly: false
  });

  // Filtrar projetos
  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    let filtered = projects.filter(p => {
      // Filtrar rascunhos na view pública
      const status = (p.status || '').toLowerCase();
      if (status.includes('rascunho') || status.includes('draft')) {
        return activeFilter === 'rascunho';
      }
      return true;
    });

    if (activeFilter !== 'all' && activeFilter !== 'rascunho') {
      filtered = filtered.filter(p => {
        const status = (p.status || '').toLowerCase();
        if (activeFilter === 'ongoing') return status.includes('ongoing') || status.includes('andamento') || status.includes('ativo');
        if (activeFilter === 'finalizado') return status.includes('finalizado') || status.includes('completed') || status.includes('concluído');
        return true;
      });
    }

    return filtered;
  }, [projects, activeFilter]);

  // Reset page when filter changes
  useEffect(() => { setCurrentPage(1); }, [activeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE
  );

  // Contagem por categoria
  const filterCounts = useMemo(() => {
    if (!projects) return {};
    return {
      all: projects.length,
      ongoing: projects.filter(p => {
        const s = (p.status || '').toLowerCase();
        return s.includes('ongoing') || s.includes('andamento') || s.includes('ativo');
      }).length,
      finalizado: projects.filter(p => {
        const s = (p.status || '').toLowerCase();
        return s.includes('finalizado') || s.includes('completed');
      }).length,
      rascunho: projects.filter(p => {
        const s = (p.status || '').toLowerCase();
        return s.includes('rascunho') || s.includes('draft');
      }).length,
    };
  }, [projects]);

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Nossos Projetos</h1>
          <p className={styles.heroSubtitle}>
            Explore os projetos que estamos desenvolvendo. Cada um representa nossa
            dedicação em criar soluções inovadoras e de alta qualidade.
          </p>
        </div>
      </section>

      {/* Filters Section */}
      <section className={styles.filtersSection}>
        <div className={styles.filtersContainer}>
          {FILTER_CATEGORIES.map((filter) => (
            <button
              key={filter.id}
              className={`${styles.filterPill} ${activeFilter === filter.id ? styles.filterPillActive : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
              {filterCounts[filter.id] > 0 && (
                <span className={styles.pillCount}>{filterCounts[filter.id]}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Stats Bar */}
      {stats && stats.total > 0 && (
        <section className={styles.filtersSection}>
          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.total}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.inProgress}</span>
              <span className={styles.statLabel}>Em Andamento</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.averageProgress}%</span>
              <span className={styles.statLabel}>Progresso Médio</span>
            </div>
          </div>
        </section>
      )}

      {/* Projects Grid */}
      <section className={styles.projectsSection}>
        {loading && projects.length === 0 ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <span className={styles.loadingText}>Carregando projetos...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📦</div>
            <h3 className={styles.emptyTitle}>Nenhum projeto encontrado</h3>
            <p className={styles.emptyText}>
              {activeFilter !== 'all'
                ? 'Tente outro filtro ou volte em breve para novidades.'
                : 'Volte em breve para conferir nossos projetos.'}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.projectsGrid}>
              {paginatedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={currentPage === 1}
                  className={styles.pageBtn}
                  aria-label="Página anterior"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`${styles.pageBtn} ${currentPage === page ? styles.pageBtnActive : ''}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={currentPage === totalPages}
                  className={styles.pageBtn}
                  aria-label="Próxima página"
                >
                  ›
                </button>
                <span className={styles.pageInfo}>
                  {(currentPage - 1) * PROJECTS_PER_PAGE + 1}–{Math.min(currentPage * PROJECTS_PER_PAGE, filteredProjects.length)} de {filteredProjects.length}
                </span>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default ProjectsPage;
