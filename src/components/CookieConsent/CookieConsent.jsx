// src/components/CookieConsent/CookieConsent.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Shield } from 'lucide-react';

import styles from './CookieConsent.module.css';

const CONSENT_KEY = 'cc_cookie_consent';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mostra o banner após 1s se o usuário ainda não aceitou
    const timer = setTimeout(() => {
      const consent = localStorage.getItem(CONSENT_KEY);
      if (!consent) setVisible(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label="Consentimento de cookies">
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <Cookie size={24} />
        </div>
        <div className={styles.text}>
          <p className={styles.title}>
            <Shield size={14} /> Privacidade e Cookies
          </p>
          <p className={styles.description}>
            Usamos cookies para manter sua sessão ativa, melhorar sua experiência e analisar o uso do site.
            Ao continuar navegando, você concorda com nossa{' '}
            <Link to="/politica-privacidade" className={styles.link}>
              Política de Privacidade
            </Link>.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.acceptBtn} onClick={handleAccept}>
            Aceitar
          </button>
          <Link to="/politica-privacidade" className={styles.moreBtn}>
            Saiba mais
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
