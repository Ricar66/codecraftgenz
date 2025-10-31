import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import MentoriaPage from '../MentoriaPage.jsx';
import { realtime } from '../../lib/realtime';

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
  let mentors; // lista em memória simulando backend

  beforeEach(() => {
    mentors = [
      { id: 1, name: 'Alice', specialty: 'Frontend', bio: 'React e UI/UX', email: 'alice@codecraft.dev', phone: '(11) 90000-0001', photo: null, status: 'published', visible: true },
      { id: 2, name: 'Bruno', specialty: 'Backend', bio: 'Node e bancos', email: 'bruno@codecraft.dev', phone: '(11) 90000-0002', photo: null, status: 'draft', visible: true },
      { id: 3, name: 'Carla', specialty: 'Data', bio: 'SQL e ETL', email: 'carla@codecraft.dev', phone: '(11) 90000-0003', photo: null, status: 'published', visible: false },
    ];

    vi.spyOn(global, 'fetch').mockImplementation(async (input, init = {}) => {
      const url = typeof input === 'string' ? input : (input?.url || '');
      const method = (init?.method || 'GET').toUpperCase();
      const ok = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

      if (method === 'GET' && url.includes('/api/mentores')) {
        return ok({ data: mentors });
      }

      return ok({}, 404);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('atualiza a lista pública quando um mentor é criado e visível', async () => {
    const { container, unmount } = render(React.createElement(MentoriaPage));
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    // Inicialmente 2 visíveis
    const initialCards = container.querySelectorAll('.mentor-card');
    expect(initialCards.length).toBeGreaterThanOrEqual(1);

    // Simular criação: acrescenta visível e publica evento
    mentors.push({ id: 99, name: 'Novo Mentor', specialty: 'Fullstack', bio: 'Ajuda em práticas modernas.', email: 'novo@codecraft.dev', phone: '(11) 90000-0000', photo: null, status: 'published', visible: true });
    await act(async () => { realtime.publish('mentors_changed', {}); });

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

    // Remover primeiro visível e publicar evento
    const firstVisible = mentors.find(m => m.visible);
    mentors = mentors.filter(m => m.id !== firstVisible.id);
    await act(async () => { realtime.publish('mentors_changed', {}); });

    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    const afterCards = container.querySelectorAll('.mentor-card');
    expect(afterCards.length).toBe(beforeCards.length - 1);
    unmount();
  });
});