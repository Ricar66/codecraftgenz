// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import ProtectedRoute from './admin/ProtectedRoute.jsx';
import heroBackground from './assets/hero-background.svg';
import CookieConsent from './components/CookieConsent/CookieConsent';
import Footer from './components/Footer';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { ToastProvider } from './components/UI/Toast';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Lazy load das paginas para melhor performance
const HomePage = lazy(() => import('./pages/HomePage/HomePage.jsx'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const AppHubPage = lazy(() => import('./pages/AppHubPage.jsx'));
const AppPurchasePage = lazy(() => import('./pages/AppPurchasePage.jsx'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage.jsx'));
const CacheMaintenancePage = lazy(() => import('./pages/CacheMaintenancePage.jsx'));
const ForCompaniesPage = lazy(() => import('./pages/ForCompaniesPage.jsx'));
const SobrePage = lazy(() => import('./pages/SobrePage.jsx'));
const HubDownloadPage = lazy(() => import('./pages/HubDownloadPage.jsx'));
const PerfilPage = lazy(() => import('./pages/PerfilPage/PerfilPage.jsx'));

// Legal pages
const HelpPage = lazy(() => import('./pages/HelpPage.jsx'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.jsx'));
const TermsOfUsePage = lazy(() => import('./pages/TermsOfUsePage.jsx'));
const AvaliacaoPage = lazy(() => import('./pages/AvaliacaoPage.jsx'));

// Admin pages - lazy loaded
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'));
const AdminProjetos = lazy(() => import('./admin/AdminProjetos.jsx'));
const AdminApps = lazy(() => import('./admin/AdminApps.jsx'));
const AdminCategorias = lazy(() => import('./admin/AdminCategorias.jsx'));
const AdminProposals = lazy(() => import('./admin/AdminProposals.jsx'));
const AdminParcerias = lazy(() => import('./admin/AdminParcerias.jsx'));
const AdminPagamentos = lazy(() => import('./admin/AdminPagamentos.jsx'));
const AdminFinancas = lazy(() => import('./admin/AdminFinancas.jsx'));
const AdminLicencas = lazy(() => import('./admin/AdminLicencas.jsx'));
const AdminNFSe = lazy(() => import('./admin/AdminNFSe.jsx'));
const LeadsDashboard = lazy(() => import('./admin/LeadsDashboard.jsx'));

// Admin sub-pages
const Dashboard = lazy(() => import('./admin/AdminLayout.jsx').then(m => ({ default: m.Dashboard })));
const AdminUsuarios = lazy(() => import('./admin/AdminUsuarios.jsx'));
const AdminConfig = lazy(() => import('./admin/AdminConfig.jsx'));
const AdminMetas = lazy(() => import('./admin/AdminMetas.jsx'));
const AdminDiscord = lazy(() => import('./admin/AdminDiscord.jsx'));
const AdminAvaliacoes = lazy(() => import('./admin/AdminAvaliacoes.jsx'));

const PageLoader = () => (
  <div
    style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '20px'
    }}
    aria-label="Carregando página"
    role="status"
  >
    <div
      style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#00E4F2',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

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
          <main id="main-content" className="app-content" style={{ flex: 1 }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/projetos" element={<ProjectsPage />} />
                {/* URLs legadas da Comunidade Craft (removida 2026-06-27) — redirect p/ home preserva SEO. */}
                <Route path="/desafios" element={<Navigate to="/" replace />} />
                <Route path="/desafios/*" element={<Navigate to="/" replace />} />
                <Route path="/ranking" element={<Navigate to="/" replace />} />
                <Route path="/feedbacks" element={<Navigate to="/" replace />} />
                <Route path="/mentoria" element={<Navigate to="/" replace />} />
                <Route path="/crafter/:id" element={<Navigate to="/" replace />} />
                <Route path="/onboarding" element={<Navigate to="/" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/reset-password" element={<PasswordResetPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/aplicativos" element={<AppHubPage />} />
                <Route path="/aplicativos/hub" element={<HubDownloadPage />} />
                <Route path="/para-empresas" element={<ForCompaniesPage />} />
                <Route path="/sobre" element={<SobrePage />} />
                <Route path="/ajuda" element={<HelpPage />} />
                <Route path="/politica-privacidade" element={<PrivacyPolicyPage />} />
                <Route path="/termos-uso" element={<TermsOfUsePage />} />
                <Route path="/avaliacao" element={<AvaliacaoPage />} />
                <Route path="/cache/clear" element={<CacheMaintenancePage />} />
                <Route path="/apps/:id/compra" element={<AppPurchasePage />} />
                <Route path="/apps/:id/sucesso" element={<OrderSuccessPage />} />
                <Route path="/minha-conta" element={<Navigate to="/perfil" replace />} />
                <Route path="/perfil" element={<PerfilPage />} />
                <Route path="/admin" element={
                  <ProtectedRoute allowed={["admin","editor","team"]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="usuarios" element={
                    <ProtectedRoute allowed={["admin"]}>
                      <AdminUsuarios />
                    </ProtectedRoute>
                  } />
                  <Route path="projetos" element={<AdminProjetos />} />
                  <Route path="apps" element={<AdminApps />} />
                  <Route path="categorias" element={
                    <ProtectedRoute allowed={["admin"]}>
                      <AdminCategorias />
                    </ProtectedRoute>
                  } />
                  <Route path="propostas" element={<AdminProposals />} />
                  <Route path="parcerias" element={<AdminParcerias />} />
                  <Route path="financas" element={<AdminFinancas />} />
                  <Route path="licencas" element={
                    <ProtectedRoute allowed={["admin"]}>
                      <AdminLicencas />
                    </ProtectedRoute>
                  } />
                  <Route path="pagamentos" element={
                    <ProtectedRoute allowed={["admin"]}>
                      <AdminPagamentos />
                    </ProtectedRoute>
                  } />
                  <Route path="nfse" element={
                    <ProtectedRoute allowed={["admin"]}>
                      <AdminNFSe />
                    </ProtectedRoute>
                  } />
                  <Route path="leads" element={
                    <ProtectedRoute allowed={["admin"]}>
                      <LeadsDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="metas" element={
                    <ProtectedRoute allowed={["admin","editor","team"]}>
                      <AdminMetas />
                    </ProtectedRoute>
                  } />
                  <Route path="discord" element={
                    <ProtectedRoute allowed={["admin"]}>
                      <AdminDiscord />
                    </ProtectedRoute>
                  } />
                  <Route path="avaliacoes" element={
                    <ProtectedRoute allowed={["admin","editor","team"]}>
                      <AdminAvaliacoes />
                    </ProtectedRoute>
                  } />
                  <Route path="config" element={
                    <ProtectedRoute allowed={["admin"]}>
                      <AdminConfig />
                    </ProtectedRoute>
                  } />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
          <CookieConsent />
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;
