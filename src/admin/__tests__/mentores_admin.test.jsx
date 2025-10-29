import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { adminStore } from '../../lib/adminStore.js';
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

describe('Admin Mentores - layout e remoção', () => {
  beforeEach(() => {
    localStorage.removeItem('cc_admin_store');
    adminStore.initSeeds();
  });

  it('renderiza cards de mentores e confirma remoção', async () => {
    const { container, unmount } = render(
      React.createElement(MemoryRouter, { initialEntries: ['/admin/mentores'] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/admin', element: React.createElement(AdminLayout) },
            React.createElement(Route, { path: 'mentores', element: React.createElement(Mentores) })
          )
        )
      )
    );
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    // deve renderizar ao menos um card
    const cards = () => container.querySelectorAll('.mentorAdminCard');
    expect(cards().length).toBeGreaterThan(0);

    // Remover primeiro mentor visível
    const beforeCount = adminStore.listMentors().length;
    const removeBtn = container.querySelector('.mentorAdminCard .actions button:nth-child(2)');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    removeBtn?.click();
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    const afterCount = adminStore.listMentors().length;
    expect(afterCount).toBe(beforeCount - 1);
    unmount();
  });
});