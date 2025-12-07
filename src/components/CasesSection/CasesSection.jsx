// src/components/CasesSection/CasesSection.jsx
import React from 'react';

import styles from './CasesSection.module.css';

const CaseCard = ({ title, client, summary, impact, tags = [] }) => (
  <article className={styles.caseCard}>
    <header className={styles.caseHeader}>
      <h3 className={styles.caseTitle}>{title}</h3>
      <span className={styles.caseClient}>{client}</span>
    </header>
    <p className={styles.caseSummary}>{summary}</p>
    <ul className={styles.caseImpact}>
      {impact.map((item, idx) => (<li key={idx}>{item}</li>))}
    </ul>
    <div className={styles.caseTags}>
      {tags.map((t, idx) => (<span className={styles.caseTag} key={idx}>{t}</span>))}
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
    <section className={styles.casesSection} aria-label="Cases e projetos">
      <header className={styles.casesHeader}>
        <h2 className={styles.casesTitle}>Cases</h2>
        <p className={styles.casesLead}>Projetos com impacto mensurável em clientes e comunidades.</p>
      </header>

      <div className={styles.casesGrid}>
        {cases.map((c, i) => (
          <CaseCard key={i} {...c} />
        ))}
      </div>
    </section>
  );
};

export default CasesSection;