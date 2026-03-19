// src/components/OSSPSection/OSSPSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, Users, Search } from 'lucide-react';

import styles from './OSSPSection.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const cards = [
  { Icon: Shield, title: 'Segurança', text: 'Monitoramento de CVEs, revisão de dependências e varreduras periódicas.', color: '#34d399' },
  { Icon: FileText, title: 'Licenciamento', text: 'Uso responsável de licenças MIT, Apache 2.0 e GPL compatíveis.', color: '#818cf8' },
  { Icon: Users, title: 'Contribuição', text: 'Participação ativa em projetos OSS e respeito aos guias de contribuição.', color: '#22d3ee' },
  { Icon: Search, title: 'Auditoria', text: 'Code reviews, trilhas de auditoria e governança técnica transparente.', color: '#f472b6' },
];

const OSSPSection = () => {
  return (
    <section className={styles.section} aria-label="Programa OSSP">
      <motion.header
        className={styles.header}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <motion.span className={styles.badge} variants={fadeUp}>OSSP</motion.span>
        <motion.h2 className={styles.title} variants={fadeUp}>
          Open Source & Security Policy
        </motion.h2>
        <motion.p className={styles.lead} variants={fadeUp}>
          Nosso compromisso com software aberto, segurança e responsabilidade corporativa.
        </motion.p>
      </motion.header>

      <motion.div
        className={styles.grid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={stagger}
      >
        {cards.map(({ Icon, title, text, color }) => (
          <motion.div key={title} className={styles.card} variants={fadeUp}>
            <div className={styles.iconBox} style={{ color, background: `${color}12`, borderColor: `${color}25` }}>
              <Icon size={22} />
            </div>
            <h3 className={styles.cardTitle}>{title}</h3>
            <p className={styles.cardText}>{text}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default OSSPSection;
