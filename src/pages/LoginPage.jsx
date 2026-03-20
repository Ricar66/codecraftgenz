// src/pages/LoginPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

import logoImg from '../assets/logo-principal.png';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth';
import styles from './LoginPage.module.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleResponse = useCallback(async (response) => {
    if (!response?.credential) return;
    setError('');
    setGoogleLoading(true);
    const res = await loginWithGoogle(response.credential);
    setGoogleLoading(false);
    if (!res.ok) setError(res.error);
  }, [loginWithGoogle]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts?.id?.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      window.google?.accounts?.id?.renderButton(
        document.getElementById('google-signin-btn'),
        {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: '100%',
          locale: 'pt-BR',
        }
      );
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [handleGoogleResponse]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <div className={`${styles.page} starfield-bg`}>
      <Navbar />

      <div className={styles.wrapper}>
        <div className={styles.card}>
          <header className={styles.header}>
            <img src={logoImg} alt="CodeCraft" className={styles.logo} />
            <h1 className={styles.title}>Entrar na plataforma</h1>
            <p className={styles.subtitle}>Acesse sua conta CodeCraft</p>
          </header>

          <form className={styles.form} onSubmit={onSubmit} aria-label="Formulário de autenticação">
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="login-email">E-mail</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><Mail size={17} /></span>
                <input
                  className={styles.input}
                  type="email"
                  id="login-email"
                  name="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="login-password">Senha</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><Lock size={17} /></span>
                <input
                  className={styles.input}
                  type="password"
                  id="login-password"
                  name="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className={styles.forgotRow}>
              <Link className={styles.forgotLink} to="/forgot-password">Esqueceu a senha?</Link>
            </div>

            {error && <div className={styles.error} role="alert">{error}</div>}

            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>ou</span>
              <span className={styles.dividerLine} />
            </div>

            {GOOGLE_CLIENT_ID && (
              <div className={styles.googleBtnWrapper}>
                <div id="google-signin-btn" />
                {googleLoading && <p className={styles.googleLoading}>Autenticando com Google...</p>}
              </div>
            )}

            <div className={styles.registerRow}>
              <span className={styles.registerText}>Não tem conta?</span>
              <Link className={styles.registerLink} to="/register">Criar conta</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
