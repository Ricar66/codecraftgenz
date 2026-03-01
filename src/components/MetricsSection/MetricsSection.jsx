import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

import { apiRequest } from '../../lib/apiConfig.js';

import styles from './MetricsSection.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = (s = 0.12) => ({ hidden: {}, visible: { transition: { staggerChildren: s } } });

const Metric = ({ label, target, suffix = '', inView }) => {
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inView || target <= 0) { setValue(target); setDone(true); return; }
    setValue(0);
    setDone(false);
    const steps = 40;
    const increment = Math.max(1, Math.round(target / steps));
    const interval = setInterval(() => {
      setValue(v => {
        const next = v + increment;
        if (next >= target) { clearInterval(interval); setDone(true); return target; }
        return next;
      });
    }, 35);
    return () => clearInterval(interval);
  }, [target, inView]);

  return (
    <motion.div
      className={styles.metricCard}
      variants={{
        hidden: { opacity: 0, scale: 0.8, y: 30 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { type: 'spring', stiffness: 100, damping: 14 },
        },
      }}
      whileHover={{ y: -6, scale: 1.04, transition: { type: 'spring', stiffness: 250, damping: 15 } }}
    >
      <div className={`${styles.metricValue} ${done ? styles.metricDone : ''}`}>
        {value.toLocaleString('pt-BR')}{suffix}
      </div>
      <div className={styles.metricLabel}>{label}</div>
    </motion.div>
  );
};

const MetricsSection = () => {
  const [metrics, setMetrics] = useState([
    { label: 'Projetos entregues', target: 0 },
    { label: 'Crafters ativos', target: 0 },
    { label: 'Apps publicados', target: 0 },
    { label: 'Mentores', target: 0 },
  ]);

  const gridRef = useRef(null);
  const gridInView = useInView(gridRef, { amount: 0.2, once: true });

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [projetos, crafters, apps, mentores] = await Promise.all([
          apiRequest('/api/projetos').catch(() => null),
          apiRequest('/api/crafters').catch(() => null),
          apiRequest('/api/apps/public').catch(() => null),
          apiRequest('/api/mentores').catch(() => null),
        ]);

        const projetosList = projetos?.data || projetos || [];
        const craftersList = crafters?.data || crafters || [];
        const appsList = apps?.data || apps || [];
        const mentoresList = mentores?.data || mentores || [];

        const entregues = Array.isArray(projetosList)
          ? projetosList.filter(p => p.status === 'concluido' || p.status === 'entregue' || p.status === 'finalizado').length
          : 0;

        setMetrics([
          { label: 'Projetos entregues', target: entregues },
          { label: 'Crafters ativos', target: Array.isArray(craftersList) ? craftersList.length : 0 },
          { label: 'Apps publicados', target: Array.isArray(appsList) ? appsList.length : 0 },
          { label: 'Mentores', target: Array.isArray(mentoresList) ? mentoresList.length : 0 },
        ]);
      } catch (err) {
        console.error('Erro ao buscar métricas:', err);
      }
    }
    fetchMetrics();
  }, []);

  return (
    <section className={styles.metricsSection} aria-label="Métricas e resultados">
      <motion.header
        className={styles.metricsHeader}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger(0.15)}
      >
        <motion.h2 className={styles.metricsTitle} variants={fadeUp}>Nossas Métricas</motion.h2>
        <motion.p className={styles.metricsLead} variants={fadeUp}>
          Resultados que mostram nosso ritmo e impacto.
        </motion.p>
      </motion.header>

      <motion.div
        className={styles.metricsGrid}
        ref={gridRef}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={stagger(0.12)}
      >
        {metrics.map((m, i) => (
          <Metric key={i} label={m.label} target={m.target} inView={gridInView} />
        ))}
      </motion.div>
    </section>
  );
};

export default MetricsSection;
