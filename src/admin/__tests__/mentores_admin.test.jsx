import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import AdminLayout from '../AdminLayout.jsx';
import { adminStore } from '../../lib/adminStore.js';

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
      React.createElement(MemoryRouter, { initialEntries: ['/mentores'] },
        React.createElement(AdminLayout)
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