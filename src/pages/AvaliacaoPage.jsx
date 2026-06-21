// src/pages/AvaliacaoPage.jsx
import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Star, ArrowLeft, Send, CheckCircle2, MessageSquareHeart } from 'lucide-react';

import Navbar from '../components/Navbar/Navbar.jsx';
import Footer from '../components/Footer/Footer.jsx';
import { useToast } from '../components/UI/Toast';
import { submitReview, REVIEW_TIPOS } from '../services/reviewAPI.js';

import styles from './AvaliacaoPage.module.css';

export default function AvaliacaoPage() {
  const toast = useToast();
  const [params] = useSearchParams();
  const ref = params.get('ref') || 'direto';

  const [form, setForm] = useState({
    nome: '',
    email: '',
    tipo: 'elogio',
    nota: 5,
    mensagem: '',
    website: '', // honeypot
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const charCount = useMemo(() => form.mensagem.length, [form.mensagem]);
  const charMax = 1000;

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await submitReview({
        nome: form.nome,
        email: form.email,
        tipo: form.tipo,
        nota: form.nota,
        mensagem: form.mensagem,
        ref,
        honeypot: form.website,
      });
      setSent(true);
      toast.success('Obrigado pela sua avaliação! 🙏');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${styles.page} starfield-bg`}>
      <Helmet>
        <title>Avalie a CodeCraft Gen-Z | Sua opinião nos ajuda a melhorar</title>
        <meta name="description" content="Deixe sua opinião, sugestão ou crítica sobre o site da CodeCraft Gen-Z. Leva um minuto e a gente lê tudo." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <Navbar />

      <main className={styles.main}>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar à página inicial
        </Link>

        {sent ? (
          <motion.div
            className={styles.successBox}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.successIcon}>
              <CheckCircle2 size={48} />
            </div>
            <h1 className={styles.successTitle}>Avaliação enviada!</h1>
            <p className={styles.successText}>
              Muito obrigado por dedicar seu tempo. Toda opinião conta — vamos ler e considerar com carinho.
            </p>
            <div className={styles.successActions}>
              <Link to="/" className={styles.btnPrimary}>Voltar ao site</Link>
              <button
                className={styles.btnSecondary}
                onClick={() => { setSent(false); setForm({ nome: '', email: '', tipo: 'elogio', nota: 5, mensagem: '', website: '' }); }}
              >
                Enviar outra avaliação
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <MessageSquareHeart size={28} />
              </div>
              <h1 className={styles.title}>O que você achou da nossa página?</h1>
              <p className={styles.lead}>
                Sua opinião nos ajuda a deixar a CodeCraft melhor. Pode ser elogio, sugestão, dúvida ou reclamação — manda ver.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {/* Honeypot */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                className={styles.honeypot}
                aria-hidden="true"
              />

              {/* Tipo */}
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Tipo de avaliação *</legend>
                <div className={styles.tipoGrid}>
                  {REVIEW_TIPOS.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      className={`${styles.tipoBtn} ${form.tipo === t.value ? styles.tipoBtnActive : ''}`}
                      onClick={() => set('tipo', t.value)}
                    >
                      <span className={styles.tipoEmoji}>{t.emoji}</span>
                      <span className={styles.tipoLabel}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Nota (estrelas) */}
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Como você avalia o site? *</legend>
                <div className={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={styles.starBtn}
                      onClick={() => set('nota', n)}
                      aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={32}
                        className={n <= form.nota ? styles.starFilled : styles.starEmpty}
                        fill={n <= form.nota ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                  <span className={styles.notaLabel}>{form.nota}/5</span>
                </div>
              </fieldset>

              {/* Mensagem */}
              <div className={styles.field}>
                <label htmlFor="mensagem" className={styles.label}>Sua mensagem *</label>
                <textarea
                  id="mensagem"
                  className={styles.textarea}
                  value={form.mensagem}
                  onChange={(e) => set('mensagem', e.target.value.slice(0, charMax))}
                  rows={5}
                  placeholder="Conte o que achou, o que faltou, o que adorou…"
                  required
                />
                <div className={styles.charCount}>{charCount}/{charMax}</div>
              </div>

              {/* Nome (opcional) */}
              <div className={styles.field}>
                <label htmlFor="nome" className={styles.label}>Seu nome <span className={styles.optional}>(opcional)</span></label>
                <input
                  id="nome"
                  type="text"
                  className={styles.input}
                  value={form.nome}
                  onChange={(e) => set('nome', e.target.value)}
                  maxLength={120}
                />
              </div>

              {/* Email (opcional) */}
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email <span className={styles.optional}>(opcional, se quiser resposta)</span></label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  maxLength={180}
                  placeholder="seu@email.com"
                />
              </div>

              <button
                type="submit"
                className={styles.submit}
                disabled={loading || charCount < 5}
              >
                {loading ? 'Enviando…' : (<><Send size={16} /> Enviar avaliação</>)}
              </button>

              <p className={styles.disclaimer}>
                Lemos cada mensagem. Email e nome são opcionais — não compartilhamos com ninguém.
              </p>
            </form>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
