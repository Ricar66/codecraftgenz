// src/components/CompanySection/CompanySection.jsx
import React from 'react';
import { motion } from 'framer-motion';

import styles from './CompanySection.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const fadeUpSpring = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 18 } },
};
const stagger = (s = 0.12) => ({ hidden: {}, visible: { transition: { staggerChildren: s } } });
const slideFromLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 80, damping: 18 } },
};

const values = [
  { icon: '⚙️', title: 'Inovação', text: 'Exploramos novas ideias e frameworks para soluções escaláveis.' },
  { icon: '🏅', title: 'Qualidade', text: 'Entrega com excelência, padrões e boas práticas.' },
  { icon: '💬', title: 'Comunidade', text: 'Compartilhamos conhecimento e aprendemos juntos.' },
  { icon: '🛡️', title: 'Segurança', text: 'Proteção de dados e compliance no centro da operação.' },
];

const services = [
  'Desenvolvimento web e mobile',
  'Arquitetura e cloud',
  'Data & AI',
  'Mentoria e capacitação',
];

const valueCardVariant = {
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 90, damping: 15 },
  },
};

const emojiVariant = {
  hidden: { scale: 0, rotate: -30 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 200, damping: 10, delay: 0.1 },
  },
};

const CompanySection = () => {
  return (
    <section className={styles.companySection} aria-label="Sobre a empresa">
      <motion.header
        className={styles.companyHeader}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger(0.15)}
      >
        <motion.h2 className={styles.companyTitle} variants={fadeUp}>
          Sobre a CodeCraft
        </motion.h2>
        <motion.p className={styles.companyLead} variants={fadeUp}>
          Tecnologia, criatividade e colaboração para acelerar resultados.
        </motion.p>
      </motion.header>

      <motion.div
        className={styles.valuesGrid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={stagger(0.1)}
      >
        {values.map((v) => (
          <motion.div
            key={v.title}
            className={styles.valueCard}
            variants={valueCardVariant}
            whileHover={{ y: -8, scale: 1.02, transition: { type: 'spring', stiffness: 250, damping: 15 } }}
          >
            <motion.div className={styles.valueIcon} aria-hidden="true" variants={emojiVariant}>
              {v.icon}
            </motion.div>
            <h3 className={styles.valueTitle}>{v.title}</h3>
            <p className={styles.valueText}>{v.text}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className={styles.services}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger(0.1)}
      >
        <motion.h3 className={styles.servicesTitle} variants={fadeUp}>Serviços</motion.h3>
        <ul className={styles.servicesList} aria-label="Serviços oferecidos">
          {services.map((s) => (
            <motion.li key={s} variants={slideFromLeft}>{s}</motion.li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        className={styles.cta}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger(0.15)}
      >
        <motion.a
          className={styles.ctaBtn}
          href="/mentoria"
          variants={fadeUpSpring}
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.97 }}
        >
          Conheça nossa mentoria
        </motion.a>
        <motion.a
          className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`}
          href="/projetos"
          variants={fadeUpSpring}
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.97 }}
        >
          Veja nossos projetos
        </motion.a>
      </motion.div>
    </section>
  );
};

export default CompanySection;
