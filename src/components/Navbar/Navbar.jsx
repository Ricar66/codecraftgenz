// src/components/Navbar/Navbar.jsx
import React, { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';

import logo from '../../assets/logo-codecraft.svg';

import styles from './Navbar.module.css';

/*
 * Componente da Barra de Navegação
 * Inclui o logo, links de navegação e menu mobile.
 */
const Navbar = () => {
  // Estado para controlar se o menu mobile está aberto ou fechado
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Função para alternar o estado do menu mobile
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>
        
        {/* 1. Logo */}
        <div className={styles.logoWrapper}>
          <img src={logo} alt="CodeCraft Gen-Z Logo" className={styles.logo} />
        </div>

        {/* 2. Links de Navegação (Desktop) */}
        {/* Usamos a classe 'navMenu' e adicionamos 'active' se o menu mobile estiver aberto */}
        <ul className={isMobileMenuOpen ? `${styles.navMenu} ${styles.active}` : styles.navMenu}>
          
          {/* Baseado nos ícones de área da plataforma */}
          <li className={styles.navItem}>
            <a href="#desafios" className={styles.navLink}>Desafios</a>
          </li>
          <li className={styles.navItem}>
            <a href="#projetos" className={styles.navLink}>Projetos</a>
          </li>
          <li className={styles.navItem}>
            <a href="#mentorias" className={styles.navLink}>Mentorias</a>
          </li>
          <li className={styles.navItem}>
            <a href="#ranking" className={styles.navLink}>Ranking</a>
          </li>
          
          {/* Link de Destaque */}
          <li className={styles.navItem}>
            <a href="#login" className={`${styles.navLink} ${styles.navLinkCta}`}>
              Entrar
            </a>
          </li>
        </ul>

        {/* 3. Ícone do Menu Mobile (Hambúrguer) */}
        <div className={styles.mobileIcon} onClick={toggleMobileMenu}>
          {/* Alterna o ícone com base no estado */}
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;