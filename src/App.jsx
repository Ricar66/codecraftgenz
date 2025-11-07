// src/App.jsx
// teste
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import AdminCrafters from './admin/AdminCrafters.jsx';
import AdminEquipes from './admin/AdminEquipes.jsx';
import AdminIdeias from './admin/AdminIdeias.jsx';
import AdminInscricoes from './admin/AdminInscricoes';
import AdminLayout, { Dashboard, Usuarios, Mentores, Ranking, Projetos, Desafios, Financas, Config, Apps } from './admin/AdminLayout.jsx';
import ProtectedRoute from './admin/ProtectedRoute.jsx';
import heroBackground from './assets/hero-background.svg';
import AppHubPage from './pages/AppHubPage.jsx';
import AppPurchasePage from './pages/AppPurchasePage.jsx';
import AppsPage from './pages/AppsPage.jsx';
import CacheMaintenancePage from './pages/CacheMaintenancePage.jsx';
import DesafiosPage from './pages/DesafiosPage.jsx';
import FeedbacksPage from './pages/FeedbacksPage.jsx';
import HomePage from './pages/HomePage/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MentoriaPage from './pages/MentoriaPage.jsx';
import PasswordResetPage from './pages/PasswordResetPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import RankingPage from './pages/RankingPage.jsx';

/**
 * Componente principal da aplicação
 * Gerencia o roteamento entre as diferentes páginas
 */
function App() {
  const location = useLocation();
  
  // Páginas que não devem ter o fundo hero
  const pagesWithoutHeroBackground = ['/ranking'];
  const shouldShowHeroBackground = !pagesWithoutHeroBackground.includes(location.pathname);

  return (
    <div 
      className="app-background"
      style={{
        backgroundImage: shouldShowHeroBackground ? `url(${heroBackground})` : 'none'
      }}
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projetos" element={<ProjectsPage />} />
        <Route path="/feedbacks" element={<FeedbacksPage />} />
        <Route path="/mentoria" element={<MentoriaPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/desafios" element={<DesafiosPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<PasswordResetPage />} />
        <Route path="/aplicativos" element={<AppHubPage />} />
        <Route path="/cache/clear" element={<CacheMaintenancePage />} />
        <Route path="/apps" element={
          <ProtectedRoute allowed={["admin","user","editor","viewer"]}>
            <AppsPage />
          </ProtectedRoute>
        } />
        <Route path="/apps/:id/compra" element={<AppPurchasePage />} />
        <Route path="/admin" element={
          <ProtectedRoute allowed={["admin","editor"]}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="usuarios" element={<Usuarios />} />
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
          <Route path="config" element={<Config />} />
        </Route>
        {/* Fallback: qualquer rota desconhecida redireciona para /admin */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}

export default App;