// src/components/CrafterModal/CrafterModal.jsx
import React, { useState } from 'react';

import { apiRequest } from '../../lib/apiConfig.js';

import styles from './CrafterModal.module.css';

const CrafterModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cidade: '',
    estado: '',
    area_interesse: '',
    mensagem: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const areasInteresse = [
    'Front-end',
    'Back-end',
    'Dados',
    'Design',
    'DevOps',
    'Outros'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];
    const fErrors = {};

    // Validação do nome
    if (!formData.nome.trim()) {
      errors.push('Nome é obrigatório');
      fErrors.nome = 'Informe seu nome completo';
    } else if (formData.nome.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
      fErrors.nome = 'Pelo menos 2 caracteres';
    }

    // Validação do email
    if (!formData.email.trim()) {
      errors.push('E-mail é obrigatório');
      fErrors.email = 'Informe um e-mail válido';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.push('E-mail deve ter um formato válido');
        fErrors.email = 'Formato de e-mail inválido';
      }
    }

    // Validação do telefone (opcional, mas se preenchido deve ser válido)
    if (formData.telefone.trim()) {
      const phoneRegex = /^[\d\s()-+]{10,}$/;
      if (!phoneRegex.test(formData.telefone.trim())) {
        errors.push('Telefone deve ter um formato válido');
        fErrors.telefone = 'Telefone inválido';
      }
    }

    // Estado (UF) se preenchido deve ter 2 letras
    if (formData.estado.trim() && formData.estado.trim().length !== 2) {
      errors.push('Estado deve conter 2 letras (UF)');
      fErrors.estado = 'Use 2 letras, ex: SP';
    }

    setFieldErrors(fErrors);
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação robusta
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiRequest('/api/inscricoes', { method: 'POST', body: JSON.stringify(formData) });

      setSuccess(true);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        cidade: '',
        estado: '',
        area_interesse: '',
        mensagem: ''
      });

      // Fechar modal após 3 segundos
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSuccess(false);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Quero ser um Crafter</h2>
          <button className={styles.closeBtn} onClick={handleClose} disabled={loading}>
            ×
          </button>
        </div>

        {success ? (
          <div className={styles.successContent}>
            <div className={styles.successIcon}>🎉</div>
            <h3>Inscrição recebida com sucesso!</h3>
            <p>Entraremos em contato em breve. Obrigado pelo seu interesse!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.crafterForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="nome">Nome completo *</label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Seu nome completo"
                  required
                />
                {fieldErrors.nome && (
                  <div className={styles.fieldError}>{fieldErrors.nome}</div>
                )}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="email">E-mail *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="seu@email.com"
                  required
                />
                {fieldErrors.email && (
                  <div className={styles.fieldError}>{fieldErrors.email}</div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="telefone">Telefone</label>
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  placeholder="(11) 99999-9999"
                />
                {fieldErrors.telefone && (
                  <div className={styles.fieldError}>{fieldErrors.telefone}</div>
                )}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="cidade">Cidade</label>
                <input
                  type="text"
                  id="cidade"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleInputChange}
                  placeholder="Sua cidade"
                />
              </div>
              <div className={styles.formGroup} style={{ flex: '0 0 80px' }}>
                <label htmlFor="estado">UF</label>
                <input
                  type="text"
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  placeholder="SP"
                  maxLength={2}
                  style={{ textTransform: 'uppercase' }}
                />
                {fieldErrors.estado && (
                  <div className={styles.fieldError}>{fieldErrors.estado}</div>
                )}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="area_interesse">Área de Interesse</label>
                <select
                  id="area_interesse"
                  name="area_interesse"
                  value={formData.area_interesse}
                  onChange={handleInputChange}
                >
                  <option value="">Selecione uma área...</option>
                  {areasInteresse.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="mensagem">Mensagem (Opcional)</label>
              <textarea
                id="mensagem"
                name="mensagem"
                value={formData.mensagem}
                onChange={handleInputChange}
                placeholder="Conte um pouco sobre você ou seus objetivos..."
              />
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Inscrição'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CrafterModal;
