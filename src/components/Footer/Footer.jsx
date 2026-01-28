// src/components/Footer/Footer.jsx
import React, { memo } from 'react';
import { FaInstagram, FaGithub, FaWhatsapp, FaEnvelope, FaHeadset } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import styles from './Footer.module.css';

/**
 * Footer profissional com layout B2B
 * Otimizado para performance mobile com memo
 */
const Footer = memo(({ showLinks = true }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Coluna 1: Brand e Descrição */}
        <div className={styles.column}>
          <div className={styles.brand}>CodeCraft Gen-Z</div>
          <p className={styles.brandDescription}>
            Craftando ideias em software com estilo e tecnologia de ponta.
          </p>
        </div>

        {/* Coluna 2: Navegação */}
        {showLinks && (
          <div className={styles.column}>
            <h4 className={styles.columnTitle}>Navegação</h4>
            <nav className={styles.links} aria-label="Links do rodapé">
              <Link to="/projetos">Projetos</Link>
              <Link to="/aplicativos">Aplicativos</Link>
              <Link to="/mentoria">Mentoria</Link>
              <Link to="/para-empresas">Para Empresas</Link>
            </nav>
          </div>
        )}

        {/* Coluna 3: Suporte */}
        <div className={styles.column}>
          <h4 className={styles.columnTitle}>Suporte</h4>
          <nav className={styles.links}>
            <a href="#faq" aria-label="Central de Ajuda">
              <FaHeadset aria-hidden="true" /> Central de Ajuda
            </a>
            <a href="mailto:suporte@codecraftgenz.com.br" aria-label="Email de suporte">
              <FaEnvelope aria-hidden="true" /> suporte@codecraftgenz.com.br
            </a>
          </nav>
        </div>

        {/* Coluna 4: Legal */}
        <div className={styles.column}>
          <h4 className={styles.columnTitle}>Legal</h4>
          <nav className={styles.links}>
            <Link to="/politica-privacidade">Política de Privacidade</Link>
            <Link to="/termos-uso">Termos de Uso</Link>
          </nav>
        </div>

        {/* Coluna 5: Redes Sociais */}
        <div className={styles.column}>
          <h4 className={styles.columnTitle}>Conecte-se</h4>
          <div className={styles.social} aria-label="Redes sociais">
            <a
              href="#"
              aria-label="Instagram (em breve)"
              className={`${styles.socialLink} ${styles.instagram}`}
            >
              <FaInstagram aria-hidden="true" />
            </a>
            <a
              href="https://github.com/CodeCraftgenz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className={`${styles.socialLink} ${styles.github}`}
            >
              <FaGithub aria-hidden="true" />
            </a>
            <a
              href="https://wa.me/5535999358856"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className={`${styles.socialLink} ${styles.whatsapp}`}
            >
              <FaWhatsapp aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className={styles.copyright}>
        <div className={styles.copyrightInner}>
          &copy; {currentYear} CodeCraft Gen-Z. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
