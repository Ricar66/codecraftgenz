// src/App.jsx
// teste
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Páginas
import HomePage from './pages/HomePage/HomePage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';

/**
 * Componente principal da aplicação
 * Gerencia o roteamento entre as diferentes páginas
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/projetos" element={<ProjectsPage />} />
    </Routes>
  );
}

export default App;