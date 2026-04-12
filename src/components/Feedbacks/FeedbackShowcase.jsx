// src/components/Feedbacks/FeedbackShowcase.jsx
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, Quote, ArrowRight } from 'lucide-react';

import { useLatestFeedbacks } from '../../hooks/useFeedbacks';
import styles from './FeedbackShowcase.module.css';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const FALLBACK = [
  {
    id: 'f1',
    text: 'A plataforma mudou minha carreira. Fiz os desafios, construí meu portfólio e em 3 meses recebi uma proposta de emprego. A comunidade é incrível.',
    author: 'Lucas Ferreira',
    role: 'Dev Frontend',
  },
  {
    id: 'f2',
    text: 'Nunca pensei que conseguiria entrar em um projeto real logo no começo. A CodeCraft me deu desafios práticos, feedback de devs experientes e visibilidade real.',
    author: 'Ana Clara Souza',
    role: 'Full Stack Dev',
  },
  {
    id: 'f3',
    text: 'O sistema de ranking me motivou a ir além do básico. Hoje tenho um portfólio sólido e uma rede de contatos que não teria em nenhum bootcamp tradicional.',
    author: 'Rafael Moura',
    role: 'Dev Backend',
  },
  {
    id: 'f4',
    text: 'Como empresa, encontramos aqui o que processos seletivos convencionais nunca entregaram: devs que já provaram que sabem trabalhar, com portfólio real.',
    author: 'Beatriz Lima',
    role: 'CTO · StartupBR',
  },
  {
    id: 'f5',
    text: 'A mentoria aqui é diferente. Não é aula gravada, é conversa real com quem está no mercado. Em duas sessões mudei completamente minha abordagem de arquitetura.',
    author: 'Thiago Andrade',
    role: 'Dev Sênior',
  },
  {
    id: 'f6',
    text: 'Aprendi mais em 2 meses de CodeCraft do que em 1 ano de tutoriais. Os desafios são duros do jeito certo — te forçam a pesquisar, errar e iterar de verdade.',
    author: 'Mariana Costa',
    role: 'Dev Mobile',
  },
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
  return (first + last).toUpperCase();
}

function parseItem(item) {
  let text = item.mensagem || '';
  let author = item.nome || 'Anônimo';
  if (typeof text === 'string' && text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.mensagem) text = parsed.mensagem;
      if (parsed.nome) author = parsed.nome;
    } catch {
      const nomeMatch = text.match(/"nome"\s*:\s*"([^"]+)"/);
      const msgMatch = text.match(/"mensagem"\s*:\s*"([^"]*)/);
      if (nomeMatch) author = nomeMatch[1];
      if (msgMatch) text = msgMatch[1];
    }
  }
  return { id: item.id, text, author, role: null };
}

const StarRating = () => (
  <div className={styles.stars} aria-label="5 estrelas">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={14} className={styles.star} fill="currentColor" />
    ))}
  </div>
);

const FeedbackCard = ({ item, index }) => (
  <motion.article
    className={styles.card}
    variants={cardVariant}
    aria-label={`Depoimento de ${item.author}`}
  >
    <div className={styles.cardTop}>
      <Quote size={28} className={styles.quoteIcon} aria-hidden="true" />
      <StarRating />
    </div>
    <p className={styles.cardText}>{item.text}</p>
    <div className={styles.cardAuthor}>
      <div className={styles.avatar} aria-hidden="true">
        {getInitials(item.author)}
      </div>
      <div className={styles.authorMeta}>
        <span className={styles.authorName}>{item.author}</span>
        {item.role && <span className={styles.authorRole}>{item.role}</span>}
      </div>
    </div>
  </motion.article>
);

const FeedbackShowcase = () => {
  const { items, loading } = useLatestFeedbacks();

  const feedbacks = useMemo(() => {
    if (items && items.length >= 3) {
      return items.slice(0, 6).map(parseItem);
    }
    return FALLBACK;
  }, [items]);

  return (
    <section className={styles.section} aria-label="Depoimentos">
      <div className={`${styles.inner} container`}>

        {/* Header */}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className={styles.badge}>Depoimentos</span>
          <h2 className={styles.title}>O que dizem os Crafters</h2>
          <p className={styles.subtitle}>
            Histórias reais de quem usou a plataforma para dar o próximo passo.
          </p>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className={styles.loadingGrid}>
            {[1, 2, 3].map(i => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : (
          <motion.div
            className={styles.grid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
          >
            {feedbacks.map((item, i) => (
              <FeedbackCard key={item.id} item={item} index={i} />
            ))}
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          className={styles.cta}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/desafios/feedbacks" className={styles.ctaLink}>
            Deixe seu depoimento <ArrowRight size={15} />
          </Link>
        </motion.div>

      </div>
    </section>
  );
};

export default FeedbackShowcase;
