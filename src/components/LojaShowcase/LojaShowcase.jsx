// src/components/LojaShowcase/LojaShowcase.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { QrCode, IdCard, Apple, Download, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

import styles from './LojaShowcase.module.css';

const apps = [
  {
    slug: 'qrcraft',
    name: 'QRCraft',
    tagline: 'Gerador de QR Code premium',
    description: 'Gere QR Codes personalizados com logo, cores, formatos e analytics. Para campanhas, cardápios, eventos e mais.',
    Icon: QrCode,
    badge: 'Grátis',
    badgeColor: '#22c55e',
    accent: '#22d3ee',
    accentBg: 'rgba(34, 211, 238, 0.10)',
    accentBorder: 'rgba(34, 211, 238, 0.28)',
    url: 'https://qr.craftcardgenz.com',
    external: true,
  },
  {
    slug: 'craftcard',
    name: 'CraftCard',
    tagline: 'Cartão digital profissional',
    description: 'Apresentação não é detalhe — é posicionamento. QR Code, portfólio, agendamento e analytics em um link.',
    Icon: IdCard,
    badge: 'Premium',
    badgeColor: '#D12BF2',
    accent: '#D12BF2',
    accentBg: 'rgba(209, 43, 242, 0.10)',
    accentBorder: 'rgba(209, 43, 242, 0.28)',
    url: 'https://craftcardgenz.com',
    external: true,
  },
  {
    slug: 'nutripro',
    name: 'NutriPro',
    tagline: 'Software para nutricionistas',
    description: 'Plataforma completa para consultórios de nutrição: anamnese, planos alimentares, evolução do paciente e mais.',
    Icon: Apple,
    badge: 'Profissional',
    badgeColor: '#34d399',
    accent: '#34d399',
    accentBg: 'rgba(52, 211, 153, 0.10)',
    accentBorder: 'rgba(52, 211, 153, 0.28)',
    url: 'https://nutripro.codecraftgenz.com.br',
    external: true,
  },
  {
    slug: 'codecrafthub',
    name: 'CodeCraft Hub',
    tagline: 'Launcher dos apps Craft',
    description: 'Hub desktop para baixar, atualizar e gerenciar todos os apps Craft no seu computador. Windows e Mac.',
    Icon: Download,
    badge: 'Desktop',
    badgeColor: '#fb923c',
    accent: '#fb923c',
    accentBg: 'rgba(251, 146, 60, 0.10)',
    accentBorder: 'rgba(251, 146, 60, 0.28)',
    internalPath: '/aplicativos',
    external: false,
  },
];

const cardVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const LojaShowcase = () => {
  return (
    <section className={styles.section} aria-label="Loja de aplicativos CodeCraft">
      <motion.header
        className={styles.header}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <motion.div className={styles.badge} variants={fadeUp}>
          <Sparkles size={14} /> NOSSA LOJA
        </motion.div>
        <motion.h2 className={styles.title} variants={fadeUp}>
          Apps que resolvem problemas reais
        </motion.h2>
        <motion.p className={styles.lead} variants={fadeUp}>
          Soluções prontas para uso — desenvolvidas pela CodeCraft Gen-Z, com suporte dedicado e atualizações contínuas.
        </motion.p>
      </motion.header>

      <motion.div
        className={styles.grid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={stagger}
      >
        {apps.map((app) => {
          const cardInner = (
            <>
              <div
                className={styles.iconWrap}
                style={{
                  color: app.accent,
                  background: app.accentBg,
                  borderColor: app.accentBorder,
                }}
              >
                <app.Icon size={32} />
              </div>
              <span
                className={styles.appBadge}
                style={{
                  color: app.badgeColor,
                  background: `${app.badgeColor}18`,
                  borderColor: `${app.badgeColor}40`,
                }}
              >
                {app.badge}
              </span>
              <h3 className={styles.appName}>{app.name}</h3>
              <p className={styles.appTagline}>{app.tagline}</p>
              <p className={styles.appDesc}>{app.description}</p>
              <span className={styles.cta} style={{ color: app.accent }}>
                {app.external ? (
                  <>Conhecer <ExternalLink size={14} /></>
                ) : (
                  <>Conhecer <ArrowRight size={14} /></>
                )}
              </span>
            </>
          );

          return (
            <motion.div key={app.slug} variants={cardVariant}>
              {app.external ? (
                <a
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.card}
                  style={{ '--app-accent': app.accent }}
                  aria-label={`Abrir ${app.name} em nova aba`}
                >
                  {cardInner}
                </a>
              ) : (
                <Link
                  to={app.internalPath}
                  className={styles.card}
                  style={{ '--app-accent': app.accent }}
                  aria-label={`Conhecer ${app.name}`}
                >
                  {cardInner}
                </Link>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      <div className={styles.footer}>
        <Link to="/aplicativos" className={styles.footerBtn}>
          Ver todos os aplicativos <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
};

export default LojaShowcase;
