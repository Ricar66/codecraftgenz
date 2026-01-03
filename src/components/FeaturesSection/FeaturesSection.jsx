// src/components/FeaturesSection/FeaturesSection.jsx
import React from 'react';
import { FaTrophy, FaProjectDiagram, FaUsers, FaChartLine } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import styles from './FeaturesSection.module.css';

const FeaturesSection = () => {
  return (
    <section className={styles.featuresSection} aria-label="Recursos da plataforma" data-section="features">
      <div className={styles.container}>

        {/* Título da Seção (Fonte: Montserrat) */}
        <header>
          <h2 className={styles.title}>Explore a Plataforma CodeCraft</h2>
        </header>
        
        {/* Subtítulo da Seção (Fonte: Poppins) */}
        <p className={styles.subtitle}>
          Tudo que você precisa para conectar seu talento à inovação real.
        </p>

        {/* Grade de Recursos */}
        <div className={styles.featuresGrid}>

          {/* Card 1: Desafios */}
          <Link to="/desafios" className={styles.featureCard} style={{ textDecoration: 'none', display: 'block' }} aria-label="Ir para Desafios">
            <div className={styles.iconWrapper} aria-hidden="true">
              <FaTrophy />
            </div>
            <h3 className={styles.cardTitle}>Desafios</h3>
            <p className={styles.cardText}>
              Teste suas habilidades com desafios de código reais propostos por empresas parceiras.
            </p>
          </Link>

          {/* Card 2: Projetos */}
          <Link to="/projetos" className={styles.featureCard} style={{ textDecoration: 'none', display: 'block' }} aria-label="Ir para Projetos">
            <div className={styles.iconWrapper} aria-hidden="true">
              <FaProjectDiagram />
            </div>
            <h3 className={styles.cardTitle}>Projetos</h3>
            <p className={styles.cardText}>
              Construa portfólio participando de projetos open-source e squads de desenvolvimento.
            </p>
          </Link>

          {/* Card 3: Mentorias */}
          <Link to="/mentoria" className={styles.featureCard} style={{ textDecoration: 'none', display: 'block' }} aria-label="Ir para Mentorias">
            <div className={styles.iconWrapper} aria-hidden="true">
              <FaUsers />
            </div>
            <h3 className={styles.cardTitle}>Mentorias</h3>
            <p className={styles.cardText}>
              Conecte-se com profissionais experientes do mercado para acelerar sua jornada.
            </p>
          </Link>

          {/* Card 4: Ranking */}
          <Link to="/ranking" className={styles.featureCard} style={{ textDecoration: 'none', display: 'block' }} aria-label="Ir para Ranking">
            <div className={styles.iconWrapper} aria-hidden="true">
              <FaChartLine />
            </div>
            <h3 className={styles.cardTitle}>Ranking</h3>
            <p className={styles.cardText}>
              Gamifique seu aprendizado, ganhe pontos e se destaque para os recrutadores.
            </p>
          </Link>

        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;