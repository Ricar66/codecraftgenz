// src/components/Footer/Footer.jsx
import React from 'react';
import { FaInstagram, FaGithub, FaWhatsapp } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import styles from './Footer.module.css';

/**
 * Footer reutilizavel para todas as paginas
 * @param {boolean} showLinks - Exibe links de navegacao (default: true)
 */
const Footer = ({ showLinks = true }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>CodeCraft Gen-Z</div>

        {showLinks && (
          <nav className={styles.links} aria-label="Links do rodape">
            <Link to="/projetos">Projetos</Link>
            <Link to="/aplicativos">Aplicativos</Link>
            <Link to="/mentoria">Mentoria</Link>
            <Link to="/ranking">Ranking</Link>
          </nav>
        )}

        <div className={styles.social} aria-label="Redes sociais">
          <a
            href="#"
            aria-label="Instagram (em breve)"
            className={`${styles.socialLink} ${styles.instagram}`}
          >
            <FaInstagram />
          </a>
          <a
            href="https://github.com/CodeCraftgenz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className={`${styles.socialLink} ${styles.github}`}
          >
            <FaGithub />
          </a>
          <a
            href="https://wa.me/5535999358856"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className={`${styles.socialLink} ${styles.whatsapp}`}
          >
            <FaWhatsapp />
          </a>
        </div>

        <div className={styles.note}>
          Craftando ideias em software com estilo
        </div>

        <div className={styles.copyright}>
          &copy; {currentYear} CodeCraft Gen-Z. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
