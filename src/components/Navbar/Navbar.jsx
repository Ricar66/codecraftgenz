// src/components/Navbar/Navbar.jsx
import React, { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';

import logo from '../../assets/logo-codecraft.svg';

import styles from './Navbar.module.css';

/**
 * Componente da Barra de Navegação
 * Inclui o logo, links de navegação e menu mobile.
 */
const Navbar = () => {
  // Estado para controlar se o menu mobile está aberto ou fechado
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Hook para obter a rota atual
  const location = useLocation();

  // Função para alternar o estado do menu mobile
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Função para fechar o menu mobile ao clicar em um link
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Função para verificar se o link está ativo
  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>
        
        {/* 1. Logo */}
        <Link to="/" className={styles.logoWrapper} onClick={closeMobileMenu}>
          <img src={logo} alt="CodeCraft Gen-Z Logo" className={styles.logo} />
        </Link>

        {/* 2. Links de Navegação (Desktop) */}
        {/* Usamos a classe 'navMenu' e adicionamos 'active' se o menu mobile estiver aberto */}
        <ul className={isMobileMenuOpen ? `${styles.navMenu} ${styles.active}` : styles.navMenu}>
          
          {/* Baseado nos ícones de área da plataforma */}
          <li className={styles.navItem}>
            <Link 
              to="/" 
              className={`${styles.navLink} ${isActiveLink('/') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              Início
            </Link>
          </li>
          <li className={styles.navItem}>
            <a href="#desafios" className={styles.navLink} onClick={closeMobileMenu}>Desafios</a>
          </li>
          <li className={styles.navItem}>
            <Link 
              to="/projetos" 
              className={`${styles.navLink} ${isActiveLink('/projetos') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              Projetos
            </Link>
          </li>
          <li className={styles.navItem}>
            <a href="#mentorias" className={styles.navLink} onClick={closeMobileMenu}>Mentorias</a>
          </li>
          <li className={styles.navItem}>
            <a href="#ranking" className={styles.navLink} onClick={closeMobileMenu}>Ranking</a>
          </li>
          
          {/* CTA Button */}
          <li className={styles.navItem}>
            <a 
              href="#login" 
              className={`${styles.navLink} ${styles.navLinkCta}`}
              onClick={closeMobileMenu}
            >
              Entrar
            </a>
          </li>
        </ul>

        {/* 3. Ícone do Menu Mobile (Hambúrguer) */}
        <div className={styles.mobileIcon} onClick={toggleMobileMenu}>
          {/* Alterna entre ícone de hambúrguer e X */}
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;