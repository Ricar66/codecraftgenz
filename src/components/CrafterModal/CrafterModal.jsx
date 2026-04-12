// src/components/CrafterModal/CrafterModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '../../lib/apiConfig.js';
import { trackFunnelStep } from '../../services/analyticsAPI.js';
import { captureCrafterLead } from '../../services/leadsAPI.js';

import styles from './CrafterModal.module.css';

const REDES_SOCIAIS = [
  { value: 'linkedin', label: 'LinkedIn', prefix: 'https://linkedin.com/in/' },
  { value: 'github', label: 'GitHub', prefix: 'https://github.com/' },
  { value: 'instagram', label: 'Instagram', prefix: 'https://instagram.com/' },
  { value: 'twitter', label: 'X (Twitter)', prefix: 'https://x.com/' },
  { value: 'behance', label: 'Behance', prefix: 'https://behance.net/' },
  { value: 'outro', label: 'Outro', prefix: '' },
];

const CrafterModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    rede_social_tipo: '',
    rede_social_user: '',
    cep: '',
    cidade: '',
    estado: '',
    area_interesse: '',
    mensagem: '',
  });
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const areasInteresse = [
    'Front-end', 'Back-end', 'Dados', 'Design', 'DevOps', 'Outros',
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Busca CEP na API ViaCEP
  const handleCepBlur = useCallback(async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setCepLoading(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
        setFieldErrors(prev => ({ ...prev, cep: undefined, cidade: undefined, estado: undefined }));
      } else {
        setFieldErrors(prev => ({ ...prev, cep: 'CEP não encontrado' }));
      }
    } catch {
      // silently fail — user pode preencher manualmente
    }
    setCepLoading(false);
  }, [formData.cep]);

  // Monta URL completa da rede social
  const getRedeSocialUrl = () => {
    if (!formData.rede_social_tipo || !formData.rede_social_user) return '';
    const rede = REDES_SOCIAIS.find(r => r.value === formData.rede_social_tipo);
    if (!rede) return '';
    if (formData.rede_social_tipo === 'outro') return formData.rede_social_user;
    return `${rede.prefix}${formData.rede_social_user}`;
  };

  const validateForm = () => {
    const errors = [];
    const fErrors = {};

    if (!formData.nome.trim() || formData.nome.trim().length < 2) {
      errors.push('Nome é obrigatório (min. 2 caracteres)');
      fErrors.nome = 'Informe seu nome completo';
    }

    if (!formData.email.trim()) {
      errors.push('E-mail é obrigatório');
      fErrors.email = 'Informe um e-mail válido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.push('E-mail inválido');
      fErrors.email = 'Formato de e-mail inválido';
    }

    if (formData.telefone.trim()) {
      const digits = formData.telefone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        errors.push('Telefone inválido');
        fErrors.telefone = 'Informe DDD + número (10 ou 11 dígitos)';
      }
    }

    if (!formData.cidade.trim()) {
      errors.push('Cidade é obrigatória');
      fErrors.cidade = 'Informe sua cidade';
    }

    if (!formData.estado.trim() || formData.estado.trim().length !== 2) {
      errors.push('UF é obrigatória (2 letras)');
      fErrors.estado = 'Informe a UF (2 letras)';
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

    const redeSocialUrl = getRedeSocialUrl();
    const payload = {
      ...formData,
      rede_social: redeSocialUrl,
    };

    try {
      await apiRequest('/api/inscricoes', { method: 'POST', body: JSON.stringify(payload) });

      // Notifica admin
      apiRequest('/api/inscricoes/notify', {
        method: 'POST',
        body: JSON.stringify({
          to: 'codecraftgenz@gmail.com',
          subject: `Nova inscrição de Crafter: ${formData.nome}`,
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone || '',
          rede_social: redeSocialUrl,
          area_interesse: formData.area_interesse || '',
          cidade: formData.cidade,
          estado: formData.estado,
          mensagem: formData.mensagem || '',
        }),
      }).catch(() => {});

      // Email de boas-vindas ao candidato (enviado via team@codecraftgenz.com.br)
      apiRequest('/api/inscricoes/welcome', {
        method: 'POST',
        body: JSON.stringify({
          to: formData.email,
          from: 'team@codecraftgenz.com.br',
          nome: formData.nome,
        }),
      }).catch(() => {});

      captureCrafterLead(payload).catch(() => {});
      trackFunnelStep('crafter_funnel', 'crafter_form_submitted', {
        area_interesse: formData.area_interesse, cidade: formData.cidade,
      });

      const savedNome = formData.nome;
      const savedEmail = formData.email;

      setSuccess(true);
      setFormData({
        nome: '', email: '', telefone: '', rede_social_tipo: '', rede_social_user: '',
        cep: '', cidade: '', estado: '', area_interesse: '', mensagem: '',
      });

      setTimeout(() => {
        setSuccess(false);
        onClose();
        navigate('/register', { state: { nome: savedNome, email: savedEmail } });
      }, 2500);
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
    if (isOpen) trackFunnelStep('crafter_funnel', 'crafter_modal_opened', {});
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedRede = REDES_SOCIAIS.find(r => r.value === formData.rede_social_tipo);

  return (
    <div className={styles.modalOverlay} onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="crafter-modal-title">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="crafter-modal-title">Quero ser um Crafter</h2>
          <button className={styles.closeBtn} onClick={handleClose} disabled={loading} aria-label="Fechar modal" type="button">&times;</button>
        </div>

        {success ? (
          <div className={styles.successContent} role="status" aria-live="polite">
            <div className={styles.successIcon} aria-hidden="true">🎉</div>
            <h3>Inscrição recebida com sucesso!</h3>
            <p>Enviamos um e-mail de confirmação para você. Nossa seleção acontece <strong>mensalmente</strong>. Agora vamos criar sua conta na plataforma...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.crafterForm}>
            <div className={styles.selectionNotice}>
              <span className={styles.noticeIcon}>📅</span>
              <p>A seleção de novos Crafters acontece <strong>mensalmente</strong>. Preencha seus dados e aguarde nosso contato!</p>
            </div>

            {/* Nome */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="nome">Nome completo *</label>
                <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleInputChange} placeholder="Seu nome completo" required />
                {fieldErrors.nome && <div className={styles.fieldError}>{fieldErrors.nome}</div>}
              </div>
            </div>

            {/* Email + Telefone */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="email">E-mail *</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="seu@email.com" required />
                {fieldErrors.email && <div className={styles.fieldError}>{fieldErrors.email}</div>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="telefone">Telefone</label>
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
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
                {fieldErrors.telefone && <div className={styles.fieldError}>{fieldErrors.telefone}</div>}
              </div>
            </div>

            {/* Rede Social: select + usuario */}
            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: '0 0 160px' }}>
                <label htmlFor="rede_social_tipo">Rede Social</label>
                <select id="rede_social_tipo" name="rede_social_tipo" value={formData.rede_social_tipo} onChange={handleInputChange}>
                  <option value="">Selecione...</option>
                  {REDES_SOCIAIS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="rede_social_user">
                  {formData.rede_social_tipo === 'outro' ? 'Link completo' : 'Seu usuario'}
                </label>
                <div className={styles.socialInputWrapper}>
                  {selectedRede && selectedRede.prefix && (
                    <span className={styles.socialPrefix}>{selectedRede.prefix}</span>
                  )}
                  <input
                    type="text"
                    id="rede_social_user"
                    name="rede_social_user"
                    value={formData.rede_social_user}
                    onChange={handleInputChange}
                    placeholder={formData.rede_social_tipo === 'outro' ? 'https://...' : 'seu-usuario'}
                    className={selectedRede?.prefix ? styles.socialInputWithPrefix : ''}
                  />
                </div>
              </div>
            </div>

            {/* CEP + Cidade + UF */}
            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: '0 0 130px' }}>
                <label htmlFor="cep">CEP</label>
                <input
                  type="text"
                  id="cep"
                  name="cep"
                  value={formData.cep}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
                    setFormData(prev => ({ ...prev, cep: v }));
                  }}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && <div className={styles.fieldHint}>Buscando...</div>}
                {fieldErrors.cep && <div className={styles.fieldError}>{fieldErrors.cep}</div>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="cidade">Cidade *</label>
                <input type="text" id="cidade" name="cidade" value={formData.cidade} onChange={handleInputChange} placeholder="Sua cidade" required />
                {fieldErrors.cidade && <div className={styles.fieldError}>{fieldErrors.cidade}</div>}
              </div>
              <div className={styles.formGroup} style={{ flex: '0 0 60px' }}>
                <label htmlFor="estado">UF *</label>
                <input type="text" id="estado" name="estado" value={formData.estado} onChange={handleInputChange} placeholder="SP" maxLength={2} style={{ textTransform: 'uppercase', textAlign: 'center', padding: '0.6rem 0.4rem' }} required />
                {fieldErrors.estado && <div className={styles.fieldError}>{fieldErrors.estado}</div>}
              </div>
            </div>

            {/* Area de interesse */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="area_interesse">Área de Interesse</label>
                <select id="area_interesse" name="area_interesse" value={formData.area_interesse} onChange={handleInputChange}>
                  <option value="">Selecione uma área...</option>
                  {areasInteresse.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mensagem */}
            <div className={styles.formGroup}>
              <label htmlFor="mensagem">Mensagem (Opcional)</label>
              <textarea id="mensagem" name="mensagem" value={formData.mensagem} onChange={handleInputChange} placeholder="Conte um pouco sobre você ou seus objetivos..." />
            </div>

            {error && <div className={styles.errorMessage} role="alert">{error}</div>}

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
