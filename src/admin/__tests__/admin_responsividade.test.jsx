import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { Dashboard } from '../AdminLayout.jsx';

// O Dashboard hoje delega para o SuperDashboard, que consome /api/dashboard/stats
// (getDashboardStats). Mockamos esse endpoint com a forma real dos dados.
vi.mock('../../lib/apiConfig.js', () => ({
  apiRequest: vi.fn(async (url) => {
    if (String(url).includes('/api/dashboard/stats')) {
      return {
        finance: { paid: 1000, pending: 200 },
        proposals: { total: 5, new: 2, byStatus: { new: 2, contacted: 1 }, recent: [] },
        users: { total: 10 },
        projects: { total: 8, active: 3, completed: 5 },
        apps: { total: 4 },
        chartData: [
          { month: 'Jan', revenue: 100, expenses: 20 },
          { month: 'Fev', revenue: 200, expenses: 30 },
        ],
      };
    }
    return {};
  }),
}));

vi.mock('../../lib/realtime', () => ({
  realtime: { subscribe: () => () => {} },
}));

describe('Admin Dashboard (SuperDashboard)', () => {
  it('renderiza o Centro de Comando com os dados carregados', async () => {
    render(<Dashboard />);

    // Titulo real e estavel do dashboard atual — resiliente a mudancas de CSS Modules.
    await waitFor(() => {
      expect(screen.getByText('Centro de Comando')).toBeTruthy();
    });
    expect(screen.getByText(/Vis[aã]o executiva/i)).toBeTruthy();
  });

  it('nao quebra ao montar (sem erro de render)', async () => {
    const { container } = render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Centro de Comando')).toBeTruthy();
    });
    // Renderizou uma arvore real, nao um estado de erro.
    expect(container.querySelector('*')).toBeTruthy();
    expect(screen.queryByText(/Erro ao carregar dashboard/i)).toBeNull();
  });
});
