import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../hooks/useAdminRepo.js', async () => {
  const actual = await vi.importActual('../../hooks/useAdminRepo.js');
  return {
    ...actual,
    useProjects: () => ({ data: [ { id:1, titulo:'Projeto A', owner:'Admin', status:'ongoing', preco: 0, progresso: 10 } ], loading: false, error: '', refresh: vi.fn() }),
    ProjectsRepo: {
      upsert: vi.fn(async (p) => ({ id: p.id || 2 })),
      toggleVisible: vi.fn(async () => ({ ok: true })),
    },
  };
});

vi.mock('../../lib/apiConfig.js', () => ({
  apiRequest: vi.fn(async () => ({ success: true })),
}));

import { ProjectsRepo } from '../../hooks/useAdminRepo.js';
import * as apiCfg from '../../lib/apiConfig.js';
import { Projetos } from '../AdminLayout.jsx';

describe('Admin Projetos – validações e feedback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('valida campos obrigatórios e exibe feedback de erro', async () => {
    render(<Projetos />);
    const saveBtn = await screen.findByRole('button', { name: /Criar Projeto/i });
    saveBtn.click();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Preencha título, owner e status/i);
  });

  it('salva com sucesso e exibe feedback', async () => {
    render(<Projetos />);
    const title = screen.getByLabelText('Título');
    const owner = screen.getByLabelText('Owner');
    const desc = screen.getByLabelText('Descrição do Projeto');
    await userEvent.type(title, 'Proj X');
    await userEvent.type(owner, 'Admin');
    await userEvent.type(desc, 'Descrição longa válida.');
    const saveBtn = await screen.findByRole('button', { name: /Criar Projeto/i });
    saveBtn.click();
    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status.textContent).toMatch(/Projeto criado com sucesso/i);
    });
    expect(ProjectsRepo.upsert).toHaveBeenCalled();
  });

  it('deleta e exibe feedback de sucesso', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Projetos />);
    const delBtn = await screen.findByRole('button', { name: /🗑️/ });
    delBtn.click();
    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status.textContent).toMatch(/Projeto deletado com sucesso/i);
    });
    expect(apiCfg.apiRequest).toHaveBeenCalled();
  });
});