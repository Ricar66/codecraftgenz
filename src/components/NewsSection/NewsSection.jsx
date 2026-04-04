// src/components/NewsSection/NewsSection.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

import { apiRequest } from '../../lib/apiConfig.js';

import styles from './NewsSection.module.css';

const CATEGORY_LABELS = {
  all: 'Todas',
  dev: 'Desenvolvimento',
  ia: 'Inteligência Artificial',
  mercado: 'Mercado & Carreira',
  tech: 'Tecnologia',
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const NewsSection = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '6', page: String(page) });
        if (category !== 'all') params.append('category', category);
        const res = await apiRequest(`/api/noticias?${params.toString()}`);
        setArticles(res?.data || []);
        setTotalPages(res?.meta?.totalPages || 1);
      } catch {
        setArticles([]);
      }
      setLoading(false);
    };
    fetchNews();
  }, [category, page]);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setPage(1);
  };

  return (
    <section className={styles.section} aria-label="Notícias do Mercado Tech">
      <motion.div
        className={styles.header}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <motion.div className={styles.badge} variants={fadeUp}>
          <Newspaper size={14} /> NOTÍCIAS
        </motion.div>
        <motion.h2 className={styles.title} variants={fadeUp}>
          Mercado Tech & Dev
        </motion.h2>
        <motion.p className={styles.lead} variants={fadeUp}>
          Fique por dentro das últimas notícias sobre desenvolvimento, IA, mercado de trabalho e tecnologia.
        </motion.p>
      </motion.div>

      {/* Category filters */}
      <div className={styles.filters}>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`${styles.filterBtn} ${category === key ? styles.filterActive : ''}`}
            onClick={() => handleCategoryChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Articles grid */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
        </div>
      ) : articles.length === 0 ? (
        <div className={styles.emptyState}>Nenhuma notícia encontrada nesta categoria.</div>
      ) : (
        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          variants={stagger}
        >
          {articles.map((article) => (
            <motion.a
              key={article.id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
              variants={fadeUp}
            >
              {article.imageUrl && (
                <div className={styles.cardImage}>
                  <img src={article.imageUrl} alt="" loading="lazy" />
                </div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  <span className={styles.cardSource}>{article.source}</span>
                  <span className={styles.cardCategory}>{CATEGORY_LABELS[article.category] || article.category}</span>
                </div>
                <h3 className={styles.cardTitle}>{article.title}</h3>
                {article.summary && (
                  <p className={styles.cardSummary}>{article.summary.slice(0, 120)}...</p>
                )}
                <div className={styles.cardFooter}>
                  <span className={styles.cardTime}>
                    <Clock size={12} /> {timeAgo(article.publishedAt)}
                  </span>
                  <span className={styles.cardLink}>
                    Ler mais <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            </motion.a>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className={styles.pageInfo}>{page} / {totalPages}</span>
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Próximo <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
};

export default NewsSection;
