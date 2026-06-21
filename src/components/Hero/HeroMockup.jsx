// src/components/Hero/HeroMockup.jsx
// Mockup CSS-only de um dashboard rodando — usado no lado direito do Hero.
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Package, Activity, CheckCircle2 } from 'lucide-react';

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
            <span className={styles.urlText}>painel.suaempresa.com.br</span>
          </div>
        </div>

        <div className={styles.browserContent}>
          {/* Sidebar mini */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarLogo}>
              <div className={styles.logoMark} />
            </div>
            <div className={`${styles.navItem} ${styles.navActive}`} />
            <div className={styles.navItem} />
            <div className={styles.navItem} />
            <div className={styles.navItem} />
            <div className={styles.navItem} />
          </aside>

          {/* Main content */}
          <div className={styles.main}>
            {/* Header */}
            <div className={styles.contentHeader}>
              <div>
                <h4 className={styles.contentTitle}>Visão geral</h4>
                <p className={styles.contentSubtitle}>Resumo do mês</p>
              </div>
              <span className={styles.statusBadge}>
                <CheckCircle2 size={11} /> Atualizado
              </span>
            </div>

            {/* Stats cards */}
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
                  <TrendingUp size={14} />
                </div>
                <span className={styles.statLabel}>Faturamento</span>
                <span className={styles.statValue}>R$ 28.540</span>
                <span className={styles.statTrendUp}>+12,4%</span>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statIconCyan}`}>
                  <Users size={14} />
                </div>
                <span className={styles.statLabel}>Clientes</span>
                <span className={styles.statValue}>328</span>
                <span className={styles.statTrendUp}>+8,2%</span>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                  <Package size={14} />
                </div>
                <span className={styles.statLabel}>Pedidos</span>
                <span className={styles.statValue}>1.452</span>
                <span className={styles.statTrendUp}>+18,1%</span>
              </div>
            </div>

            {/* Chart mock — barras CSS */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <span className={styles.chartTitle}>
                  <Activity size={12} /> Crescimento semanal
                </span>
                <span className={styles.chartLegend}>últimas 8 semanas</span>
              </div>
              <div className={styles.bars}>
                {[35, 48, 42, 58, 65, 70, 78, 85].map((h, i) => (
                  <div key={i} className={styles.bar} style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
            </div>
          </div>
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
