// src/pages/FeedbacksPage.jsx
// Feedback Page - Cyberpunk/Glassmorphism Design
import React, { useEffect } from 'react';

import FeedbackForm from '../components/Feedbacks/FeedbackForm';
import Navbar from '../components/Navbar/Navbar';
import { trackPageView, trackFunnelStep } from '../services/analyticsAPI.js';
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
    description: 'Usamos suas sugestões para aprimorar constantemente nossos produtos e serviços.',
  },
  {
    icon: '🤝',
    title: 'Construindo Juntos',
    description: 'Sua participação é essencial para criarmos soluções que realmente fazem a diferença.',
  },
];

export default function FeedbacksPage() {
  useEffect(() => {
    trackPageView('FeedbacksPage');
    trackFunnelStep('feedback_funnel', 'feedback_page_viewed', {});
  }, []);

  return (
    <div className={`${styles.page} starfield-bg`}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          {/* Text Area */}
          <div className={styles.textArea}>
            <h1 className={styles.heroTitle}>Compartilhe Seu Feedback</h1>
            <p className={styles.heroDescription}>
              Sua opinião é fundamental para nosso crescimento.
              Compartilhe sua experiência e ajude-nos a criar soluções ainda melhores.
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
