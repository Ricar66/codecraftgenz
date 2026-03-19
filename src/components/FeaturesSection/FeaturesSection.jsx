// src/components/FeaturesSection/FeaturesSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, GitBranch, Users, BarChart3, Rocket, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import styles from './FeaturesSection.module.css';

const features = [
  {
    to: '/desafios',
    Icon: Trophy,
    title: 'Desafios',
    text: 'Resolva problemas reais propostos por empresas e ganhe reconhecimento no mercado tech.',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.08)',
    border: 'rgba(234, 179, 8, 0.15)',
  },
  {
    to: '/projetos',
    Icon: GitBranch,
    title: 'Projetos',
    text: 'Contribua em projetos open-source e squads para construir um portfólio profissional.',
    color: '#818cf8',
    bg: 'rgba(129, 140, 248, 0.08)',
    border: 'rgba(129, 140, 248, 0.15)',
  },
  {
    to: '/mentoria',
    Icon: Users,
    title: 'Mentorias',
    text: 'Sessões 1:1 com profissionais seniores para acelerar sua carreira em tecnologia.',
    color: '#22d3ee',
    bg: 'rgba(34, 211, 238, 0.08)',
    border: 'rgba(34, 211, 238, 0.15)',
  },
  {
    to: '/ranking',
    Icon: BarChart3,
    title: 'Ranking',
    text: 'Gamifique seu aprendizado, conquiste badges e seja visto por recrutadores.',
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.08)',
    border: 'rgba(52, 211, 153, 0.15)',
  },
  {
    to: '/aplicativos',
    Icon: Rocket,
    title: 'Aplicativos',
    text: 'Apps desktop e mobile criados com as melhores práticas de engenharia de software.',
    color: '#fb923c',
    bg: 'rgba(251, 146, 60, 0.08)',
    border: 'rgba(251, 146, 60, 0.15)',
  },
  {
    to: '/feedback',
    Icon: MessageCircle,
    title: 'Feedbacks',
    text: 'Sua opinião molda o futuro da plataforma. Cada feedback conta para melhorarmos.',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.08)',
    border: 'rgba(167, 139, 250, 0.15)',
  },
];

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const FeaturesSection = () => {
  return (
    <section className={styles.featuresSection} aria-label="Recursos da plataforma" data-section="features">
      <div className={styles.container}>
        <motion.header
          className={styles.header}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.span className={styles.badge} variants={fadeUp}>Plataforma</motion.span>
          <motion.h2 className={styles.title} variants={fadeUp}>
            Tudo que você precisa em um só lugar
          </motion.h2>
          <motion.p className={styles.subtitle} variants={fadeUp}>
            Ferramentas, comunidade e oportunidades para conectar seu talento à inovação real.
          </motion.p>
        </motion.header>

        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          variants={stagger}
        >
          {features.map(({ to, Icon, title, text, color, bg, border }) => (
            <motion.div key={to} variants={cardVariant}>
              <Link to={to} className={styles.card}>
                <div
                  className={styles.iconBox}
                  style={{ background: bg, borderColor: border, color }}
                >
                  <Icon size={24} />
                </div>
                <h3 className={styles.cardTitle}>{title}</h3>
                <p className={styles.cardText}>{text}</p>
                <span className={styles.cardLink} style={{ color }}>
                  Explorar <span className={styles.arrow}>&rarr;</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
