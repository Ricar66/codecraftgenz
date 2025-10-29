// src/components/CallToAction/CrafterModal.jsx
import React, { useEffect, useMemo, useState } from 'react';

import styles from './CrafterModal.module.css';

function maskBrazilPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function validate({ name, email, phone }) {
  const errors = {};
  if (!name || name.trim().length < 3) errors.name = 'Informe seu nome completo.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) errors.email = 'E-mail inválido.';
  const phoneDigits = phone.replace(/\D/g, '');
  if (!(phoneDigits.length === 10 || phoneDigits.length === 11)) errors.phone = 'Telefone inválido.';
  return errors;
}

export default function CrafterModal({ onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const maskedPhone = useMemo(() => maskBrazilPhone(phone), [phone]);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate({ name, email, phone: maskedPhone });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Persistência simples em localStorage
    try {
      const key = 'crafter_signups';
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      current.push({ name, email, phone: maskedPhone, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(current));
    } catch (err) {
      console.warn('Falha ao salvar inscrição no localStorage', err);
    }

    setSubmitted(true);
    const timer = setTimeout(() => onClose?.(), 3000);
    return () => clearTimeout(timer);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="crafter-modal-title" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} aria-label="Fechar" onClick={() => onClose?.()}>✕</button>
        {!submitted ? (
          <>
            <div className={styles.header}>
              <h2 id="crafter-modal-title" className={styles.title}>Inscreva-se para ser um Crafter</h2>
            </div>
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.row}>
                <label className={styles.label} htmlFor="name">Nome completo</label>
                <input id="name" className={styles.input} type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                {errors.name && <span className={styles.error}>{errors.name}</span>}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="email">E-mail</label>
                <input id="email" className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                {errors.email && <span className={styles.error}>{errors.email}</span>}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="phone">Telefone</label>
                <input id="phone" className={styles.input} type="tel" value={maskedPhone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 98765-4321" required />
                {errors.phone && <span className={styles.error}>{errors.phone}</span>}
              </div>

              <div className={styles.actions}>
                <button type="button" className={styles.cancelBtn} onClick={() => onClose?.()}>Cancelar</button>
                <button type="submit" className={styles.submitBtn}>Enviar inscrição</button>
              </div>
            </form>
          </>
        ) : (
          <div className={styles.success}>
            <p>Inscrição enviada! Obrigado por se interessar. Fechando em 3s…</p>
          </div>
        )}
      </div>
    </div>
  );
}