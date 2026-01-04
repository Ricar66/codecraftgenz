// src/pages/PasswordResetPage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar';
import { confirmPasswordReset } from '../services/userAPI.js';

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
    <div className="reset-page page-with-background">
      <Navbar />
      <section className="section-block">
        <div className="card">
          <h1 className="title">Redefinir Senha</h1>
          <p className="subtitle">Insira a nova senha para sua conta.</p>

          <form className="form" onSubmit={onSubmit}>
            <label className="label">Nova Senha</label>
            <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />

            <label className="label">Token</label>
            <input className="input" type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Token do link recebido por e-mail" required />

            {error && <div className="error" role="alert">{error}</div>}
            {success && <div className="success" role="status">{success}</div>}

            <button className="btnPrimary" type="submit" disabled={loading || !token}>
              {loading ? 'Processando...' : 'Redefinir Senha'}
            </button>
          </form>
        </div>
      </section>

      <style>{`
        .reset-page { min-height: 100vh; }
        .section-block { padding: var(--espaco-3xl) var(--espaco-xl); }
        .card { max-width: 520px; margin: 0 auto; background: #F4F4F4; border-radius: 16px; padding: 24px; box-shadow: 0 12px 32px rgba(0,0,0,0.18); border: 1px solid rgba(0,228,242,0.2); }
        .title { font-family: 'Montserrat', system-ui, sans-serif; font-weight: 700; font-size: 1.75rem; color: #121212; }
        .subtitle { font-family: 'Poppins', system-ui, sans-serif; color: #555; margin-top: 6px; }
        .form { display: grid; gap: 12px; margin-top: 16px; }
        .label { font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; color: #333; }
        .input { font-family: 'Inter', system-ui, sans-serif; padding: 10px 12px; border-radius: 10px; border: 1px solid #A6A6A6; outline: none; }
        .input:focus { border-color: #00E4F2; box-shadow: 0 0 0 3px rgba(0,228,242,0.2); }
        .btnPrimary { background: #D12BF2; color: white; border: none; border-radius: 10px; padding: 10px 14px; font-weight: 600; cursor: pointer; }
        .btnPrimary:hover { filter: brightness(1.05); }
        .error { background: rgba(209,43,242,0.1); border: 1px solid rgba(209,43,242,0.3); padding: 8px 10px; border-radius: 8px; color: #68007B; }
        .success { background: rgba(0,228,242,0.1); border: 1px solid rgba(0,228,242,0.3); padding: 8px 10px; border-radius: 8px; color: #004A54; }
        @media (max-width: 480px) { .card { margin: 0 16px; } }
      `}</style>
    </div>
  );
}