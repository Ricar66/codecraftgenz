import React, { useEffect, useState } from 'react';

import { apiRequest } from '../../lib/apiConfig.js';

import styles from './MetricsSection.module.css';

const Metric = ({ label, target, suffix = '' }) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) { setValue(target); return; }
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
  const [metrics, setMetrics] = useState([
    { label: 'Projetos entregues', target: 0 },
    { label: 'Crafters ativos', target: 0 },
    { label: 'Apps publicados', target: 0 },
    { label: 'Mentores', target: 0 },
  ]);

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
          ? projetosList.filter(p => p.status === 'concluido' || p.status === 'entregue').length
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
