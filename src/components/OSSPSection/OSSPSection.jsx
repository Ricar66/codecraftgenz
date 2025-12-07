// src/components/OSSPSection/OSSPSection.jsx
import React from 'react';
import { FiShield, FiFileText, FiUsers, FiSearch } from 'react-icons/fi';

import styles from './OSSPSection.module.css';

const OSSPSection = () => {
  return (
    <section className={styles.osspSection} aria-label="Programa OSSP - Open Source & Security Policy">
      <header className={styles.osspHeader}>
        <h2 className={styles.osspTitle}>Programa OSSP</h2>
        <p className={styles.osspSubtitle}>Open Source & Security Policy</p>
        <p className={styles.osspLead}>Nosso compromisso com software aberto, segurança e responsabilidade corporativa.</p>
      </header>

      <div className={styles.osspGrid}>
        <div className={styles.osspCard}>
          <div className={styles.osspIcon}>
            <FiShield size={24} aria-hidden="true" />
          </div>
          <h3 className={styles.osspCardTitle}>Segurança em Primeiro Lugar</h3>
          <p className={styles.osspCardText}>Monitoramento de CVEs, revisão de dependências, políticas de atualização e varreduras periódicas.</p>
        </div>
        <div className={styles.osspCard}>
          <div className={styles.osspIcon}>
            <FiFileText size={24} aria-hidden="true" />
          </div>
          <h3 className={styles.osspCardTitle}>Licenciamento</h3>
          <p className={styles.osspCardText}>Uso responsável de licenças (MIT, Apache 2.0, GPL compatíveis) e compliance em distribuição.</p>
        </div>
        <div className={styles.osspCard}>
          <div className={styles.osspIcon}>
            <FiUsers size={24} aria-hidden="true" />
          </div>
          <h3 className={styles.osspCardTitle}>Contribuição</h3>
          <p className={styles.osspCardText}>Participação ativa em projetos OSS, PRs de melhoria e respeito aos guias de contribuição.</p>
        </div>
        <div className={styles.osspCard}>
          <div className={styles.osspIcon}>
            <FiSearch size={24} aria-hidden="true" />
          </div>
          <h3 className={styles.osspCardTitle}>Auditoria</h3>
          <p className={styles.osspCardText}>Code reviews, trilhas de auditoria e governança técnica para garantir qualidade e transparência.</p>
        </div>
      </div>

      <div className={styles.osspFooter}>
        <a className={styles.osspLink} href="/README.md" target="_blank" rel="noopener noreferrer">
          Conheça nossas diretrizes
        </a>
      </div>
    </section>
  );
};

export default OSSPSection;
