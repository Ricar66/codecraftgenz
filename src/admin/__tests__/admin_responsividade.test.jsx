import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { Dashboard } from '../AdminLayout.jsx';

vi.mock('../../lib/apiConfig.js', () => ({
  apiRequest: vi.fn(async (url) => {
    if (String(url).includes('/api/dashboard/resumo')) {
      return {
        totais: {
          projetos_ativos: 1,
          projetos_finalizados: 0,
          projetos_rascunho: 0,
          receita_total: 100,
          receita_pendente: 0,
          receita_paga: 100,
          media_progresso: 50,
        },
        evolucao_mensal: [
          { mes: 'Jan', valor: 10 },
          { mes: 'Fev', valor: 20 },
        ],
      };
    }
    if (String(url).includes('/api/projetos')) {
      return {
        data: [
          {
            id: 1,
            titulo: 'Projeto Teste',
            status: 'ongoing',
            preco: 100,
            progresso: 50,
            data_inicio: new Date().toISOString(),
          },
        ],
      };
    }
    return {};
  }),
}));

vi.mock('../../lib/realtime', () => ({
  realtime: { subscribe: () => () => {} },
}));

describe('Admin Responsividade', () => {
  it('renderiza seções chave com classes responsivas no Dashboard', async () => {
    const { container } = render(<Dashboard />);

    await waitFor(() => {
      expect(container.querySelector('.dashboard-header')).toBeTruthy();
      expect(container.querySelector('.kpis')).toBeTruthy();
      expect(container.querySelector('.graficos')).toBeTruthy();
      expect(container.querySelector('.barras')).toBeTruthy();
      expect(container.querySelector('.table')).toBeTruthy();
    });

    const headerControlsRow = container.querySelector('.dashboard-header .row');
    expect(headerControlsRow).toBeTruthy();
  });

  it('usa data-label nas células da tabela para layout mobile', async () => {
    const { container } = render(<Dashboard />);
    await waitFor(() => {
      const anyTd = container.querySelector('.table td');
      expect(anyTd).toBeTruthy();
      expect(anyTd.getAttribute('data-label')).toBeTruthy();
    });
  });
});