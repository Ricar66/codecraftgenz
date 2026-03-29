// src/components/PartnerModal/PartnerModal.jsx
import React, { useState, useEffect } from 'react';

import { apiRequest } from '../../lib/apiConfig.js';
import { trackFunnelStep } from '../../services/analyticsAPI.js';

import styles from './PartnerModal.module.css';

const TIPOS_PARCERIA = [
  'Parceria Tecnológica',
  'Investimento',
  'Patrocínio',
  'Contratação de Squads',
  'Mentoria Corporativa',
  'Programa de Estágio',
  'Outro',
];

const PartnerModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    nomeContato: '',
    email: '',
    telefone: '',
    empresa: '',
    cargo: '',
    site: '',
    tipoParceria: '',
    mensagem: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'nomeContato':
        if (!value.trim() || value.trim().length < 2) return 'Informe o nome do contato (mín. 2 caracteres)';
        return undefined;
      case 'email':
        if (!value.trim()) return 'Informe um e-mail válido';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Formato de e-mail inválido';
        return undefined;
      case 'telefone': {
        const digits = value.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 11) return 'Informe DDD + número (10 ou 11 dígitos)';
        return undefined;
      }
      case 'empresa':
        if (!value.trim() || value.trim().length < 2) return 'Informe a empresa (mín. 2 caracteres)';
        return undefined;
      case 'tipoParceria':
        if (!value) return 'Selecione o tipo de parceria';
        return undefined;
      case 'mensagem':
        if (!value.trim() || value.trim().length < 20) return 'A mensagem deve ter no mínimo 20 caracteres';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: err }));
  };

  const validateForm = () => {
    const errors = [];
    const fErrors = {};

    if (!formData.nomeContato.trim() || formData.nomeContato.trim().length < 2) {
      errors.push('Nome do contato é obrigatório (mín. 2 caracteres)');
      fErrors.nomeContato = 'Informe o nome do contato (mín. 2 caracteres)';
    }

    if (!formData.email.trim()) {
      errors.push('E-mail é obrigatório');
      fErrors.email = 'Informe um e-mail válido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.push('E-mail inválido');
      fErrors.email = 'Formato de e-mail inválido';
    }

    const digits = formData.telefone.replace(/\D/g, '');
    if (!formData.telefone.trim() || digits.length < 10 || digits.length > 11) {
      errors.push('Telefone inválido');
      fErrors.telefone = 'Informe DDD + número (10 ou 11 dígitos)';
    }

    if (!formData.empresa.trim() || formData.empresa.trim().length < 2) {
      errors.push('Empresa é obrigatória (mín. 2 caracteres)');
      fErrors.empresa = 'Informe a empresa (mín. 2 caracteres)';
    }

    if (!formData.tipoParceria) {
      errors.push('Tipo de parceria é obrigatório');
      fErrors.tipoParceria = 'Selecione o tipo de parceria';
    }

    if (!formData.mensagem.trim() || formData.mensagem.trim().length < 20) {
      errors.push('Mensagem deve ter no mínimo 20 caracteres');
      fErrors.mensagem = 'A mensagem deve ter no mínimo 20 caracteres';
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

    const payload = {
      nomeContato: formData.nomeContato,
      email: formData.email,
      telefone: formData.telefone,
      empresa: formData.empresa,
      cargo: formData.cargo,
      site: formData.site,
      tipoParceria: formData.tipoParceria,
      mensagem: formData.mensagem,
    };

    try {
      await apiRequest('/api/parcerias', { method: 'POST', body: JSON.stringify(payload) });

      // Notifica admin
      apiRequest('/api/parcerias/notify', {
        method: 'POST',
        body: JSON.stringify({
          to: 'codecraftgenz@gmail.com',
          nomeContato: formData.nomeContato,
          email: formData.email,
          telefone: formData.telefone,
          empresa: formData.empresa,
          cargo: formData.cargo,
          site: formData.site,
          tipoParceria: formData.tipoParceria,
          mensagem: formData.mensagem,
        }),
      }).catch(() => {});

      // Email de boas-vindas ao parceiro
      apiRequest('/api/parcerias/welcome', {
        method: 'POST',
        body: JSON.stringify({
          to: formData.email,
          nome: formData.nomeContato,
          empresa: formData.empresa,
        }),
      }).catch(() => {});

      trackFunnelStep('partnership_funnel', 'partner_form_submitted', {
        tipo: formData.tipoParceria,
        empresa: formData.empresa,
      });

      setSuccess(true);
      setFormData({
        nomeContato: '', email: '', telefone: '', empresa: '', cargo: '',
        site: '', tipoParceria: '', mensagem: '',
      });

      setTimeout(() => { setSuccess(false); onClose(); }, 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) { setSuccess(false); setError(null); onClose(); }
  };

  useEffect(() => {
    if (isOpen) trackFunnelStep('partnership_funnel', 'partner_modal_opened', {});
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="partner-modal-title">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="partner-modal-title">Seja um Parceiro</h2>
          <button className={styles.closeBtn} onClick={handleClose} disabled={loading} aria-label="Fechar modal" type="button">&times;</button>
        </div>

        {success ? (
          <div className={styles.successContent} role="status" aria-live="polite">
            <div className={styles.successIcon} aria-hidden="true">{'\u{1F91D}'}</div>
            <h3>Proposta recebida com sucesso!</h3>
            <p>Analisamos propostas semanalmente e entraremos em contato em breve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.partnerForm}>
            <div className={styles.selectionNotice}>
              <span className={styles.noticeIcon}>{'\u{1F4C5}'}</span>
              <p>Analisamos propostas de parceria <strong>semanalmente</strong>. Preencha seus dados e aguarde nosso contato!</p>
            </div>

            {/* Nome do contato */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="nomeContato">Nome do contato *</label>
                <input type="text" id="nomeContato" name="nomeContato" value={formData.nomeContato} onChange={handleInputChange} onBlur={handleBlur} placeholder="Nome completo do contato" required />
                {fieldErrors.nomeContato && <div className={styles.fieldError}>{fieldErrors.nomeContato}</div>}
              </div>
            </div>

            {/* Email + Telefone */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email corporativo *</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} placeholder="contato@empresa.com" required />
                {fieldErrors.email && <div className={styles.fieldError}>{fieldErrors.email}</div>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="telefone">Telefone *</label>
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                    if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
                    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
                    else if (v.length > 0) v = `(${v}`;
                    setFormData(prev => ({ ...prev, telefone: v }));
                  }}
                  onBlur={handleBlur}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  required
                />
                {fieldErrors.telefone && <div className={styles.fieldError}>{fieldErrors.telefone}</div>}
              </div>
            </div>

            {/* Empresa + Cargo */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="empresa">Empresa/Organização *</label>
                <input type="text" id="empresa" name="empresa" value={formData.empresa} onChange={handleInputChange} onBlur={handleBlur} placeholder="Nome da empresa ou organização" required />
                {fieldErrors.empresa && <div className={styles.fieldError}>{fieldErrors.empresa}</div>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="cargo">Cargo</label>
                <input type="text" id="cargo" name="cargo" value={formData.cargo} onChange={handleInputChange} placeholder="Seu cargo (opcional)" />
              </div>
            </div>

            {/* Site */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="site">Site da empresa</label>
                <input type="url" id="site" name="site" value={formData.site} onChange={handleInputChange} placeholder="https://suaempresa.com.br" />
              </div>
            </div>

            {/* Tipo de parceria */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="tipoParceria">Tipo de parceria *</label>
                <select id="tipoParceria" name="tipoParceria" value={formData.tipoParceria} onChange={handleInputChange} onBlur={handleBlur} required>
                  <option value="">Selecione o tipo de parceria...</option>
                  {TIPOS_PARCERIA.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
                {fieldErrors.tipoParceria && <div className={styles.fieldError}>{fieldErrors.tipoParceria}</div>}
              </div>
            </div>

            {/* Mensagem */}
            <div className={styles.formGroup}>
              <label htmlFor="mensagem">Mensagem/Proposta *</label>
              <textarea id="mensagem" name="mensagem" value={formData.mensagem} onChange={handleInputChange} onBlur={handleBlur} placeholder="Descreva sua proposta de parceria com detalhes (mín. 20 caracteres)..." required />
              {fieldErrors.mensagem && <div className={styles.fieldError}>{fieldErrors.mensagem}</div>}
            </div>

            {error && <div className={styles.errorMessage} role="alert">{error}</div>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Proposta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PartnerModal;
