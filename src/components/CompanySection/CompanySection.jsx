// src/components/CompanySection/CompanySection.jsx
import React from 'react';

import logoCodeCraft from '../../assets/logo-principal.png';

import styles from './CompanySection.module.css';

const CompanySection = () => {
  return (
    <section className={styles.companySection} aria-label="Sobre a empresa">
      <header className={styles.companyHeader}>
        <h2 className={styles.companyTitle}>Sobre a CodeCraft</h2>
        <p className={styles.companyLead}>Tecnologia, criatividade e colaboração para acelerar resultados.</p>
      </header>

      <div className={styles.valuesGrid}>
        <div className={styles.valueCard}>
          <div className={styles.valueIcon} aria-hidden="true">⚙️</div>
          <h3 className={styles.valueTitle}>Inovação</h3>
          <p className={styles.valueText}>Exploramos novas ideias e frameworks para soluções escaláveis.</p>
        </div>
        <div className={styles.valueCard}>
          <div className={styles.valueIcon} aria-hidden="true">🏅</div>
          <h3 className={styles.valueTitle}>Qualidade</h3>
          <p className={styles.valueText}>Entrega com excelência, padrões e boas práticas.</p>
        </div>
        <div className={styles.valueCard}>
          <div className={styles.valueIcon} aria-hidden="true">💬</div>
          <h3 className={styles.valueTitle}>Comunidade</h3>
          <p className={styles.valueText}>Compartilhamos conhecimento e aprendemos juntos.</p>
        </div>
        <div className={styles.valueCard}>
          <div className={styles.valueIcon} aria-hidden="true">🛡️</div>
          <h3 className={styles.valueTitle}>Segurança</h3>
          <p className={styles.valueText}>Proteção de dados e compliance no centro da operação.</p>
        </div>
      </div>

      <div className={styles.services}>
        <h3 className={styles.servicesTitle}>Serviços</h3>
        <ul className={styles.servicesList} aria-label="Serviços oferecidos">
          <li>Desenvolvimento web e mobile</li>
          <li>Arquitetura e cloud</li>
          <li>Data & AI</li>
          <li>Mentoria e capacitação</li>
        </ul>
      </div>

      <div className={styles.partners}>
        <h3 className={styles.partnersTitle}>Parceiros e Clientes</h3>
        <div className={styles.partnersRow} role="list">
          <div role="listitem" className={styles.partnerItem}>
            <img src={logoCodeCraft} alt="Parceiro" />
          </div>
          <div role="listitem" className={styles.partnerItem}>
            <img src={logoCodeCraft} alt="Parceiro" />
          </div>
          <div role="listitem" className={styles.partnerItem}>
            <img src={logoCodeCraft} alt="Parceiro" />
          </div>
          <div role="listitem" className={styles.partnerItem}>
            <img src={logoCodeCraft} alt="Parceiro" />
          </div>
        </div>
      </div>

      <div className={styles.cta}>
        <a className={styles.ctaBtn} href="/mentoria">Conheça nossa mentoria</a>
        <a className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`} href="/projetos">Veja nossos projetos</a>
      </div>
    </section>
  );
};

export default CompanySection;