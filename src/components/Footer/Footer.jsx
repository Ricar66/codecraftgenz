// src/components/Footer/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

import styles from './Footer.module.css';

/**
 * Footer reutilizavel para todas as paginas
 * @param {boolean} showLinks - Exibe links de navegacao (default: true)
 * @param {boolean} showSocial - Exibe icones de redes sociais (default: false)
 */
const Footer = ({ showLinks = true, showSocial = false }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>CodeCraft Gen-Z</div>

        {showLinks && (
          <nav className={styles.links} aria-label="Links do rodape">
            <Link to="/projetos">Projetos</Link>
            <Link to="/apps">Apps</Link>
            <Link to="/mentoria">Mentoria</Link>
            <Link to="/ranking">Ranking</Link>
          </nav>
        )}

        {showSocial && (
          <div className={styles.social}>
            <a
              href="https://github.com/codecraftgenz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className={styles.socialLink}
            >
              <span aria-hidden="true">🐙</span>
            </a>
            <a
              href="https://linkedin.com/company/codecraftgenz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className={styles.socialLink}
            >
              <span aria-hidden="true">💼</span>
            </a>
          </div>
        )}

        <div className={styles.note}>
          &copy; {currentYear} CodeCraft Gen-Z. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
