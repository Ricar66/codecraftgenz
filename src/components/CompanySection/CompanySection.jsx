// src/components/CompanySection/CompanySection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Cog, Award, MessageSquare, ShieldCheck, Code2, Cloud, BrainCircuit, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

import styles from './CompanySection.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const values = [
  { Icon: Cog, title: 'Inovação', text: 'Exploramos novas ideias e frameworks para soluções escaláveis.', color: '#818cf8' },
  { Icon: Award, title: 'Qualidade', text: 'Entrega com excelência, padrões e boas práticas de mercado.', color: '#34d399' },
  { Icon: MessageSquare, title: 'Comunidade', text: 'Compartilhamos conhecimento e crescemos juntos como equipe.', color: '#22d3ee' },
  { Icon: ShieldCheck, title: 'Segurança', text: 'Proteção de dados e compliance no centro de toda operação.', color: '#f472b6' },
];

const services = [
  { Icon: Code2, text: 'Desenvolvimento web e mobile' },
  { Icon: Cloud, text: 'Arquitetura e cloud' },
  { Icon: BrainCircuit, text: 'Data & AI' },
  { Icon: GraduationCap, text: 'Mentoria e capacitação' },
];

const CompanySection = () => {
  return (
    <section className={styles.section} aria-label="Sobre a empresa">
      <motion.header
        className={styles.header}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <motion.span className={styles.badge} variants={fadeUp}>Sobre nós</motion.span>
        <motion.h2 className={styles.title} variants={fadeUp}>
          Tecnologia e colaboração para acelerar resultados
        </motion.h2>
        <motion.p className={styles.lead} variants={fadeUp}>
          Somos uma equipe apaixonada por criar soluções de software modernas, escaláveis e com impacto real no mercado.
        </motion.p>
      </motion.header>

      {/* Valores */}
      <motion.div
        className={styles.valuesGrid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={stagger}
      >
        {values.map((v) => (
          <motion.div key={v.title} className={styles.valueCard} variants={fadeUp}>
            <div className={styles.valueIcon} style={{ color: v.color, background: `${v.color}12`, borderColor: `${v.color}25` }}>
              <v.Icon size={22} />
            </div>
            <h3 className={styles.valueTitle}>{v.title}</h3>
            <p className={styles.valueText}>{v.text}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Serviços */}
      <motion.div
        className={styles.servicesBlock}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <motion.h3 className={styles.servicesTitle} variants={fadeUp}>Nossos serviços</motion.h3>
        <div className={styles.servicesGrid}>
          {services.map((s) => (
            <motion.div key={s.text} className={styles.serviceItem} variants={fadeUp}>
              <s.Icon size={18} className={styles.serviceIcon} />
              <span>{s.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTAs */}
      <motion.div
        className={styles.cta}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
      >
        <motion.div variants={fadeUp}>
          <Link className={styles.ctaBtn} to="/mentoria">
            Conheça nossa mentoria
          </Link>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Link className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`} to="/projetos">
            Veja nossos projetos
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default CompanySection;
