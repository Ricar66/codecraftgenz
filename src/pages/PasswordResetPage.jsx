// src/pages/PasswordResetPage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar';
import { confirmPasswordReset } from '../services/userAPI.js';
import styles from './PasswordResetPage.module.css';

export default function PasswordResetPage() {
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const t = params.get('token') || '';
    if (t) setToken(t);
  }, [location.search]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const res = await confirmPasswordReset({ token, newPassword });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Falha ao redefinir senha');
    } else {
      setSuccess(res.message || 'Senha redefinida com sucesso');
    }
  };

  return (
    <div className={`${styles.resetPage} page-with-background`}>
      <Navbar />
      <section className={styles.sectionBlock}>
        <div className={styles.card}>
          <h1 className={styles.title}>Redefinir Senha</h1>
          <p className={styles.subtitle}>Insira a nova senha para sua conta.</p>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.label}>Nova Senha</label>
            <input className={styles.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />

            <label className={styles.label}>Token</label>
            <input className={styles.input} type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Token do link recebido por e-mail" required />

            {error && <div className={styles.error} role="alert">{error}</div>}
            {success && <div className={styles.success} role="status">{success}</div>}

            <button className={styles.btnPrimary} type="submit" disabled={loading || !token}>
              {loading ? 'Processando...' : 'Redefinir Senha'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
