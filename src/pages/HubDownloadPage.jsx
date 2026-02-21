// src/pages/HubDownloadPage.jsx
import React from 'react';
import { FaWindows, FaApple, FaLinux, FaDownload, FaShieldAlt, FaRocket, FaLayerGroup } from 'react-icons/fa';
import Navbar from '../components/Navbar/Navbar.jsx';
import styles from './HubDownloadPage.module.css';

const DOWNLOAD_URL = 'https://codecraftgenz-monorepo.onrender.com/api/downloads/CodeCraftHub_Setup.exe';

const features = [
  {
    icon: FaLayerGroup,
    title: 'Todos os seus apps',
    description: 'Veja todos os aplicativos CodeCraft em um só lugar. Apps comprados ficam liberados, os demais ficam disponíveis para compra.'
  },
  {
    icon: FaDownload,
    title: 'Download direto',
    description: 'Baixe e instale seus apps com um clique. Acompanhe o progresso do download em tempo real.'
  },
  {
    icon: FaRocket,
    title: 'Abra com um clique',
    description: 'Acesse seus apps instalados instantaneamente. O Hub detecta atualizações automaticamente.'
  },
  {
    icon: FaShieldAlt,
    title: 'Licença automática',
    description: 'Suas licenças são gerenciadas automaticamente. Faça login e todos os seus apps ficam disponíveis.'
  },
];

const HubDownloadPage = () => {
  return (
    <>
      <Navbar />
      <div className={styles.page}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.logoBadge}>
              <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="dl-logo-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#D12BF2" />
                    <stop offset="100%" stopColor="#9B1FD4" />
                  </linearGradient>
                  <linearGradient id="dl-logo-accent" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00E4F2" />
                    <stop offset="100%" stopColor="#00B4D8" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#dl-logo-bg)" />
                <path d="M24 20L12 32L24 44" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                <path d="M40 20L52 32L40 44" stroke="url(#dl-logo-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="32" cy="32" r="4" fill="white" opacity="0.95" />
                <circle cx="32" cy="32" r="7" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3" />
              </svg>
            </div>
            <h1 className={styles.title}>CodeCraft Hub</h1>
            <p className={styles.subtitle}>
              Seu launcher gratuito para todos os aplicativos CodeCraft GenZ.
              <br />
              Faça login, veja seus apps e gerencie tudo em um só lugar.
            </p>

            {/* Download Button */}
            <a
              href={DOWNLOAD_URL}
              className={styles.downloadButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaDownload />
              <span>Download Gratuito para Windows</span>
            </a>

            <p className={styles.versionInfo}>
              v1.0.0 &bull; Windows 10/11 &bull; ~5 MB
            </p>

            {/* Platform badges */}
            <div className={styles.platforms}>
              <span className={`${styles.platformBadge} ${styles.active}`}>
                <FaWindows /> Windows
              </span>
              <span className={styles.platformBadge}>
                <FaApple /> macOS <small>(em breve)</small>
              </span>
              <span className={styles.platformBadge}>
                <FaLinux /> Linux <small>(em breve)</small>
              </span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>Por que usar o CodeCraft Hub?</h2>
          <div className={styles.featureGrid}>
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <Icon />
                  </div>
                  <h3>{feat.title}</h3>
                  <p>{feat.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className={styles.howItWorks}>
          <h2 className={styles.sectionTitle}>Como funciona</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <h3>Baixe e instale</h3>
              <p>Baixe o instalador gratuito e instale em poucos segundos.</p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <h3>Faça login</h3>
              <p>Use sua conta CodeCraft GenZ ou crie uma nova gratuitamente.</p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <h3>Gerencie seus apps</h3>
              <p>Veja todos os apps disponíveis, baixe os que comprou e abra com um clique.</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default HubDownloadPage;
