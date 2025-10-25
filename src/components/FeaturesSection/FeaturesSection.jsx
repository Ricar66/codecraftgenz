// src/components/FeaturesSection/FeaturesSection.jsx
import React from 'react';
import { FaTrophy, FaProjectDiagram, FaUsers, FaChartLine } from 'react-icons/fa';

import styles from './FeaturesSection.module.css';

const FeaturesSection = () => {
  return (
    <section className={styles.featuresSection}>
      <div className={styles.container}>
        
        {/* Título da Seção (Fonte: Montserrat) */}
        <h2 className={styles.title}>Explore a Plataforma CodeCraft</h2>
        
        {/* Subtítulo da Seção (Fonte: Poppins) */}
        <p className={styles.subtitle}>
          Tudo que você precisa para conectar seu talento à inovação real[cite: 3].
        </p>

        {/* Grade de Recursos */}
        <div className={styles.featuresGrid}>

          {/* Card 1: Desafios */}
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}>
              <FaTrophy />
            </div>
            <h3 className={styles.cardTitle}>Desafios</h3>
            <p className={styles.cardText}>
              Teste suas habilidades com desafios de código reais propostos por empresas parceiras.
            </p>
          </div>

          {/* Card 2: Projetos */}
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}>
              <FaProjectDiagram />
            </div>
            <h3 className={styles.cardTitle}>Projetos</h3>
            <p className={styles.cardText}>
              Construa portfólio participando de projetos open-source e squads de desenvolvimento.
            </p>
          </div>

          {/* Card 3: Mentorias */}
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}>
              <FaUsers />
            </div>
            <h3 className={styles.cardTitle}>Mentorias</h3>
            <p className={styles.cardText}>
              Conecte-se com profissionais experientes do mercado para acelerar sua jornada.
            </p>
          </div>

          {/* Card 4: Ranking */}
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}>
              <FaChartLine />
            </div>
            <h3 className={styles.cardTitle}>Ranking</h3>
            <p className={styles.cardText}>
              Gamifique seu aprendizado, ganhe pontos e se destaque para os recrutadores.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;