// src/components/CrafterModal/CrafterModal.jsx
import React, { useState, useEffect } from 'react';

import { apiRequest } from '../../lib/apiConfig.js';
import { trackFunnelStep } from '../../services/analyticsAPI.js';
import { captureCrafterLead } from '../../services/leadsAPI.js';

import styles from './CrafterModal.module.css';

const CrafterModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    rede_social: '',
    cidade: '',
    estado: '',
    area_interesse: '',
    mensagem: '',
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
    'Outros',
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const errors = [];
    const fErrors = {};

    if (!formData.nome.trim()) {
      errors.push('Nome e obrigatorio');
      fErrors.nome = 'Informe seu nome completo';
    } else if (formData.nome.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
      fErrors.nome = 'Pelo menos 2 caracteres';
    }

    if (!formData.email.trim()) {
      errors.push('E-mail e obrigatorio');
      fErrors.email = 'Informe um e-mail valido';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.push('E-mail deve ter um formato valido');
        fErrors.email = 'Formato de e-mail invalido';
      }
    }

    if (formData.telefone.trim()) {
      const phoneRegex = /^[\d\s()-+]{10,}$/;
      if (!phoneRegex.test(formData.telefone.trim())) {
        errors.push('Telefone deve ter um formato valido');
        fErrors.telefone = 'Telefone invalido';
      }
    }

    if (formData.estado.trim() && formData.estado.trim().length !== 2) {
      errors.push('Estado deve conter 2 letras (UF)');
      fErrors.estado = 'Use 2 letras, ex: SP';
    }

    setFieldErrors(fErrors);
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Envia para o backend interno
      await apiRequest('/api/inscricoes', { method: 'POST', body: JSON.stringify(formData) });

      // Notifica admin por email
      apiRequest('/api/inscricoes/notify', {
        method: 'POST',
        body: JSON.stringify({
          to: 'codecraftgenz@gmail.com',
          subject: `Nova inscricao de Crafter: ${formData.nome}`,
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone || '',
          rede_social: formData.rede_social || '',
          area_interesse: formData.area_interesse || '',
          cidade: formData.cidade || '',
          estado: formData.estado || '',
          mensagem: formData.mensagem || '',
        }),
      }).catch(() => {});

      // Envia email de boas-vindas para o candidato
      apiRequest('/api/inscricoes/welcome', {
        method: 'POST',
        body: JSON.stringify({
          to: formData.email,
          nome: formData.nome,
        }),
      }).catch(() => {});

      // Captura lead externo
      captureCrafterLead(formData).catch(() => {});

      trackFunnelStep('crafter_funnel', 'crafter_form_submitted', {
        area_interesse: formData.area_interesse,
        cidade: formData.cidade,
      });

      setSuccess(true);
      setFormData({
        nome: '', email: '', telefone: '', rede_social: '',
        cidade: '', estado: '', area_interesse: '', mensagem: '',
      });

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 4000);

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

  useEffect(() => {
    if (isOpen) {
      trackFunnelStep('crafter_funnel', 'crafter_modal_opened', {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crafter-modal-title"
    >
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="crafter-modal-title">Quero ser um Crafter</h2>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            disabled={loading}
            aria-label="Fechar modal"
            type="button"
          >
            &times;
          </button>
        </div>

        {success ? (
          <div className={styles.successContent} role="status" aria-live="polite">
            <div className={styles.successIcon} aria-hidden="true">🎉</div>
            <h3>Inscricao recebida com sucesso!</h3>
            <p>Enviamos um e-mail de confirmacao para voce. Nossa selecao acontece <strong>mensalmente</strong> — fique atento ao seu e-mail!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.crafterForm}>
            {/* Aviso de seleção mensal */}
            <div className={styles.selectionNotice}>
              <span className={styles.noticeIcon}>📅</span>
              <p>A selecao de novos Crafters acontece <strong>mensalmente</strong>. Preencha seus dados e aguarde nosso contato!</p>
            </div>

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
                <label htmlFor="rede_social">Rede Social (LinkedIn, GitHub, Instagram...)</label>
                <input
                  type="text"
                  id="rede_social"
                  name="rede_social"
                  value={formData.rede_social}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/seu-perfil"
                />
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
                <label htmlFor="area_interesse">Area de Interesse</label>
                <select
                  id="area_interesse"
                  name="area_interesse"
                  value={formData.area_interesse}
                  onChange={handleInputChange}
                >
                  <option value="">Selecione uma area...</option>
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
                placeholder="Conte um pouco sobre voce ou seus objetivos..."
              />
            </div>

            {error && <div className={styles.errorMessage} role="alert">{error}</div>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Inscricao'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CrafterModal;
