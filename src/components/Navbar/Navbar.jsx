// src/components/Navbar/Navbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FaBars, FaTimes, FaUser, FaSignOutAlt, FaShoppingBag, FaChevronDown } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';

import logo from '../../assets/logo-codecraft.svg';
import { useAuth } from '../../context/useAuth';

import styles from './Navbar.module.css';

/**
 * Componente da Barra de Navegacao
 * Inclui o logo, links de navegacao, menu mobile e area do usuario logado.
 */
const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const location = useLocation();
  const { user, isAuthenticated, logout, loading } = useAuth();

  // Fecha o menu do usuario ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    closeMobileMenu();
    await logout();
  };

  // Pega o primeiro nome do usuario
  const firstName = user?.name ? user.name.split(' ')[0] : 'Usuario';

  return (
    <nav className={styles.navbar} aria-label="Navegacao principal">
      <div className={styles.navbarContainer}>

        {/* 1. Logo */}
        <Link to="/" className={styles.logoWrapper} onClick={closeMobileMenu}>
          <img src={logo} alt="CodeCraft Gen-Z Logo" className={styles.logo} />
        </Link>

        {/* 2. Links de Navegacao (Desktop) */}
        <ul id="nav-menu" className={isMobileMenuOpen ? `${styles.navMenu} ${styles.active}` : styles.navMenu}>

          <li className={styles.navItem}>
            <Link
              to="/"
              className={`${styles.navLink} ${isActiveLink('/') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              Inicio
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              to="/desafios"
              className={`${styles.navLink} ${isActiveLink('/desafios') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              Desafios
            </Link>
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
            <Link
              to="/mentoria"
              className={`${styles.navLink} ${isActiveLink('/mentoria') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              Mentorias
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              to="/ranking"
              className={`${styles.navLink} ${isActiveLink('/ranking') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              Ranking
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              to="/feedbacks"
              className={`${styles.navLink} ${isActiveLink('/feedbacks') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              Feedbacks
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              to="/aplicativos"
              className={`${styles.navLink} ${isActiveLink('/aplicativos') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              Aplicativos
            </Link>
          </li>

          {/* Area do Usuario - Condicional */}
          {!loading && (
            isAuthenticated ? (
              /* Usuario Logado - Menu Desktop */
              <li className={`${styles.navItem} ${styles.userMenuWrapper}`} ref={userMenuRef}>
                <button
                  className={styles.userButton}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <span className={styles.userAvatar}>
                    <FaUser />
                  </span>
                  <span className={styles.userName}>Ola, {firstName}</span>
                  <FaChevronDown className={`${styles.userChevron} ${isUserMenuOpen ? styles.userChevronOpen : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className={styles.userDropdown}>
                    <div className={styles.userDropdownHeader}>
                      <span className={styles.userDropdownName}>{user?.name}</span>
                      <span className={styles.userDropdownEmail}>{user?.email}</span>
                    </div>
                    <div className={styles.userDropdownDivider} />
                    <Link
                      to="/minha-conta"
                      className={styles.userDropdownItem}
                      onClick={() => { setIsUserMenuOpen(false); closeMobileMenu(); }}
                    >
                      <FaShoppingBag />
                      Minhas Compras
                    </Link>
                    <Link
                      to="/minha-conta"
                      className={styles.userDropdownItem}
                      onClick={() => { setIsUserMenuOpen(false); closeMobileMenu(); }}
                    >
                      <FaUser />
                      Meu Perfil
                    </Link>
                    <div className={styles.userDropdownDivider} />
                    <button
                      className={styles.userDropdownItemLogout}
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt />
                      Sair
                    </button>
                  </div>
                )}

                {/* Menu Mobile - Links diretos */}
                <div className={styles.userMobileLinks}>
                  <Link
                    to="/minha-conta"
                    className={styles.navLink}
                    onClick={closeMobileMenu}
                  >
                    <FaShoppingBag /> Minhas Compras
                  </Link>
                  <button
                    className={`${styles.navLink} ${styles.logoutMobileBtn}`}
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt /> Sair
                  </button>
                </div>
              </li>
            ) : (
              /* Usuario Nao Logado - Botao de Entrar */
              <li className={styles.navItem}>
                <Link
                  to="/login"
                  className={`${styles.navLink} ${styles.navLinkCta}`}
                  onClick={closeMobileMenu}
                >
                  Entrar
                </Link>
              </li>
            )
          )}
        </ul>

        {/* 3. Icone do Menu Mobile (Hamburguer) */}
        <button
          className={styles.mobileIcon}
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="nav-menu"
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

      </div>
    </nav>
  );
};

export default Navbar;
