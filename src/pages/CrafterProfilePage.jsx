// src/pages/CrafterProfilePage.jsx
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar';
import { getCrafterById } from '../services/rankingAPI.js';

import styles from './CrafterProfilePage.module.css';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseSkills(crafter) {
  if (Array.isArray(crafter.skills)) return crafter.skills;
  if (crafter.skillsJson) {
    try {
      const parsed = JSON.parse(crafter.skillsJson);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return [];
}

function normalizeCrafter(resp) {
  // Response may be { success, data: {...} } or flat
  const raw = resp?.data && typeof resp.data === 'object' ? resp.data : resp;
  return raw;
}

function LoadingSkeleton() {
  return (
    <div className={styles.skeletonWrap}>
      <div className={styles.skeletonBlock} style={{ width: 96, height: 96, borderRadius: '50%', margin: '0 auto 24px' }} />
      <div className={styles.skeletonBlock} style={{ width: '60%', height: 32, margin: '0 auto 16px' }} />
      <div className={styles.skeletonBlock} style={{ width: '80%', height: 20, margin: '0 auto 12px' }} />
      <div className={styles.skeletonBlock} style={{ width: '40%', height: 20, margin: '0 auto' }} />
    </div>
  );
}

export default function CrafterProfilePage() {
  const { id } = useParams();
  const [crafter, setCrafter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchCrafter() {
      try {
        setLoading(true);
        setError('');
        const resp = await getCrafterById(id);
        if (cancelled) return;
        const data = normalizeCrafter(resp);
        if (!data || (!data.id && !data.nome)) {
          setError('not_found');
        } else {
          setCrafter(data);
        }
      } catch {
        if (!cancelled) setError('not_found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCrafter();
    return () => { cancelled = true; };
  }, [id]);

  const skills = crafter ? parseSkills(crafter) : [];
  const pontos = crafter?.pontos ?? crafter?.points ?? 0;
  const equipeNome = crafter?.equipe?.nome || null;
  const githubUrl = crafter?.githubUrl || crafter?.github_url || '';
  const linkedinUrl = crafter?.linkedinUrl || crafter?.linkedin_url || '';
  const areaInteresse = crafter?.area_interesse || crafter?.area || '';
  const avatarUrl = crafter?.avatarUrl || crafter?.avatar_url || '';

  return (
    <div className={`${styles.page} starfield-bg`}>
      <Navbar />

      {/* Back Nav */}
      <nav className={styles.backNav}>
        <Link to="/desafios/ranking" className={styles.backLink}>
          ← Voltar ao Ranking
        </Link>
      </nav>

      {loading && (
        <section className={styles.hero}>
          <LoadingSkeleton />
        </section>
      )}

      {!loading && error && (
        <section className={styles.notFound}>
          <div className={styles.notFoundIcon}>🔍</div>
          <h2 className={styles.notFoundTitle}>Crafter não encontrado</h2>
          <p className={styles.notFoundText}>
            Este perfil não existe ou não está disponível.
          </p>
          <Link to="/desafios/ranking" className={styles.backBtn}>
            Voltar ao Ranking
          </Link>
        </section>
      )}

      {!loading && !error && crafter && (
        <>
          {/* Profile Hero */}
          <motion.section
            className={styles.hero}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.heroInner}>
              {/* Avatar */}
              <div className={styles.avatarWrap}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={crafter.nome || 'Crafter'}
                    className={styles.avatarImg}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span className={styles.avatarInitials}>
                    {getInitials(crafter.nome)}
                  </span>
                )}
              </div>

              {/* Name */}
              <h1 className={styles.name}>{crafter.nome || 'Crafter'}</h1>

              {/* Badges row */}
              <div className={styles.badgesRow}>
                {equipeNome && (
                  <span className={styles.teamBadge}>
                    {equipeNome}
                  </span>
                )}
                <span className={styles.pointsBadge}>
                  ⭐ {pontos} pts
                </span>
              </div>

              {/* Bio */}
              {crafter.bio && (
                <p className={styles.bio}>{crafter.bio}</p>
              )}
            </div>
          </motion.section>

          {/* Skills Section */}
          {(skills.length > 0 || areaInteresse) && (
            <motion.section
              className={styles.skillsSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className={styles.sectionInner}>
                <h2 className={styles.sectionTitle}>Skills</h2>
                <div className={styles.skillsGrid}>
                  {areaInteresse && (
                    <span className={styles.areaInteresseBadge}>
                      {areaInteresse}
                    </span>
                  )}
                  {skills.map((skill, i) => (
                    <span key={i} className={styles.skillPill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {/* Stats Row */}
          <motion.section
            className={styles.statsSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className={styles.sectionInner}>
              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{pontos}</span>
                  <span className={styles.statLabel}>Pontos</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{areaInteresse || '—'}</span>
                  <span className={styles.statLabel}>Área</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{equipeNome || 'Independente'}</span>
                  <span className={styles.statLabel}>Equipe</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Social Links */}
          {(githubUrl || linkedinUrl) && (
            <motion.section
              className={styles.socialSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className={styles.sectionInner}>
                <div className={styles.socialLinks}>
                  {githubUrl && (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialBtn}
                    >
                      <ExternalLink size={16} />
                      GitHub
                    </a>
                  )}
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.socialBtn} ${styles.socialBtnLinkedin}`}
                    >
                      <ExternalLink size={16} />
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* CTA Section */}
          <motion.section
            className={styles.ctaSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className={styles.sectionInner}>
              <div className={styles.ctaButtons}>
                <Link to="/desafios" className={styles.ctaBtnPrimary}>
                  Ver desafios
                </Link>
                <Link to="/register" className={styles.ctaBtnSecondary}>
                  Quero ser Crafter
                </Link>
              </div>
            </div>
          </motion.section>
        </>
      )}
    </div>
  );
}
