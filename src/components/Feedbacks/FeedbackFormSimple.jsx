// src/components/Feedbacks/FeedbackFormSimple.jsx
import React, { useState } from 'react';

import { submitFeedback, FeedbackValidator } from '../../services/feedbackAPI';

const FeedbackFormSimple = ({ onSuccess }) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const maxChars = 500;
  const remaining = maxChars - mensagem.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const feedbackData = {
      nome: nome.trim(),
      email: email.trim(),
      mensagem: mensagem.trim(),
      origem: 'pagina_inicial'
    };

    const { isValid, errors } = FeedbackValidator.validate(feedbackData);
    
    if (!isValid) {
      setError(errors.join(', '));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitFeedback(feedbackData);
      setSuccess(true);
      setNome('');
      setEmail('');
      setMensagem('');
      
      if (onSuccess) {
        onSuccess();
      }

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="feedback-success">
        <div className="success-icon">✓</div>
        <h3>Feedback enviado com sucesso!</h3>
        <p>Obrigado por compartilhar sua opinião conosco.</p>
      </div>
    );
  }

  return (
    <div className="feedback-form-simple">
      <h3>Deixe seu Feedback</h3>
      <p>Sua opinião é muito importante para nós!</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nome">Nome *</label>
          <input
            type="text"
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">E-mail (opcional)</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="mensagem">Mensagem *</label>
          <textarea
            id="mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Compartilhe sua experiência, sugestão ou comentário..."
            rows={4}
            maxLength={maxChars}
            required
          />
          <div className="char-counter">
            {remaining} caracteres restantes
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="submit-btn"
        >
          {loading ? 'Enviando...' : 'Enviar Feedback'}
        </button>
      </form>

      <style jsx>{`
        .feedback-form-simple {
          background: rgba(255, 255, 255, 0.95);
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          margin: 0 auto;
        }

        .feedback-form-simple h3 {
          color: #2c3e50;
          margin-bottom: 0.5rem;
          font-size: 1.5rem;
        }

        .feedback-form-simple p {
          color: #7f8c8d;
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #2c3e50;
          font-weight: 500;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3498db;
        }

        .char-counter {
          text-align: right;
          font-size: 0.875rem;
          color: #7f8c8d;
          margin-top: 0.25rem;
        }

        .error-message {
          background: #fee;
          color: #c0392b;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          border: 1px solid #f5c6cb;
        }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          border: none;
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #2980b9, #1f5f8b);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .feedback-success {
          background: rgba(255, 255, 255, 0.95);
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          margin: 0 auto;
          text-align: center;
        }

        .success-icon {
          font-size: 3rem;
          color: #27ae60;
          margin-bottom: 1rem;
        }

        .feedback-success h3 {
          color: #27ae60;
          margin-bottom: 0.5rem;
        }

        .feedback-success p {
          color: #7f8c8d;
        }

        @media (max-width: 768px) {
          .feedback-form-simple,
          .feedback-success {
            margin: 0 1rem;
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FeedbackFormSimple;