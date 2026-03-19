// src/pages/RegisterPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';

import logoImg from '../assets/logo-principal.png';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth';
import { apiRequest } from '../lib/apiConfig';
import styles from './RegisterPage.module.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function RegisterPage() {
  const { login, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
        document.getElementById('google-signup-btn'),
        {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signup_with',
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

    if (!name.trim()) { setError('Por favor, informe seu nome.'); return; }
    if (!email.trim()) { setError('Por favor, informe seu e-mail.'); return; }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não conferem.'); return; }

    setLoading(true);
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      if (response?.token || response?.data?.token) {
        const token = response.token || response.data.token;
        localStorage.setItem('cc_session', JSON.stringify({ token }));
        await login(email, password);
      } else {
        setError('Registro realizado, mas houve erro ao fazer login automático. Tente fazer login manualmente.');
      }
    } catch (err) {
      setError(err?.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.wrapper}>
        <div className={styles.card}>
          <header className={styles.header}>
            <img src={logoImg} alt="CodeCraft" className={styles.logo} />
            <h1 className={styles.title}>Criar Conta</h1>
            <p className={styles.subtitle}>Cadastre-se para acessar a plataforma</p>
          </header>

          <form className={styles.form} onSubmit={onSubmit} aria-label="Formulário de cadastro">
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="register-name">Nome completo</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><User size={17} /></span>
                <input
                  className={styles.input}
                  type="text"
                  id="register-name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="register-email">E-mail</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><Mail size={17} /></span>
                <input
                  className={styles.input}
                  type="email"
                  id="register-email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="register-password">Senha</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><Lock size={17} /></span>
                <input
                  className={styles.input}
                  type="password"
                  id="register-password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="register-confirm-password">Confirmar Senha</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><Lock size={17} /></span>
                <input
                  className={styles.input}
                  type="password"
                  id="register-confirm-password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            {error && <div className={styles.error} role="alert">{error}</div>}

            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>

            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>ou</span>
              <span className={styles.dividerLine} />
            </div>

            {GOOGLE_CLIENT_ID && (
              <div className={styles.googleBtnWrapper}>
                <div id="google-signup-btn" />
                {googleLoading && <p className={styles.googleLoading}>Autenticando com Google...</p>}
              </div>
            )}

            <div className={styles.registerRow}>
              <span className={styles.registerText}>Já tem uma conta?</span>
              <Link className={styles.registerLink} to="/login">Fazer login</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
