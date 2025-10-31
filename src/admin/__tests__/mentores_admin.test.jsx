import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import AdminLayout, { Mentores } from '../AdminLayout.jsx';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Tester', role: 'admin' }, logout: () => {} })
}));

function render(component) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  root.render(component);
  return { container, root, unmount: () => { root.unmount(); container.remove(); } };
}

describe('Admin Mentores - layout e remoção (API)', () => {
  let mentors; // lista em memória para simular backend

  beforeEach(() => {
    mentors = [
      { id: 1, name: 'Alice', specialty: 'Frontend', bio: 'React e UI/UX', email: 'alice@codecraft.dev', phone: '(11) 90000-0001', photo: null, status: 'published', visible: true },
      { id: 2, name: 'Bruno', specialty: 'Backend', bio: 'Node e bancos', email: 'bruno@codecraft.dev', phone: '(11) 90000-0002', photo: null, status: 'draft', visible: true },
    ];

    vi.spyOn(global, 'fetch').mockImplementation(async (input, init = {}) => {
      const url = typeof input === 'string' ? input : (input?.url || '');
      const method = (init?.method || 'GET').toUpperCase();

      const ok = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

      if (method === 'GET' && url.includes('/api/mentores')) {
        // Admin vê todos (useMentors chama /api/mentores?all=1)
        return ok({ data: mentors });
      }

      if (method === 'DELETE' && url.match(/\/api\/mentores\//)) {
        const idStr = url.split('/').pop();
        const id = Number(idStr);
        mentors = mentors.filter(m => m.id !== id);
        return ok({ removed: { id } });
      }

      // fallback
      return ok({}, 404);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza cards de mentores e confirma remoção via API', async () => {
    const { container, unmount } = render(
      React.createElement(MemoryRouter, { initialEntries: ['/admin/mentores'] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/admin', element: React.createElement(AdminLayout) },
            React.createElement(Route, { path: 'mentores', element: React.createElement(Mentores) })
          )
        )
      )
    );

    await act(async () => { await new Promise(r => setTimeout(r, 30)); });

    const cards = () => container.querySelectorAll('.mentorAdminCard');
    expect(cards().length).toBeGreaterThan(0);

    const beforeCount = cards().length;
    const removeBtn = container.querySelector('.mentorAdminCard .actions button:nth-child(2)');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    removeBtn?.click();

    // aguarda refresh do hook useMentors após DELETE
    await act(async () => { await new Promise(r => setTimeout(r, 40)); });

    const afterCount = cards().length;
    expect(afterCount).toBe(beforeCount - 1);
    unmount();
  });
});