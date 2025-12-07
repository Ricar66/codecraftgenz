// src/components/MetricsSection/MetricsSection.jsx
import React, { useEffect, useState } from 'react';

import { useAnalytics } from '../../hooks/useAnalytics.js';

import styles from './MetricsSection.module.css';

const Metric = ({ label, target, suffix = '' }) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const steps = 30;
    const increment = Math.max(1, Math.round(target / steps));
    const interval = setInterval(() => {
      setValue(v => {
        const next = v + increment;
        if (next >= target) { clearInterval(interval); return target; }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className={styles.metricCard}>
      <div className={styles.metricValue}>{value.toLocaleString('pt-BR')}{suffix}</div>
      <div className={styles.metricLabel}>{label}</div>
    </div>
  );
};

const MetricsSection = () => {
  const { getSessionStats } = useAnalytics();
  const stats = getSessionStats();

  // Valores demonstrativos; podem ser integrados com API real
  const metrics = [
    { label: 'Projetos entregues', target: 2 },
    { label: 'Crafters ativos', target: 3 },
    { label: 'Parceiros', target: 0 },
    { label: 'Eventos da sessão', target: stats.totalEvents || 5 },
  ];

  return (
    <section className={styles.metricsSection} aria-label="Métricas e resultados">
      <header className={styles.metricsHeader}>
        <h2 className={styles.metricsTitle}>Nossas Métricas</h2>
        <p className={styles.metricsLead}>Resultados que mostram nosso ritmo e impacto.</p>
      </header>

      <div className={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <Metric key={i} label={m.label} target={m.target} />
        ))}
      </div>
    </section>
  );
};

export default MetricsSection;
