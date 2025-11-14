// src/components/MetricsSection/MetricsSection.jsx
import React, { useEffect, useState } from 'react';

import { useAnalytics } from '../../hooks/useAnalytics.js';

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
    <div className="metric-card">
      <div className="metric-value">{value.toLocaleString('pt-BR')}{suffix}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
};

const MetricsSection = () => {
  const { getSessionStats } = useAnalytics();
  const stats = getSessionStats();

  // Valores demonstrativos; podem ser integrados com API real
  const metrics = [
    { label: 'Projetos entregues', target: 128 },
    { label: 'Crafters ativos', target: 56 },
    { label: 'Parceiros', target: 24 },
    { label: 'Eventos da sessão', target: stats.totalEvents || 5 },
  ];

  return (
    <section className="metrics-section" aria-label="Métricas e resultados">
      <header className="metrics-header">
        <h2 className="metrics-title">Nossas Métricas</h2>
        <p className="metrics-lead">Resultados que mostram nosso ritmo e impacto.</p>
      </header>

      <div className="metrics-grid">
        {metrics.map((m, i) => (
          <Metric key={i} label={m.label} target={m.target} />
        ))}
      </div>

      <style>{`
        .metrics-section { padding: 16px; }
        .metrics-header { text-align: center; margin-bottom: 12px; }
        .metrics-title { color: var(--texto-branco); margin: 0; font-size: clamp(1.6rem, 3vw, 2rem); }
        .metrics-lead { color: var(--texto-gelo); margin-top: 6px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        @media (max-width: 900px) { .metrics-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .metrics-grid { grid-template-columns: 1fr; } }
        .metric-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; text-align: center; }
        .metric-value { color: var(--texto-branco); font-weight: 800; font-size: clamp(1.4rem, 3vw, 2rem); }
        .metric-label { color: var(--texto-gelo); margin-top: 6px; }
      `}</style>
    </section>
  );
};

export default MetricsSection;