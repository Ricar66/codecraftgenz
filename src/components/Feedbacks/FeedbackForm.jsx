// src/components/Feedbacks/FeedbackForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import useFeedbacks from '../../hooks/useFeedbacks';

export default function FeedbackForm() {
  const { submit } = useFeedbacks({ autoFetch: false });
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [honeypot, setHoneypot] = useState(''); // anti-spam
  const [validationErrors, setValidationErrors] = useState({});

  const maxChars = 500;
  const remaining = maxChars - mensagem.length;

  // Validação em tempo real
  useEffect(() => {
    const errors = {};
    
    if (mensagem.trim() && mensagem.length < 10) {
      errors.mensagem = 'O feedback deve ter pelo menos 10 caracteres';
    }
    
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = 'Email deve ter um formato válido';
    }
    
    setValidationErrors(errors);
  }, [mensagem, email]);

  async function onSubmit(e) {
    e.preventDefault();
    
    // Validação final
    if (!nome.trim()) {
      setError('O campo nome é obrigatório');
      return;
    }
    
    if (!mensagem.trim()) {
      setError('O campo de feedback é obrigatório');
      return;
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setError('Por favor, corrija os erros antes de enviar');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await submit({ nome, email, mensagem }, { honeypot });
      setSuccess('Feedback enviado com sucesso! Redirecionando...');
      setNome(''); 
      setEmail(''); 
      setMensagem(''); 
      setHoneypot('');
      setValidationErrors({});
      
      // Redirecionar para a página inicial após 2 segundos
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.details ? err.details.join('\n') : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="feedback-form" aria-label="Formulário de feedback">
      <div className="form-group">
        <label htmlFor="nome" className="form-label">
          Nome *
        </label>
        <input 
          id="nome" 
          name="nome" 
          type="text" 
          value={nome} 
          onChange={(e) => setNome(e.target.value)} 
          placeholder="Seu nome" 
          className="form-input"
          aria-required="true" 
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email" className="form-label">
          Email
        </label>
        <input 
          id="email" 
          name="email" 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="seu@email.com" 
          className={`form-input ${validationErrors.email ? 'error' : ''}`}
          aria-required="false" 
        />
        {validationErrors.email && (
          <span className="error-message">{validationErrors.email}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="mensagem" className="form-label">
          Sua mensagem *
          <span className="char-counter">
            {remaining} caracteres restantes
          </span>
        </label>
        <textarea 
          id="mensagem" 
          name="mensagem" 
          value={mensagem} 
          onChange={(e) => setMensagem(e.target.value)} 
          placeholder="Compartilhe sua experiência, sugestão ou feedback..." 
          className={`form-textarea ${validationErrors.mensagem ? 'error' : ''}`}
          maxLength={maxChars}
          rows="6"
          aria-required="true" 
          required
        />
        {validationErrors.mensagem && (
          <span className="error-message">{validationErrors.mensagem}</span>
        )}
       </div>

      {/* Honeypot hidden field */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input 
          id="website" 
          name="website" 
          type="text" 
          value={honeypot} 
          onChange={(e) => setHoneypot(e.target.value)} 
          tabIndex="-1"
        />
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success" role="status">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      <button 
        type="submit" 
        disabled={loading || Object.keys(validationErrors).length > 0} 
        className={`submit-button ${loading ? 'loading' : ''}`}
        aria-label="Enviar feedback"
      >
        {loading ? (
          <>
            <span className="loading-spinner"></span>
            Enviando...
          </>
        ) : (
          <>
            <span className="button-icon">📤</span>
            Enviar Feedback
          </>
        )}
      </button>

      <style>{`
        /* ===== FORMULÁRIO BASE ===== */
        .feedback-form {
          display: flex;
          flex-direction: column;
          gap: var(--espaco-lg);
          width: 100%;
        }

        /* ===== GRUPOS DE CAMPOS ===== */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--espaco-sm);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--espaco-lg);
        }

        /* ===== LABELS ===== */
        .form-label {
          font-family: var(--fonte-subtitulos);
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--texto-branco);
          letter-spacing: 0.025em;
          text-transform: uppercase;
        }

        .form-label.required::after {
          content: ' *';
          color: var(--cor-primaria);
        }

        /* ===== INPUTS E TEXTAREA ===== */
        .form-input,
        .form-textarea,
        .form-select {
          font-family: var(--fonte-corpo);
          font-size: 1rem;
          padding: var(--espaco-md);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--raio-md);
          background: rgba(255, 255, 255, 0.05);
          color: var(--texto-branco);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
          outline: none;
          border-color: var(--cor-primaria);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 3px rgba(var(--cor-primaria-rgb), 0.1);
          transform: translateY(-1px);
        }

        .form-input::placeholder,
        .form-textarea::placeholder {
          color: var(--texto-gelo);
          opacity: 0.7;
        }

        .form-input.error,
        .form-textarea.error {
          border-color: #ff6b6b;
          background: rgba(255, 107, 107, 0.05);
        }

        /* ===== TEXTAREA ESPECÍFICO ===== */
        .form-textarea {
          resize: vertical;
          min-height: 120px;
          line-height: 1.6;
        }

        .textarea-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: var(--espaco-xs);
        }

        .char-counter {
          font-size: 0.75rem;
          color: var(--texto-gelo);
          opacity: 0.8;
        }

        /* ===== SISTEMA DE AVALIAÇÃO ===== */
        .rating-container {
          display: flex;
          align-items: center;
          gap: var(--espaco-xs);
        }

        .star-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
          padding: var(--espaco-xs);
          border-radius: var(--raio-sm);
        }

        .star-button:hover,
        .star-button.active {
          color: #ffd700;
          transform: scale(1.1);
        }

        .star-button:focus {
          outline: 2px solid var(--cor-primaria);
          outline-offset: 2px;
        }

        .rating-text {
          font-size: 0.875rem;
          color: var(--texto-gelo);
          margin-left: var(--espaco-sm);
        }

        /* ===== MENSAGENS DE ERRO ===== */
        .error-message {
          font-size: 0.75rem;
          color: #ff6b6b;
          font-weight: 500;
        }

        /* ===== ALERTAS ===== */
        .alert {
          display: flex;
          align-items: center;
          gap: var(--espaco-sm);
          padding: var(--espaco-md);
          border-radius: var(--raio-md);
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }

        .alert-error {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.3);
          color: #ff6b6b;
        }

        .alert-success {
          background: rgba(72, 187, 120, 0.1);
          border: 1px solid rgba(72, 187, 120, 0.3);
          color: #48bb78;
        }

        .alert-icon {
          font-size: 1.125rem;
        }

        /* ===== BOTÃO DE ENVIO ===== */
        .submit-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--espaco-sm);
          padding: var(--espaco-lg) var(--espaco-xl);
          font-family: var(--fonte-subtitulos);
          font-size: 1rem;
          font-weight: 600;
          color: var(--texto-branco);
          background: linear-gradient(135deg, var(--cor-primaria) 0%, var(--cor-terciaria) 100%);
          border: none;
          border-radius: var(--raio-md);
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          position: relative;
          overflow: hidden;
        }

        .submit-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .submit-button:hover::before {
          left: 100%;
        }

        .submit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }

        .submit-button:active {
          transform: translateY(0);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .submit-button:disabled:hover {
          transform: none;
          box-shadow: none;
        }

        .button-icon {
          font-size: 1.125rem;
        }

        /* ===== LOADING SPINNER ===== */
        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid var(--texto-branco);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* ===== HONEYPOT ===== */
        .honeypot {
          position: absolute;
          left: -10000px;
          top: auto;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }

        /* ===== ANIMAÇÕES ===== */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ===== RESPONSIVIDADE ===== */
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
            gap: var(--espaco-md);
          }

          .rating-container {
            justify-content: center;
          }

          .textarea-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--espaco-xs);
          }
        }

        @media (max-width: 480px) {
          .feedback-form {
            gap: var(--espaco-md);
          }

          .submit-button {
            padding: var(--espaco-md) var(--espaco-lg);
            font-size: 0.875rem;
          }
        }

        /* ===== ACESSIBILIDADE ===== */
        @media (prefers-reduced-motion: reduce) {
          .submit-button,
          .star-button,
          .form-input,
          .form-textarea,
          .form-select {
            transition: none;
          }

          .submit-button::before {
            display: none;
          }

          .loading-spinner {
            animation: none;
          }

          .alert {
            animation: none;
          }
        }

        /* ===== MODO DE ALTO CONTRASTE ===== */
        @media (prefers-contrast: high) {
          .form-input,
          .form-textarea,
          .form-select {
            border-width: 3px;
          }

          .submit-button {
            border: 2px solid var(--texto-branco);
          }
        }
      `}</style>
    </form>
  );
}