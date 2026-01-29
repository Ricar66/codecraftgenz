// src/pages/MentoriaPage.jsx
// Mentoria Page - Cyberpunk/Glassmorphism Design
import React, { useEffect, useState, useCallback } from 'react';

import Navbar from '../components/Navbar/Navbar';
import { API_BASE_URL } from '../lib/apiConfig';
import { realtime } from '../lib/realtime';
import styles from './MentoriaPage.module.css';

// Feature cards data
const FEATURES = [
  {
    icon: '🎯',
    title: 'Mentoria Personalizada',
    description: 'Acompanhamento individual focado nos seus objetivos e desafios específicos.',
  },
  {
    icon: '🚀',
    title: 'Aceleração de Carreira',
    description: 'Desenvolva habilidades técnicas e soft skills essenciais para o mercado.',
  },
  {
    icon: '🤝',
    title: 'Network Exclusivo',
    description: 'Conecte-se com profissionais experientes e outros talentos em crescimento.',
  },
];

/**
 * Skeleton loader para cards de mentores
 */
const MentorSkeleton = () => (
  <article className={`${styles.mentorCard} ${styles.skeletonCard}`} aria-hidden="true">
    <div className={styles.avatarContainer}>
      <div className={`${styles.avatar} ${styles.skeletonAvatar}`} />
    </div>
    <div className={styles.mentorInfo}>
      <div className={styles.skeletonLine} style={{ width: '70%', height: '24px' }} />
      <div className={styles.skeletonLine} style={{ width: '50%', height: '18px', marginTop: '8px' }} />
      <div className={styles.skeletonLine} style={{ width: '90%', height: '16px', marginTop: '16px' }} />
      <div className={styles.skeletonLine} style={{ width: '80%', height: '16px', marginTop: '6px' }} />
    </div>
  </article>
);

/**
 * Componente de Card de Mentor
 */
