// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth';
import { apiRequest } from '../lib/apiConfig';

export default function RegisterPage() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validacoes basicas
    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }

    if (!email.trim()) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas nao conferem.');
      return;
    }

    setLoading(true);

    try {
      // Registrar usuario
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      // Se retornou token, faz login automatico
      if (response?.token || response?.data?.token) {
        const token = response.token || response.data.token;
        localStorage.setItem('cc_session', JSON.stringify({ token }));
        // Redireciona para login para completar autenticacao
        await login(email, password);
      } else {
        setError('Registro realizado, mas houve erro ao fazer login automatico. Tente fazer login manualmente.');
      }
    } catch (err) {
      const msg = err?.message || err?.error || 'Erro ao criar conta. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page page-with-background">
      <Navbar />
      <section className="section-block" aria-label="Formulario de registro">
        <div className="register-card">
          <header>
            <h1 className="title">Criar Conta</h1>
            <p className="subtitle">Cadastre-se para acessar a plataforma</p>
          </header>

          <form className="form" onSubmit={onSubmit} aria-label="Formulario de cadastro">
            <label className="label" htmlFor="register-name">Nome completo</label>
            <input
              className="input"
              type="text"
              id="register-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Seu nome"
            />

            <label className="label" htmlFor="register-email">E-mail</label>
            <input
              className="input"
              type="email"
              id="register-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
            />

            <label className="label" htmlFor="register-password">Senha</label>
            <input
              className="input"
              type="password"
              id="register-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Minimo 6 caracteres"
            />

            <label className="label" htmlFor="register-confirm-password">Confirmar Senha</label>
            <input
              className="input"
              type="password"
              id="register-confirm-password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repita a senha"
            />

            {error && <div className="error" role="alert">{error}</div>}

            <button className="btnPrimary" type="submit" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>

            <div className="actions">
              <span className="text">Ja tem uma conta?</span>
              <Link className="link" to="/login">Fazer login</Link>
            </div>
          </form>
        </div>
      </section>

      <style>{`
        .register-page { min-height: 100vh; }
        .section-block { padding: var(--espaco-3xl) var(--espaco-xl); }
        .register-card { max-width: 420px; margin: 0 auto; background: #F4F4F4; border-radius: 16px; padding: 24px; box-shadow: 0 12px 32px rgba(0,0,0,0.18); border: 1px solid rgba(0,228,242,0.2); }
        .title { font-family: 'Montserrat', system-ui, sans-serif; font-weight: 700; font-size: 1.75rem; color: #121212; }
        .subtitle { font-family: 'Poppins', system-ui, sans-serif; color: #555; margin-top: 6px; }
        .form { display: grid; gap: 12px; margin-top: 16px; }
        .label { font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; color: #333; }
        .input { font-family: 'Inter', system-ui, sans-serif; padding: 10px 12px; border-radius: 10px; border: 1px solid #A6A6A6; outline: none; }
        .input:focus { border-color: #00E4F2; box-shadow: 0 0 0 3px rgba(0,228,242,0.2); }
        .btnPrimary { background: #D12BF2; color: white; border: none; border-radius: 10px; padding: 10px 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }
        .btnPrimary:hover { filter: brightness(1.05); }
        .btnPrimary:disabled { opacity: 0.7; cursor: not-allowed; }
        .actions { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 12px; }
        .text { font-family: 'Inter', system-ui, sans-serif; font-size: 0.9rem; color: #555; }
        .link { font-family: 'Inter', system-ui, sans-serif; font-size: 0.9rem; color: #004A54; text-decoration: underline; cursor: pointer; }
        .error { background: rgba(209,43,242,0.1); border: 1px solid rgba(209,43,242,0.3); padding: 8px 10px; border-radius: 8px; color: #68007B; }
        @media (max-width: 480px) { .register-card { margin: 0 16px; } }
      `}</style>
    </div>
  );
}
