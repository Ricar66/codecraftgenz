import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { adminStore } from '../../lib/adminStore.js';
import MentoriaPage from '../MentoriaPage.jsx';

// Stub Navbar para evitar dependências visuais no teste
vi.mock('../../components/Navbar/Navbar', () => ({
  default: () => React.createElement('div', { role: 'navigation' }, 'Navbar')
}));

function render(component) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  root.render(component);
  return { container, root, unmount: () => { root.unmount(); container.remove(); } };
}

describe('Sincronização Mentoria (Admin → Pública)', () => {
  beforeEach(() => {
    // Resetar store
    localStorage.removeItem('cc_admin_store');
    adminStore.initSeeds();
  });

  it('atualiza a lista pública quando um mentor é criado e visível', async () => {
    const { container, unmount } = render(React.createElement(MentoriaPage));
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    // Inicialmente 3 mentores visíveis (seeds)
    const initialCards = container.querySelectorAll('.mentor-card');
    expect(initialCards.length).toBeGreaterThanOrEqual(1);

    // Criar novo mentor visível
    await act(async () => {
      const res = adminStore.createMentor({
      name: 'Novo Mentor', specialty: 'Fullstack', bio: 'Ajuda em práticas modernas.',
      email: 'novo@codecraft.dev', phone: '(11) 90000-0000', photo: null,
      status: 'published', visible: true
      });
      expect(res.ok).toBe(true);
    });

    // Espera o ciclo de atualização
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    const afterCards = container.querySelectorAll('.mentor-card');
    expect(afterCards.length).toBe(initialCards.length + 1);
    unmount();
  });

  it('remove imediatamente da lista pública quando um mentor é deletado', async () => {
    const { container, unmount } = render(React.createElement(MentoriaPage));
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    const beforeCards = container.querySelectorAll('.mentor-card');
    expect(beforeCards.length).toBeGreaterThanOrEqual(1);

    // Remover primeiro mentor dos seeds
    const firstVisible = adminStore.listMentors().find(m => m.visible);
    await act(async () => {
      const rem = adminStore.deleteMentor(firstVisible.id);
      expect(rem.ok).toBe(true);
    });

    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    const afterCards = container.querySelectorAll('.mentor-card');
    expect(afterCards.length).toBe(beforeCards.length - 1);
    unmount();
  });
});