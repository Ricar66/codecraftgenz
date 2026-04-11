// src/components/CookieConsent/CookieConsent.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Shield } from 'lucide-react';

import styles from './CookieConsent.module.css';

const CONSENT_KEY = 'cc_cookie_consent';
const TRACKPRO_CONTAINER_ID = 'cmkiqwc3s0005dbvw9zo7y1hf';

/**
 * Carrega o script do TrackPro apenas após consentimento do usuário (LGPD).
 * Evita tracking de terceiros antes do aceite.
 */
function loadTrackPro() {
  if (typeof window === 'undefined') return;
  if (window.__TRACKPRO_LOADED__) return;
  window.__TRACKPRO_LOADED__ = true;

  window.tpLayer = window.tpLayer || [];
  window.tpLayer.push({ 'trackpro.start': new Date().getTime(), event: 'trackpro.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://cdn.trackpro.io/tp.js';
  document.head.appendChild(script);

  // Expõe o container ID para uso nos eventos do leadsAPI
  window.__TRACKPRO_CONTAINER__ = TRACKPRO_CONTAINER_ID;
}

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);

    if (consent === 'accepted') {
      // Usuário já consentiu anteriormente — carrega TrackPro imediatamente
      loadTrackPro();
    } else {
      // Mostra o banner após 1s se o usuário ainda não aceitou
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    // Carrega TrackPro agora que o usuário aceitou
    loadTrackPro();
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
