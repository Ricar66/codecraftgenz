// src/admin/AdminLayout.jsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../context/useAuth';
import { getMetas } from '../services/metasAPI';

import SuperDashboard from './SuperDashboard.jsx';
import styles from './AdminLayout.module.css';

import './AdminCommon.css';

// Dashboard usa o novo SuperDashboard com gráficos Recharts
export function Dashboard() {
  return <SuperDashboard />;
}

export default function AdminLayout() {
  const { user, logout, hasRole } = useAuth();
  const [globalErr, setGlobalErr] = React.useState(null);
  const [newMetasBadge, setNewMetasBadge] = React.useState(0);
  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('admin_sidebar_open');
    return saved === null ? true : saved === 'true';
  });
  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    try { window.localStorage.setItem('admin_sidebar_open', String(next)); } catch { void 0; }
  };
  React.useEffect(() => {
    const tick = () => {
      try {
        if (typeof window !== 'undefined' && window.__global_last_error__) {
          setGlobalErr(window.__global_last_error__);
        }
      } catch { void 0; }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Badge: metas criadas nas últimas 24h
  React.useEffect(() => {
    getMetas().then(metas => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const recent = metas.filter(m => new Date(m.createdAt).getTime() > cutoff);
      setNewMetasBadge(recent.length);
    }).catch(() => { /* silent */ });
  }, []);
  return (
    <div className={`${styles.adminContainer} ${sidebarOpen ? '' : styles.collapsed} page-with-background`}>
      <aside className={styles.sidebar} data-expanded={sidebarOpen}>
        <div className={styles.brand}>CodeCraft Gen-Z</div>
        <nav className={styles.menu}>
          <NavLink to="/admin" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🏠</span>
            <span className={styles.menuText}>Dashboard</span>
          </NavLink>
          {hasRole(['admin']) && (
            <NavLink to="/admin/usuarios" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
              <span className={styles.menuIcon}>👤</span>
              <span className={styles.menuText}>Usuários</span>
            </NavLink>
          )}
          <NavLink to="/admin/mentores" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🧑‍🏫</span>
            <span className={styles.menuText}>Mentores</span>
          </NavLink>
          <NavLink to="/admin/equipes" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>👥</span>
            <span className={styles.menuText}>Equipes</span>
          </NavLink>
          <NavLink to="/admin/crafters" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🛠️</span>
            <span className={styles.menuText}>Crafters</span>
          </NavLink>
          <NavLink to="/admin/ranking" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🏆</span>
            <span className={styles.menuText}>Ranking</span>
          </NavLink>
          <NavLink to="/admin/projetos" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>📁</span>
            <span className={styles.menuText}>Projetos</span>
          </NavLink>
          <NavLink to="/admin/apps" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🧱</span>
            <span className={styles.menuText}>Aplicativos</span>
          </NavLink>
          <NavLink to="/admin/desafios" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🎯</span>
            <span className={styles.menuText}>Desafios</span>
          </NavLink>
          <NavLink to="/admin/inscricoes" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>📝</span>
            <span className={styles.menuText}>Inscrições</span>
          </NavLink>
          <NavLink to="/admin/financas" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>💳</span>
            <span className={styles.menuText}>Finanças</span>
          </NavLink>
          <NavLink to="/admin/pagamentos" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>💵</span>
            <span className={styles.menuText}>Pagamentos</span>
          </NavLink>
          {hasRole(['admin']) && (
            <NavLink to="/admin/nfse" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
              <span className={styles.menuIcon}>📄</span>
              <span className={styles.menuText}>NFS-e</span>
            </NavLink>
          )}
          {hasRole(['admin']) && (
            <NavLink to="/admin/licencas" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
              <span className={styles.menuIcon}>🔑</span>
              <span className={styles.menuText}>Licenças</span>
            </NavLink>
          )}
          <NavLink to="/admin/ideias" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>💡</span>
            <span className={styles.menuText}>Ideias</span>
          </NavLink>
          <NavLink to="/admin/propostas" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>💼</span>
            <span className={styles.menuText}>Propostas B2B</span>
          </NavLink>
          <NavLink to="/admin/parcerias" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🤝</span>
            <span className={styles.menuText}>Parcerias</span>
          </NavLink>
          {hasRole(['admin']) && (
            <NavLink to="/admin/leads" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
              <span className={styles.menuIcon}>📊</span>
              <span className={styles.menuText}>Leads</span>
            </NavLink>
          )}
          <NavLink to="/admin/metas" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🎯</span>
            <span className={styles.menuText}>
              Metas
              {newMetasBadge > 0 && (
                <span style={{
                  marginLeft: 6,
                  background: '#D12BF2',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  verticalAlign: 'middle',
                }}>{newMetasBadge}</span>
              )}
            </span>
          </NavLink>
          <NavLink to="/admin/config" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>⚙️</span>
            <span className={styles.menuText}>Config</span>
          </NavLink>
        </nav>
        <button className={styles.sidebarToggle} onClick={toggleSidebar} aria-label={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}>
          {sidebarOpen ? '⟨' : '⟩'}
        </button>
      </aside>
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.welcome}>Olá, {user?.name} {user?.role ? `(${user.role})` : ''}</div>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={logout}>Sair</button>
        </header>
        <div className={styles.content}>
          {globalErr && (
            <div className={styles.error} role="alert">
              <div className={styles.fontBold}>Aviso: erro global capturado</div>
              <div className={styles.textSm}>{globalErr.message}</div>
            </div>
          )}
          {/* Render das rotas aninhadas controladas pelo App.jsx */}
          <AdminErrorBoundary>
            <Outlet />
          </AdminErrorBoundary>
        </div>
      </main>

      {/* Estilos inline removidos: todos os estilos vivem nos CSS Modules e folhas dedicadas */}
    </div>
  );
}

// Error boundary para capturar erros em qualquer rota/admin view
class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    window.__admin_last_error__ = { message: String(error?.message || error), stack: errorInfo?.componentStack };
    console.error('AdminErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{
          padding: '12px',
          border: '1px solid #ff4444',
          background: 'rgba(255,68,68,0.1)',
          borderRadius: '8px',
          color: '#ff4444'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Erro ao renderizar a página admin</div>
          <div style={{ marginBottom: 6 }}>{String(this.state.error?.message || this.state.error)}</div>
          {this.state.errorInfo?.componentStack && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#aa0000' }}>{this.state.errorInfo.componentStack}</pre>
          )}
          <div style={{ marginTop: 8, fontSize: 12 }}>Consulte o console para mais detalhes.</div>
        </div>
      );
    }
    return this.props.children;
  }
}
