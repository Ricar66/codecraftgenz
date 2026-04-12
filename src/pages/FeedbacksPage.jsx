// src/pages/FeedbacksPage.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';

import ChallengesSubNav from '../components/ChallengesSubNav/ChallengesSubNav.jsx';
import FeedbackShowcase from '../components/Feedbacks/FeedbackShowcase';
import Navbar from '../components/Navbar/Navbar';
import { apiRequest } from '../lib/apiConfig.js';

import styles from './FeedbacksPage.module.css';

export default function FeedbacksPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !mensagem.trim()) {
      setError('Nome e mensagem são obrigatórios.');
      return;
    }
    if (mensagem.trim().length < 10) {
      setError('A mensagem deve ter pelo menos 10 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiRequest('/api/feedbacks', {
        method: 'POST',
        body: JSON.stringify({ nome: nome.trim(), email: email.trim() || undefined, mensagem: mensagem.trim(), origem: 'pagina_feedback' }),
      });
      setSuccess(true);
      setNome('');
      setEmail('');
      setMensagem('');
    } catch (err) {
      setError(err?.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.page} starfield-bg`}>
      <Navbar />
      <ChallengesSubNav />

      {/* Depoimentos */}
      <FeedbackShowcase />

      {/* Formulário de depoimento */}
      <motion.section
        className={styles.formSection}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.formInner}>
          {success ? (
            <div className={styles.successBox}>
              <span className={styles.successIcon}>✅</span>
              <h3 className={styles.successTitle}>Depoimento enviado!</h3>
              <p className={styles.successDesc}>Obrigado por compartilhar sua experiência. Ele aparecerá em breve na plataforma.</p>
              <button className={styles.resetBtn} onClick={() => setSuccess(false)}>
                Enviar outro
              </button>
            </div>
          ) : (
            <>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Compartilhe sua experiência</h2>
                <p className={styles.formSubtitle}>Seu depoimento ajuda outros devs a conhecerem a plataforma.</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="fb-nome">Nome *</label>
                    <input
                      id="fb-nome"
                      className={styles.input}
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome"
                      required
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="fb-email">E-mail <span className={styles.optional}>(opcional)</span></label>
                    <input
                      id="fb-email"
                      className={styles.input}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="fb-mensagem">Mensagem *</label>
                  <textarea
                    id="fb-mensagem"
                    className={styles.textarea}
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Conte sua experiência com a plataforma..."
                    rows={4}
                    maxLength={500}
                    required
                  />
                  <span className={styles.charCount}>{mensagem.length}/500</span>
                </div>

                {error && <div className={styles.errorMsg} role="alert">{error}</div>}

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar depoimento'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.section>
    </div>
  );
}
