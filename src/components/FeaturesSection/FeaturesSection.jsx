// src/components/FeaturesSection/FeaturesSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaProjectDiagram, FaUsers, FaChartLine, FaRocket, FaComments } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import styles from './FeaturesSection.module.css';

const features = [
  {
    to: '/desafios', Icon: FaTrophy, title: 'Desafios', accent: '#FFD700',
    text: 'Teste suas habilidades com desafios de código reais propostos por empresas parceiras.',
    backText: 'Resolva problemas reais, ganhe pontos e destaque-se no mercado tech.',
  },
  {
    to: '/projetos', Icon: FaProjectDiagram, title: 'Projetos', accent: '#D12BF2',
    text: 'Construa portfólio participando de projetos open-source e squads de desenvolvimento.',
    backText: 'Colabore em squads, contribua com código e construa seu portfólio profissional.',
  },
  {
    to: '/mentoria', Icon: FaUsers, title: 'Mentorias', accent: '#00E4F2',
    text: 'Conecte-se com profissionais experientes do mercado para acelerar sua jornada.',
    backText: 'Sessões 1:1 com mentores seniores para acelerar sua carreira em tech.',
  },
  {
    to: '/ranking', Icon: FaChartLine, title: 'Ranking', accent: '#10B981',
    text: 'Gamifique seu aprendizado, ganhe pontos e se destaque para os recrutadores.',
    backText: 'Suba no ranking, conquiste badges e seja visto por recrutadores top.',
  },
  {
    to: '/aplicativos', Icon: FaRocket, title: 'Aplicativos', accent: '#F97316',
    text: 'Explore ferramentas e soluções desenvolvidas pela comunidade CodeCraft.',
    backText: 'Apps desktop e mobile criados com as melhores práticas de engenharia.',
  },
  {
    to: '/feedback', Icon: FaComments, title: 'Feedbacks', accent: '#8B5CF6',
    text: 'Compartilhe sua experiência e ajude a melhorar nossa plataforma.',
    backText: 'Sua opinião molda o futuro da plataforma. Cada feedback conta!',
  },
];

const cardVariant = {
  hidden: { opacity: 0, y: 60, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 80, damping: 16 },
  },
};

const stagger015 = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } };
const stagger010 = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const FeaturesSection = () => {
  return (
    <section className={styles.featuresSection} aria-label="Recursos da plataforma" data-section="features">
      <div className={styles.container}>
        <motion.header
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger015}
        >
          <motion.h2 className={styles.title} variants={fadeUp}>
            Explore a Plataforma CodeCraft
          </motion.h2>
          <motion.p className={styles.subtitle} variants={fadeUp}>
            Tudo que você precisa para conectar seu talento à inovação real.
          </motion.p>
        </motion.header>

        <motion.div
          className={styles.featuresGrid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          variants={stagger010}
        >
          {features.map(({ to, Icon, title, text, backText, accent }) => (
            <motion.div key={to} className={styles.flipCard} variants={cardVariant}>
              <div className={styles.flipCardInner}>
                {/* FRENTE */}
                <div className={styles.flipFront}>
                  <div className={styles.iconWrapper} aria-hidden="true" style={{ color: accent }}>
                    <Icon />
                  </div>
                  <h3 className={styles.cardTitle}>{title}</h3>
                  <p className={styles.cardText}>{text}</p>
                </div>
                {/* VERSO */}
                <div className={styles.flipBack} style={{ '--accent': accent }}>
                  <div className={styles.backIcon} aria-hidden="true" style={{ color: accent }}>
                    <Icon />
                  </div>
                  <p className={styles.backText}>{backText}</p>
                  <Link to={to} className={styles.backCta} style={{ borderColor: accent, color: accent }}>
                    Explorar {title} →
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
