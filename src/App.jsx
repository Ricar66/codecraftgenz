// src/App.jsx
// teste
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AdminCrafters from './admin/AdminCrafters.jsx';
import AdminEquipes from './admin/AdminEquipes.jsx';
import AdminInscricoes from './admin/AdminInscricoes';
import AdminLayout, { Dashboard, Usuarios, Mentores, Ranking, Projetos, Desafios, Financas, Config } from './admin/AdminLayout.jsx';
import ProtectedRoute from './admin/ProtectedRoute.jsx';
import heroBackground from './assets/hero-background.svg';
import DesafiosPage from './pages/DesafiosPage.jsx';
import FeedbacksPage from './pages/FeedbacksPage.jsx';
import HomePage from './pages/HomePage/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MentoriaPage from './pages/MentoriaPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import RankingPage from './pages/RankingPage.jsx';

/**
 * Componente principal da aplicação
 * Gerencia o roteamento entre as diferentes páginas
 */
function App() {
  return (
    <div 
      className="app-background"
      style={{
        backgroundImage: `url(${heroBackground})`
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
          <Route path="desafios" element={<Desafios />} />
          <Route path="inscricoes" element={<AdminInscricoes />} />
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