const MentorCard = ({ mentor, buildWhatsapp, formatMonthYear }) => {
  const photo = mentor.avatar_url || mentor.photo;
  const name = mentor.name;
  const role = mentor.cargo || mentor.specialty;
  const specialty = mentor.specialty;
  const cargo = mentor.cargo;
  const phone = mentor.phone;
  const email = mentor.email;
  const bio = mentor.bio;
  const projectsCount = mentor.projects_count;
  const createdAt = mentor.created_at || mentor.createdAt;

  return (
    <article className={styles.mentorCard} aria-label={`Mentor ${name}`}>
      <div className={styles.avatarContainer}>
        <div className={styles.avatar}>
          {photo ? (
            <img
              src={photo}
              alt={`Foto de ${name}`}
              className={styles.avatarImage}
              loading="lazy"
              decoding="async"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>👤</div>
          )}
        </div>
      </div>

      <div className={styles.mentorInfo}>
        <div className={styles.mentorHeader}>
          <h3 className={styles.mentorName}>{name}</h3>
          {role && <p className={styles.mentorRole}>{role}</p>}
        </div>

        <div className={styles.chipContainer}>
          {specialty && (
            <span className={`${styles.chip} ${styles.chipSpecialty}`}>
              {specialty}
            </span>
          )}
          {cargo && cargo !== specialty && (
            <span className={`${styles.chip} ${styles.chipRole}`}>
              {cargo}
            </span>
          )}
        </div>

        <div className={styles.contactRow}>
          {phone && (
            <span className={styles.contactItem} title={phone}>
              📞 {phone}
            </span>
          )}
          {email && (
            <span className={styles.contactItem} title={email}>
              📧 {email}
            </span>
          )}
        </div>

        {bio && <p className={styles.bio}>{bio}</p>}

        <div className={styles.statsRow}>
          <span className={styles.statItem}>
            Projetos: {projectsCount ?? '—'}
          </span>
          {createdAt && (
            <span className={styles.statItem}>
              Mentor desde {formatMonthYear(createdAt)}
            </span>
          )}
        </div>

        <div className={styles.actionsRow}>
          {phone && (
            <a
              className={`${styles.btn} ${styles.btnWhatsapp}`}
              href={buildWhatsapp(phone)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir WhatsApp de ${name}`}
            >
              📱 WhatsApp
            </a>
          )}
          {email && (
            <a
              className={`${styles.btn} ${styles.btnEmail}`}
              href={`mailto:${email}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Enviar email para ${name}`}
            >
              ✉️ Email
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

/**
 * Página de Mentoria - Design Cyberpunk/Glassmorphism
 */
export default function MentoriaPage() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Normalize mentor data from API
  const normalizeMentor = useCallback((m) => ({
    ...m,
    photo: m.avatar_url || m.foto_url || m.photo || null,
    name: m.nome || m.name || '',
    phone: m.telefone || m.phone || '',
    specialty: m.especialidade || m.specialty || '',
    cargo: m.cargo || m.role || '',
    bio: m.bio || m.descricao || '',
    email: m.email || '',
    visible: m.visible !== undefined ? !!m.visible : true,
    createdAt: m.created_at || m.createdAt || null,
    updatedAt: m.updated_at || m.updatedAt || null,
    projects_count: m.projects_count || m.projetos_count || m.projectsCount || null,
  }), []);

  const fetchMentors = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mentores`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setMentors(list.map(normalizeMentor));
    } catch (error) {
      console.error('Erro ao carregar mentores:', error);
      setMentors([]);
    } finally {
      setLoading(false);
    }
  }, [normalizeMentor]);

  useEffect(() => {
    let isMounted = true;

    fetchMentors();

    const unsub = realtime.subscribe('mentors_changed', () => {
      if (isMounted) fetchMentors();
    });

    // Polling interval (60s default)
    const isTest = !!import.meta.env?.VITEST_WORKER_ID;
    const pollMs = Number(import.meta.env.VITE_MENTORS_POLL_MS || (isTest ? 0 : 60000));
    let iv = null;
    if (pollMs > 0) {
      iv = setInterval(() => {
        if (isMounted) fetchMentors();
      }, pollMs);
    }

    return () => {
      isMounted = false;
      unsub();
      if (iv) clearInterval(iv);
    };
  }, [fetchMentors]);

  // Helper functions
  const sanitizePhone = (raw) => String(raw || '').replace(/\D/g, '');

  const buildWhatsapp = (raw) => {
    const digits = sanitizePhone(raw);
    const hasCountry = digits.length > 11 && digits.startsWith('55');
    const withCountry = hasCountry ? digits : `55${digits}`;
    return `https://wa.me/${withCountry}`;
  };

  const formatMonthYear = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Mentoria CodeCraft</h1>
          <p className={styles.heroSubtitle}>
            Aprenda com quem já está construindo o futuro
          </p>
          <p className={styles.heroLead}>
            Nosso programa de mentoria conecta você a profissionais experientes
            que vão guiar sua jornada de crescimento técnico e profissional.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresGrid}>
          {FEATURES.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mentors Section */}
      <section className={styles.mentorsSection}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Nossos Mentores</h2>
          <p className={styles.sectionSubtitle}>
            Conheça os profissionais que fazem parte do nosso programa de mentoria
          </p>
        </header>

        <div className={styles.mentorsGrid} aria-busy={loading}>
          {loading && mentors.length === 0 && (
            <>
              <MentorSkeleton />
              <MentorSkeleton />
              <MentorSkeleton />
            </>
          )}

          {mentors.map((mentor) => (
            <MentorCard
              key={mentor.id || mentor.email || mentor.name}
              mentor={mentor}
              buildWhatsapp={buildWhatsapp}
              formatMonthYear={formatMonthYear}
            />
          ))}

          {!loading && mentors.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎓</div>
              <h3 className={styles.emptyTitle}>Em breve, novos mentores!</h3>
              <p className={styles.emptyText}>
                Estamos preparando uma equipe de profissionais inspiradores
                para guiar sua jornada. Volte em breve!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer Section */}
      <section className={styles.footerSection}>
        <div className={styles.footerCard}>
          <p className={styles.footerText}>
            A mentoria CodeCraft é um espaço de troca e aprendizado contínuo.
            Nossos mentores compartilham experiências reais de mercado,
            te ajudam a definir metas claras e a transformar ideias em projetos de impacto.
          </p>
        </div>
      </section>
    </div>
  );
}
