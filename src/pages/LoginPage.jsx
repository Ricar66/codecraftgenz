// src/pages/LoginPage.jsx
import React, { useState } from 'react';

import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@codecraft.dev');
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
    <div className="login-page">
      <Navbar />
      <section className="section-block">
        <div className="login-card">
          <h1 className="title">Entrar</h1>
          <p className="subtitle">Acesse a área administrativa</p>

          <form className="form" onSubmit={onSubmit}>
            <label className="label">E-mail</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            <label className="label">Senha</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            {error && <div className="error" role="alert">{error}</div>}

            <button className="btnPrimary" type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </section>

      <style>{`
        .login-page { min-height: 100vh; background-color: transparent; }
        .section-block { padding: var(--espaco-3xl) var(--espaco-xl); }
        .login-card { max-width: 420px; margin: 0 auto; background: #F4F4F4; border-radius: 16px; padding: 24px; box-shadow: 0 12px 32px rgba(0,0,0,0.18); border: 1px solid rgba(0,228,242,0.2); }
        .title { font-family: 'Montserrat', system-ui, sans-serif; font-weight: 700; font-size: 1.75rem; color: #121212; }
        .subtitle { font-family: 'Poppins', system-ui, sans-serif; color: #555; margin-top: 6px; }
        .form { display: grid; gap: 12px; margin-top: 16px; }
        .label { font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; color: #333; }
        .input { font-family: 'Inter', system-ui, sans-serif; padding: 10px 12px; border-radius: 10px; border: 1px solid #A6A6A6; outline: none; }
        .input:focus { border-color: #00E4F2; box-shadow: 0 0 0 3px rgba(0,228,242,0.2); }
        .btnPrimary { background: #D12BF2; color: white; border: none; border-radius: 10px; padding: 10px 14px; font-weight: 600; cursor: pointer; }
        .btnPrimary:hover { filter: brightness(1.05); }
        .error { background: rgba(209,43,242,0.1); border: 1px solid rgba(209,43,242,0.3); padding: 8px 10px; border-radius: 8px; color: #68007B; }
        @media (max-width: 480px) { .login-card { margin: 0 16px; } }
      `}</style>
    </div>
  );
}