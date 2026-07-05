// src/components/Hero/HeroMockup.jsx
// Mockup realista de dashboard SaaS com animações — usado no lado direito do Hero.
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2 } from 'lucide-react';

import dashboardMockup from '../../assets/dashboard-mockup.png';
import styles from './HeroMockup.module.css';

export default function HeroMockup() {
  return (
    <motion.div
      className={styles.wrapper}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden="true"
    >
      {/* Browser window frame */}
      <div className={styles.browser}>
        <div className={styles.browserBar}>
          <span className={`${styles.dot} ${styles.dotRed}`} />
          <span className={`${styles.dot} ${styles.dotYellow}`} />
          <span className={`${styles.dot} ${styles.dotGreen}`} />
          <div className={styles.urlBar}>
            <span className={styles.urlLock}>🔒</span>
            <span className={styles.urlText}>painel.codecraftgenz.com.br</span>
          </div>
        </div>

        <div className={styles.browserContent}>
          <img
            src={dashboardMockup}
            alt="Dashboard Analítico CodeCraft Gen-Z"
            className={styles.dashboardImage}
            loading="eager"
          />
        </div>
      </div>

      {/* Floating mini badges (pulse) */}
      <div className={`${styles.floater} ${styles.floaterTop}`}>
        <CheckCircle2 size={14} /> Deploy concluído
      </div>
      <div className={`${styles.floater} ${styles.floaterBottom}`}>
        <Activity size={14} /> +24,6% conversão
      </div>
    </motion.div>
  );
}
