// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { FaGithub, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import ProtectedRoute from './admin/ProtectedRoute.jsx';
import heroBackground from './assets/hero-background.svg';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { LoadingOverlay } from './components/UI/Loading';
import { ToastProvider } from './components/UI/Toast';

// Lazy load das paginas para melhor performance
const HomePage = lazy(() => import('./pages/HomePage/HomePage.jsx'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'));
const FeedbacksPage = lazy(() => import('./pages/FeedbacksPage.jsx'));
const MentoriaPage = lazy(() => import('./pages/MentoriaPage.jsx'));
const RankingPage = lazy(() => import('./pages/RankingPage.jsx'));
const DesafiosPage = lazy(() => import('./pages/DesafiosPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const AppHubPage = lazy(() => import('./pages/AppHubPage.jsx'));
const AppsPage = lazy(() => import('./pages/AppsPage.jsx'));
const AppPurchasePage = lazy(() => import('./pages/AppPurchasePage.jsx'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage.jsx'));
const CacheMaintenancePage = lazy(() => import('./pages/CacheMaintenancePage.jsx'));

// Admin pages - lazy loaded
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'));
const AdminCrafters = lazy(() => import('./admin/AdminCrafters.jsx'));
const AdminEquipes = lazy(() => import('./admin/AdminEquipes.jsx'));
const AdminIdeias = lazy(() => import('./admin/AdminIdeias.jsx'));
const AdminInscricoes = lazy(() => import('./admin/AdminInscricoes'));
const AdminPagamentos = lazy(() => import('./admin/AdminPagamentos.jsx'));

// Admin sub-pages (imported dynamically from AdminLayout)
const Dashboard = lazy(() => import('./admin/AdminLayout.jsx').then(m => ({ default: m.Dashboard })));
const Usuarios = lazy(() => import('./admin/AdminLayout.jsx').then(m => ({ default: m.Usuarios })));
const Mentores = lazy(() => import('./admin/AdminLayout.jsx').then(m => ({ default: m.Mentores })));
const Ranking = lazy(() => import('./admin/AdminLayout.jsx').then(m => ({ default: m.Ranking })));
const Projetos = lazy(() => import('./admin/AdminLayout.jsx').then(m => ({ default: m.Projetos })));
const Desafios = lazy(() => import('./admin/AdminLayout.jsx').then(m => ({ default: m.Desafios })));
const Financas = lazy(() => import('./admin/AdminLayout.jsx').then(m => ({ default: m.Financas })));
const Config = lazy(() => import('./admin/AdminLayout.jsx').then(m => ({ default: m.Config })));
const Apps = lazy(() => import('./admin/AdminLayout.jsx').then(m => ({ default: m.Apps })));

/**
 * Componente de fallback para carregamento de paginas
 */
const PageLoader = () => (
  <LoadingOverlay message="Carregando pagina..." />
);

/**
 * Componente principal da aplicacao
 * Gerencia o roteamento entre as diferentes paginas
 */
function App() {
  const location = useLocation();

  const pagesWithoutHeroBackground = [];
  const shouldShowHeroBackground = !pagesWithoutHeroBackground.includes(location.pathname);

  return (
    <ToastProvider position="top-right" maxToasts={5}>
      <ErrorBoundary variant="page" showDetails={process.env.NODE_ENV === 'development'}>
        <div
          className="app-root app-background"
          style={{
            backgroundImage: shouldShowHeroBackground ? `url(${heroBackground})` : 'none',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div className="app-content" style={{ flex: 1 }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/projetos" element={<ProjectsPage />} />
                <Route path="/feedbacks" element={<FeedbacksPage />} />
                <Route path="/mentoria" element={<MentoriaPage />} />
                <Route path="/ranking" element={<RankingPage />} />
                <Route path="/desafios" element={<DesafiosPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<PasswordResetPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/aplicativos" element={<AppHubPage />} />
                <Route path="/cache/clear" element={<CacheMaintenancePage />} />
                <Route path="/apps" element={
                  <ProtectedRoute allowed={["admin","user","editor","viewer"]}>
                    <AppsPage />
                  </ProtectedRoute>
                } />
                <Route path="/apps/:id/compra" element={<AppPurchasePage />} />
                <Route path="/apps/:id/sucesso" element={<OrderSuccessPage />} />
                <Route path="/admin" element={
                  <ProtectedRoute allowed={["admin","editor"]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="usuarios" element={
                    <ProtectedRoute allowed={["admin"]}>
                      <Usuarios />
                    </ProtectedRoute>
                  } />
                  <Route path="mentores" element={<Mentores />} />
                  <Route path="equipes" element={<AdminEquipes />} />
                  <Route path="crafters" element={<AdminCrafters />} />
                  <Route path="ranking" element={<Ranking />} />
                  <Route path="projetos" element={<Projetos />} />
                  <Route path="apps" element={<Apps />} />
                  <Route path="desafios" element={<Desafios />} />
                  <Route path="inscricoes" element={<AdminInscricoes />} />
                  <Route path="ideias" element={<AdminIdeias />} />
                  <Route path="financas" element={<Financas />} />
                  <Route path="pagamentos" element={
                    <ProtectedRoute allowed={["admin"]}>
                      <AdminPagamentos />
                    </ProtectedRoute>
                  } />
                  <Route path="config" element={<Config />} />
                </Route>
                {/* Fallback: qualquer rota desconhecida redireciona para /admin */}
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </Suspense>
          </div>
          <footer className="site-footer">
            <div className="footer-container">
              <div className="footer-brand">CodeCraft Gen-Z</div>
              <div className="footer-links">
                <a href="/projetos">Projetos</a>
                <a href="/aplicativos">Aplicativos</a>
                <a href="/mentoria">Mentoria</a>
                <a href="/ranking">Ranking</a>
              </div>
              <div className="footer-social" aria-label="Redes sociais">
                <a
                  className="social-link instagram"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-label="Instagram (em breve)"
                >
                  <FaInstagram />
                </a>
                <a
                  className="social-link github"
                  href="https://github.com/CodeCraftgenz"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open("https://github.com/CodeCraftgenz", "_blank", "noopener,noreferrer");
                  }}
                >
                  <FaGithub />
                </a>
                <a
                  className="social-link whatsapp"
                  href="https://wa.me/5535999358856"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open("https://wa.me/5535999358856", "_blank", "noopener,noreferrer");
                  }}
                >
                  <FaWhatsapp />
                </a>
              </div>
              <div className="footer-note">Craftando ideias em software com estilo</div>
            </div>
          </footer>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;
