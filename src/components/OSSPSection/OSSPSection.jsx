// src/components/OSSPSection/OSSPSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiFileText, FiUsers, FiSearch } from 'react-icons/fi';

import styles from './OSSPSection.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = (s = 0.12) => ({ hidden: {}, visible: { transition: { staggerChildren: s } } });
const tilt3DIn = {
  hidden: { opacity: 0, rotateX: 15, y: 30 },
  visible: { opacity: 1, rotateX: 0, y: 0, transition: { type: 'spring', stiffness: 70, damping: 16 } },
};

const cards = [
  { Icon: FiShield, title: 'Segurança em Primeiro Lugar', text: 'Monitoramento de CVEs, revisão de dependências, políticas de atualização e varreduras periódicas.' },
  { Icon: FiFileText, title: 'Licenciamento', text: 'Uso responsável de licenças (MIT, Apache 2.0, GPL compatíveis) e compliance em distribuição.' },
  { Icon: FiUsers, title: 'Contribuição', text: 'Participação ativa em projetos OSS, PRs de melhoria e respeito aos guias de contribuição.' },
  { Icon: FiSearch, title: 'Auditoria', text: 'Code reviews, trilhas de auditoria e governança técnica para garantir qualidade e transparência.' },
];

const iconSpinIn = {
  hidden: { opacity: 0, rotate: -90, scale: 0.5 },
  visible: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 150, damping: 12, delay: 0.15 },
  },
};

const OSSPSection = () => {
  return (
    <section className={styles.osspSection} aria-label="Programa OSSP - Open Source & Security Policy">
      <motion.header
        className={styles.osspHeader}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger(0.12)}
      >
        <motion.h2 className={styles.osspTitle} variants={fadeUp}>Programa OSSP</motion.h2>
        <motion.p className={styles.osspSubtitle} variants={fadeUp}>Open Source & Security Policy</motion.p>
        <motion.p className={styles.osspLead} variants={fadeUp}>
          Nosso compromisso com software aberto, segurança e responsabilidade corporativa.
        </motion.p>
      </motion.header>

      <motion.div
        className={styles.osspGrid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={stagger(0.12)}
      >
        {cards.map(({ Icon, title, text }) => (
          <motion.div
            key={title}
            className={styles.osspCard}
            variants={tilt3DIn}
            whileHover={{ y: -10, scale: 1.02, transition: { type: 'spring', stiffness: 250, damping: 15 } }}
          >
            <motion.div className={styles.osspIcon} variants={iconSpinIn}>
              <Icon size={24} aria-hidden="true" />
            </motion.div>
            <h3 className={styles.osspCardTitle}>{title}</h3>
            <p className={styles.osspCardText}>{text}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className={styles.osspFooter}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
      >
        <motion.a
          className={styles.osspLink}
          href="/README.md"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          Conheça nossas diretrizes
        </motion.a>
      </motion.div>
    </section>
  );
};

export default OSSPSection;
