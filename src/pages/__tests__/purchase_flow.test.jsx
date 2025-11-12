import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mocks dos serviços usados pela página
vi.mock('../../services/appsAPI.js', () => ({
  getAppById: vi.fn(async (id) => ({ id, name: 'App Teste', mainFeature: 'Feature', price: 199.9 })),
  createPaymentPreference: vi.fn(async () => ({ init_point: 'https://mercadopago.com/mock' })),
  getPurchaseStatus: vi.fn(async () => ({ status: 'approved', download_url: 'https://example.com/download/test.exe' })),
  registerDownload: vi.fn(async () => ({ success: true, download_url: 'https://example.com/download/test.exe' })),
  submitFeedback: vi.fn(async () => ({ success: true })),
}));

import AppPurchasePage from '../AppPurchasePage.jsx';

describe('Fluxo de compra – regressão sem auto-download', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('não inicia download automaticamente após status approved; exige clique no botão', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    const initialEntries = ['/apps/7/compra?preference_id=pref_123&status=approved'];
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/apps/:id/compra" element={<AppPurchasePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Espera renderizar o título e status aprovado
    const titleEl = await screen.findByText('App Teste');
    expect(titleEl).toBeDefined();

    const statusEl = await screen.findByText(/Status da compra: approved/i);
    expect(statusEl).toBeDefined();

    // Não deve abrir janela automaticamente
    expect(openSpy).not.toHaveBeenCalled();

    // Ao clicar no botão de download, deve abrir
    const btn = await screen.findByRole('button', { name: /Baixar executável/i });
    expect(btn).toBeDefined();

    // Simula clique
    btn.click();
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledTimes(1);
    });
    expect(openSpy.mock.calls[0][0]).toMatch(/example\.com\/download\/test\.exe/);
  });
});