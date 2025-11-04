// src/components/CasesSection/CasesSection.jsx
import React from 'react';

const CaseCard = ({ title, client, summary, impact, tags = [] }) => (
  <article className="case-card">
    <header className="case-header">
      <h3 className="case-title">{title}</h3>
      <span className="case-client">{client}</span>
    </header>
    <p className="case-summary">{summary}</p>
    <ul className="case-impact">
      {impact.map((item, idx) => (<li key={idx}>{item}</li>))}
    </ul>
    <div className="case-tags">
      {tags.map((t, idx) => (<span className="case-tag" key={idx}>{t}</span>))}
    </div>
  </article>
);

const CasesSection = () => {
  const cases = [
    {
      title: 'Plataforma de Engajamento OSS',
      client: 'Comunidade Tech',
      summary: 'Criamos uma plataforma para consolidar contribuição open-source com gamificação e ranking.',
      impact: ['+35% contribuições mensais', 'Tempo de onboarding -40%', 'Adoção por 3 comunidades'],
      tags: ['OSS', 'Gamificação', 'React', 'Node']
    },
    {
      title: 'Data Lake de Observabilidade',
      client: 'Fintech líder',
      summary: 'Arquitetamos pipeline de eventos com monitoramento e alertas para operações críticas.',
      impact: ['MTTR -50%', 'Alertas proativos', 'Auditoria completa'],
      tags: ['Cloud', 'Kafka', 'Observability', 'Security']
    },
    {
      title: 'Portal de Mentorias Tech',
      client: 'Parcerias Acadêmicas',
      summary: 'Portal responsivo com agenda, mentorias e trilhas de estudos conectando indústria e academia.',
      impact: ['+120 mentorias/semestre', 'Satisfação 4.8/5', 'Expansão para 5 cursos'],
      tags: ['Educação', 'UX', 'Acessibilidade']
    }
  ];

  return (
    <section className="cases-section" aria-label="Cases e projetos">
      <header className="cases-header">
        <h2 className="cases-title">Cases</h2>
        <p className="cases-lead">Projetos com impacto mensurável em clientes e comunidades.</p>
      </header>

      <div className="cases-grid">
        {cases.map((c, i) => (
          <CaseCard key={i} {...c} />
        ))}
      </div>

      <style>{`
        .cases-section { padding: 16px; }
        .cases-header { text-align: center; margin-bottom: 12px; }
        .cases-title { color: var(--texto-branco); margin: 0; font-size: clamp(1.6rem, 3vw, 2rem); }
        .cases-lead { color: var(--texto-gelo); margin-top: 6px; }
        .cases-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 900px) { .cases-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .cases-grid { grid-template-columns: 1fr; } }
        .case-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; }
        .case-header { display: flex; justify-content: space-between; align-items: baseline; }
        .case-title { color: var(--texto-branco); margin: 0; font-size: clamp(1.1rem, 2.5vw, 1.4rem); }
        .case-client { color: var(--texto-gelo); font-size: 0.9rem; }
        .case-summary { color: var(--texto-gelo); margin: 8px 0; }
        .case-impact { color: var(--texto-branco); padding-left: 18px; margin: 8px 0; }
        .case-impact li { margin: 4px 0; }
        .case-tags { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
        .case-tag { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); color: var(--texto-gelo); padding: 4px 8px; border-radius: 999px; font-size: 0.85rem; }
      `}</style>
    </section>
  );
};

export default CasesSection;