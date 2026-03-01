import React, { useState } from 'react';

import Navbar from '../components/Navbar/Navbar';
import { requestPasswordReset } from '../services/userAPI.js';
import styles from './ForgotPasswordPage.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devLink, setDevLink] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevLink('');
    setLoading(true);
    const res = await requestPasswordReset(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Falha ao solicitar reset');
    } else {
      setSuccess('Se o e-mail existir, enviaremos um link para redefinição.');
      if (res.resetLink) setDevLink(res.resetLink);
    }
  };

  return (
    <div className={`${styles.forgotPage} page-with-background`}>
      <Navbar />
      <section className={styles.sectionBlock}>
        <div className={styles.card}>
          <h1 className={styles.title}>Esqueci minha senha</h1>
          <p className={styles.subtitle}>Informe seu e-mail para receber o link de redefinição.</p>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.label}>E-mail</label>
            <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            {error && <div className={styles.error} role="alert">{error}</div>}
            {success && <div className={styles.success} role="status">{success}</div>}
            {devLink && <div className={styles.devlink} role="note">Link (dev): <a href={devLink}>{devLink}</a></div>}

            <button className={styles.btnPrimary} type="submit" disabled={loading}>
              {loading ? 'Processando...' : 'Enviar link'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
