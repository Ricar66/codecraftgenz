// src/pages/FeedbacksPage.jsx
// Feedback Page - Cyberpunk/Glassmorphism Design
import React from 'react';

import FeedbackForm from '../components/Feedbacks/FeedbackForm';
import Navbar from '../components/Navbar/Navbar';
import styles from './FeedbacksPage.module.css';

// Features data
const FEATURES = [
  {
    icon: '💬',
    title: 'Sua Voz Importa',
    description: 'Cada feedback nos ajuda a entender melhor suas necessidades e expectativas.',
  },
  {
    icon: '🚀',
    title: 'Melhoria Continua',
    description: 'Usamos suas sugestoes para aprimorar constantemente nossos produtos e servicos.',
  },
  {
    icon: '🤝',
    title: 'Construindo Juntos',
    description: 'Sua participacao e essencial para criarmos solucoes que realmente fazem a diferenca.',
  },
];

export default function FeedbacksPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          {/* Text Area */}
          <div className={styles.textArea}>
            <h1 className={styles.heroTitle}>Compartilhe Seu Feedback</h1>
            <p className={styles.heroDescription}>
              Sua opiniao e fundamental para nosso crescimento.
              Compartilhe sua experiencia e ajude-nos a criar solucoes ainda melhores.
            </p>
          </div>

          {/* Form Container */}
          <div className={styles.formContainer}>
            <FeedbackForm />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresGrid}>
          {FEATURES.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
