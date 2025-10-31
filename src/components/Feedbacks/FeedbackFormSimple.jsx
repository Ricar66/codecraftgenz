// src/components/Feedbacks/FeedbackFormSimple.jsx
import React, { useState } from 'react';

import { submitFeedback, FeedbackValidator } from '../../services/feedbackAPI';

import styles from './FeedbackFormSimple.module.css';

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
      <div className={styles.feedbackSuccess}>
        <div className={styles.successIcon}>✓</div>
        <h3>Feedback enviado com sucesso!</h3>
        <p>Obrigado por compartilhar sua opinião conosco.</p>
      </div>
    );
  }

  return (
    <div className={styles.feedbackFormSimple}>
      <h3>Deixe seu Feedback</h3>
      <p>Sua opinião é muito importante para nós!</p>
      
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
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

        <div className={styles.formGroup}>
          <label htmlFor="email">E-mail (opcional)</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="mensagem">Mensagem *</label>
          <textarea
            id="mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Conte-nos sua experiência, sugestões ou dúvidas..."
            rows={4}
            maxLength={maxChars}
            required
          />
          <div className={styles.charCounter}>
            {remaining} caracteres restantes
          </div>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className={styles.submitBtn}
          disabled={loading}
        >
          {loading ? 'Enviando...' : 'Enviar Feedback'}
        </button>
      </form>


    </div>
  );
};

export default FeedbackFormSimple;