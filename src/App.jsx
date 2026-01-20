// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import ProtectedRoute from './admin/ProtectedRoute.jsx';
import heroBackground from './assets/hero-background.svg';
import Footer from './components/Footer';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { ToastProvider } from './components/UI/Toast';

// Lazy load das paginas para melhor performance
const HomePage = lazy(() => import('./pages/HomePage/HomePage.jsx'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'));
const FeedbacksPage = lazy(() => import('./pages/FeedbacksPage.jsx'));
const MentoriaPage = lazy(() => import('./pages/MentoriaPage.jsx'));
const RankingPage = lazy(() => import('./pages/RankingPage.jsx'));
const DesafiosPage = lazy(() => import('./pages/DesafiosPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const AppHubPage = lazy(() => import('./pages/AppHubPage.jsx'));
const AppsPage = lazy(() => import('./pages/AppsPage.jsx'));
const AppPurchasePage = lazy(() => import('./pages/AppPurchasePage.jsx'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage.jsx'));
const CacheMaintenancePage = lazy(() => import('./pages/CacheMaintenancePage.jsx'));
const MyAccountPage = lazy(() => import('./pages/MyAccountPage.jsx'));

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
 * Componente de fallback leve para carregamento de paginas
 * Usa CSS inline para renderizar imediatamente sem dependências externas
 * Melhora LCP ao mostrar conteúdo mais rápido que um spinner pesado
 */
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
          <main id="main-content" className="app-content" style={{ flex: 1 }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/projetos" element={<ProjectsPage />} />
                <Route path="/feedbacks" element={<FeedbacksPage />} />
                <Route path="/mentoria" element={<MentoriaPage />} />
                <Route path="/ranking" element={<RankingPage />} />
                <Route path="/desafios" element={<DesafiosPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
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
                <Route path="/minha-conta" element={<MyAccountPage />} />
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
          </main>
          <Footer />
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;
