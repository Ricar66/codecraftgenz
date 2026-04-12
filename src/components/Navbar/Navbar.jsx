// src/components/Navbar/Navbar.jsx
import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Menu, X, User, LogOut, ShoppingBag, ChevronDown, Building2, LayoutDashboard } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import logo from '../../assets/logo-principal.png';
import { useAuth } from '../../context/useAuth';
import { useCrafterModal } from '../../context/CrafterModalContext.jsx';

import styles from './Navbar.module.css';

/**
 * Componente da Barra de Navegacao
 * Otimizado com memo e useCallback para performance mobile
 */
const Navbar = memo(() => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const location = useLocation();
  const { user, isAuthenticated, logout, loading, hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'editor', 'team']);
  const { open: openCrafterModal } = useCrafterModal();

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

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const isActiveLink = useCallback((path) => {
    return location.pathname === path;
  }, [location.pathname]);

  const handleLogout = useCallback(async () => {
    setIsUserMenuOpen(false);
    closeMobileMenu();
    await logout();
  }, [closeMobileMenu, logout]);

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
              to="/aplicativos"
              className={`${styles.navLink} ${isActiveLink('/aplicativos') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              Aplicativos
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              to="/sobre"
              className={`${styles.navLink} ${isActiveLink('/sobre') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              Sobre
            </Link>
          </li>
          <li className={`${styles.navItem} ${styles.navItemPush}`}>
            <Link
              to="/para-empresas"
              className={`${styles.navLink} ${styles.navLinkB2B} ${isActiveLink('/para-empresas') ? styles.navLinkActive : ''}`}
              onClick={closeMobileMenu}
            >
              <Building2 aria-hidden="true" /> Para Empresas
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
                    <User />
                  </span>
                  <span className={styles.userName}>Ola, {firstName}</span>
                  <ChevronDown className={`${styles.userChevron} ${isUserMenuOpen ? styles.userChevronOpen : ''}`} />
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
                      to="/perfil"
                      className={styles.userDropdownItem}
                      onClick={() => { setIsUserMenuOpen(false); closeMobileMenu(); }}
                    >
                      <User />
                      Meu Perfil
                    </Link>
                    {isStaff && (
                      <Link
                        to="/admin"
                        className={styles.userDropdownItem}
                        onClick={() => { setIsUserMenuOpen(false); closeMobileMenu(); }}
                      >
                        <LayoutDashboard />
                        Painel Admin
                      </Link>
                    )}
                    {!isStaff && (
                      <Link
                        to="/minha-conta"
                        className={styles.userDropdownItem}
                        onClick={() => { setIsUserMenuOpen(false); closeMobileMenu(); }}
                      >
                        <ShoppingBag />
                        Minhas Compras
                      </Link>
                    )}
                    <Link
                      to="/minha-conta"
                      className={styles.userDropdownItem}
                      onClick={() => { setIsUserMenuOpen(false); closeMobileMenu(); }}
                    >
                      <User />
                      Meu Perfil
                    </Link>
                    <div className={styles.userDropdownDivider} />
                    <button
                      className={styles.userDropdownItemLogout}
                      onClick={handleLogout}
                    >
                      <LogOut />
                      Sair
                    </button>
                  </div>
                )}

                {/* Menu Mobile - Links diretos */}
                <div className={styles.userMobileLinks}>
                  {isStaff && (
                    <Link to="/admin" className={styles.navLink} onClick={closeMobileMenu}>
                      <LayoutDashboard /> Painel Admin
                    </Link>
                  )}
                  {!isStaff && (
                    <Link to="/minha-conta" className={styles.navLink} onClick={closeMobileMenu}>
                      <ShoppingBag /> Minhas Compras
                    </Link>
                  )}
                  <Link to="/minha-conta" className={styles.navLink} onClick={closeMobileMenu}>
                    <User /> Meu Perfil
                  </Link>
                  <button
                    className={`${styles.navLink} ${styles.logoutMobileBtn}`}
                    onClick={handleLogout}
                  >
                    <LogOut /> Sair
                  </button>
                </div>
              </li>
            ) : (
              /* Usuario Nao Logado - Entrar + Ser Crafter */
              <>
                <li className={styles.navItem}>
                  <Link
                    to="/login"
                    className={`${styles.navLink} ${styles.navLinkLogin}`}
                    onClick={closeMobileMenu}
                  >
                    Entrar
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <button
                    className={`${styles.navLink} ${styles.navLinkCta}`}
                    onClick={() => { openCrafterModal(); closeMobileMenu(); }}
                  >
                    Ser Crafter →
                  </button>
                </li>
              </>
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
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>

      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
