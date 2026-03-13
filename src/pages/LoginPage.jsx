// src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

import logoImg from '../assets/logo-principal.png';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <div className={styles.page}>
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
