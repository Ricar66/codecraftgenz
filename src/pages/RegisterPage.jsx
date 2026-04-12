// src/pages/RegisterPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';

import logoImg from '../assets/logo-principal.png';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth';
import { apiRequest } from '../lib/apiConfig';
import styles from './RegisterPage.module.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const errorStyle = { color: '#f87171', fontSize: '0.8rem', marginTop: '4px' };
const helperStyle = { color: '#6B7280', fontSize: '0.8rem', marginTop: '4px' };

export default function RegisterPage() {
  const { login, loginWithGoogle } = useAuth();
  const location = useLocation();
  const prefill = location.state || {};
  const [name, setName] = useState(prefill.nome || '');
  const [email, setEmail] = useState(prefill.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const validateField = (field, value) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Nome é obrigatório.';
        if (value.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres.';
        return '';
      case 'email':
        if (!value.trim()) return 'E-mail é obrigatório.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Formato de e-mail inválido.';
        return '';
      case 'password': {
        if (value.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
        if (!/[A-Z]/.test(value)) return 'A senha deve conter pelo menos uma letra maiúscula.';
        if (!/[0-9]/.test(value)) return 'A senha deve conter pelo menos um número.';
        return '';
      }
      case 'confirmPassword':
        if (value !== password) return 'As senhas não conferem.';
        return '';
      default:
        return '';
    }
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return '';
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return 'Fraca';
    if (score === 2) return 'Média';
    if (score === 3) return 'Forte';
    return 'Muito forte';
  };

  const handleBlur = (field) => {
    const values = { name, email, password, confirmPassword };
    const err = validateField(field, values[field]);
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

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
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (!/[A-Z]/.test(password)) { setError('A senha deve conter pelo menos uma letra maiúscula.'); return; }
    if (!/[0-9]/.test(password)) { setError('A senha deve conter pelo menos um número.'); return; }
    if (password !== confirmPassword) { setError('As senhas não conferem.'); return; }

    setLoading(true);
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      // Auth é gerenciada via HTTPOnly cookie definido pelo backend
      // O cookie já está ativo após o registro — apenas faz login para popular o contexto
      await login(email, password);
    } catch (err) {
      setError(err?.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.page} starfield-bg`}>
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
                  onBlur={() => handleBlur('name')}
                  required
                  autoComplete="name"
                  placeholder="Seu nome"
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
                />
              </div>
              {fieldErrors.name && <span id="register-name-error" style={errorStyle}>{fieldErrors.name}</span>}
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
                  onBlur={() => handleBlur('email')}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                />
              </div>
              {fieldErrors.email && <span id="register-email-error" style={errorStyle}>{fieldErrors.email}</span>}
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
                  onBlur={() => handleBlur('password')}
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'register-password-error' : 'register-password-hint'}
                />
              </div>
              {fieldErrors.password
                ? <span id="register-password-error" style={errorStyle}>{fieldErrors.password}</span>
                : <span id="register-password-hint" style={helperStyle}>Mínimo 8 caracteres, 1 maiúscula e 1 número</span>}
              {password && !fieldErrors.password && (
                <span style={{ ...helperStyle, fontWeight: 600 }}>Força: {getPasswordStrength(password)}</span>
              )}
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
                  onBlur={() => handleBlur('confirmPassword')}
                  required
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
                />
              </div>
              {fieldErrors.confirmPassword && <span id="register-confirm-password-error" style={errorStyle}>{fieldErrors.confirmPassword}</span>}
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
