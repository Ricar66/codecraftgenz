// src/components/Feedbacks/FeedbackForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import useFeedbacks from '../../hooks/useFeedbacks';

export default function FeedbackForm() {
  const { submit } = useFeedbacks({ autoFetch: false });
  const navigate = useNavigate();
  const [author, setAuthor] = useState('');
  const [company, setCompany] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [type, setType] = useState('elogio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [honeypot, setHoneypot] = useState(''); // anti-spam
  const [validationErrors, setValidationErrors] = useState({});

  const maxChars = 500;
  const remaining = maxChars - message.length;

  // Validação em tempo real
  useEffect(() => {
    const errors = {};
    
    if (message.trim() && message.length < 10) {
      errors.message = 'O feedback deve ter pelo menos 10 caracteres';
    }
    
    if (avatarUrl && !avatarUrl.match(/^https?:\/\/.+/)) {
      errors.avatarUrl = 'URL deve começar com http:// ou https://';
    }
    
    setValidationErrors(errors);
  }, [message, avatarUrl]);

  async function onSubmit(e) {
    e.preventDefault();
    
    // Validação final
    if (!message.trim()) {
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
      await submit({ author, company, avatarUrl, message, rating: Number(rating), type }, { honeypot });
      setSuccess('Feedback enviado com sucesso! Redirecionando...');
      setAuthor(''); 
      setCompany(''); 
      setAvatarUrl(''); 
      setMessage(''); 
      setRating(5); 
      setType('elogio'); 
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
        <label htmlFor="author" className="form-label">
          Nome
        </label>
        <input 
          id="author" 
          name="author" 
          type="text" 
          value={author} 
          onChange={(e) => setAuthor(e.target.value)} 
          placeholder="Seu nome" 
          className="form-input"
          aria-required="false" 
        />
      </div>

      <div className="form-group">
        <label htmlFor="company" className="form-label">
          Empresa
        </label>
        <input 
          id="company" 
          name="company" 
          type="text" 
          value={company} 
          onChange={(e) => setCompany(e.target.value)} 
          placeholder="Nome da empresa" 
          className="form-input"
          aria-required="false" 
        />
      </div>

      <div className="form-group">
        <label htmlFor="avatarUrl" className="form-label">
          Foto do cliente ou logo (URL)
        </label>
        <input 
          id="avatarUrl" 
          name="avatarUrl" 
          type="url" 
          value={avatarUrl} 
          onChange={(e) => setAvatarUrl(e.target.value)} 
          placeholder="https://..." 
          className={`form-input ${validationErrors.avatarUrl ? 'error' : ''}`}
          aria-required="false"
          aria-describedby={validationErrors.avatarUrl ? 'avatarUrl-error' : undefined}
        />
        {validationErrors.avatarUrl && (
          <span id="avatarUrl-error" className="error-message" role="alert">
            {validationErrors.avatarUrl}
          </span>
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

      <div className="form-group">
        <label htmlFor="message" className="form-label required">
          Feedback *
        </label>
        <textarea 
          id="message" 
          name="message" 
          value={message} 
          onChange={(e) => setMessage(e.target.value.slice(0, maxChars))} 
          rows={4} 
          placeholder="Escreva seu feedback detalhado aqui..." 
          className={`form-textarea ${validationErrors.message ? 'error' : ''}`}
          aria-required="true"
          aria-describedby="message-counter message-error"
        />
        <div className="textarea-footer">
          <span id="message-counter" className="char-counter" aria-live="polite">
            {remaining} caracteres restantes
          </span>
          {validationErrors.message && (
            <span id="message-error" className="error-message" role="alert">
              {validationErrors.message}
            </span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="rating" className="form-label">
            Avaliação
          </label>
          <div className="rating-container">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                type="button"
                className={`star-button ${n <= rating ? 'active' : ''}`}
                onClick={() => setRating(n)}
                aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
            <span className="rating-text">{rating} estrela{rating > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="type" className="form-label">
            Tipo
          </label>
          <select 
            id="type" 
            name="type" 
            value={type} 
            onChange={(e) => setType(e.target.value)} 
            className="form-select"
            aria-required="true"
          >
            <option value="elogio">💝 Elogio</option>
            <option value="sugestao">💡 Sugestão</option>
            <option value="critica">🔍 Crítica</option>
          </select>
        </div>
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