import React, { useState } from 'react';

import heroBackground from '../assets/hero-background.svg';
import Navbar from '../components/Navbar/Navbar';
import { requestPasswordReset } from '../services/userAPI.js';

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

  const backgroundStyle = {
    backgroundImage: `url(${heroBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed'
  };

  return (
    <div className="forgot-page" style={backgroundStyle}>
      <Navbar />
      <section className="section-block">
        <div className="card">
          <h1 className="title">Esqueci minha senha</h1>
          <p className="subtitle">Informe seu e-mail para receber o link de redefinição.</p>

          <form className="form" onSubmit={onSubmit}>
            <label className="label">E-mail</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            {error && <div className="error" role="alert">{error}</div>}
            {success && <div className="success" role="status">{success}</div>}
            {devLink && <div className="devlink" role="note">Link (dev): <a href={devLink}>{devLink}</a></div>}

            <button className="btnPrimary" type="submit" disabled={loading}>
              {loading ? 'Processando...' : 'Enviar link'}
            </button>
          </form>
        </div>
      </section>

      <style>{`
        .forgot-page { min-height: 100vh; }
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
        .devlink { font-family: 'Inter', system-ui, sans-serif; font-size: 0.9rem; color: #333; word-break: break-all; }
        @media (max-width: 480px) { .card { margin: 0 16px; } }
      `}</style>
    </div>
  );
}