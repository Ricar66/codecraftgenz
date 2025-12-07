import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks dos serviços usados pela página
vi.mock('../../services/appsAPI.js', () => ({
  getAppById: vi.fn(async (id) => ({ id, name: 'App Teste', mainFeature: 'Feature', price: 199.9 })),
  createPaymentPreference: vi.fn(async () => ({ init_point: 'https://mercadopago.com/mock' })),
  getPurchaseStatus: vi.fn(async () => ({ status: 'approved', download_url: 'https://example.com/download/test.exe' })),
  registerDownload: vi.fn(async () => ({ success: true, download_url: 'https://example.com/download/test.exe' })),
  submitFeedback: vi.fn(async () => ({ success: true })),
  activateDeviceLicense: vi.fn(async () => ({ licensed: true, license_key: 'KEY-123' })),
  downloadByEmail: vi.fn(async () => ({ download_url: 'https://example.com/download/test.exe' })),
}));

vi.mock('../../hooks/useAnalytics.js', () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn(),
  }),
}));

import { AuthContext } from '../../context/AuthCore.js';
import AppPurchasePage from '../AppPurchasePage.jsx';
import OrderSuccessPage from '../OrderSuccessPage.jsx';

// Mock do crypto para OrderSuccessPage
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockResolvedValue(new Uint8Array(32)),
    },
  },
});

const renderPage = (initialEntries = ['/apps/7/compra'], mockUser = { name: 'Test User', email: 'test@user.com' }) => {
  return render(
    <AuthContext.Provider value={{ user: mockUser }}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/apps/:id/compra" element={<AppPurchasePage />} />
          <Route path="/apps/:id/sucesso" element={<OrderSuccessPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('Fluxo de compra – regressão sem auto-download', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('redireciona para página de sucesso e não inicia download automaticamente', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    // Simula status approved vindo da URL (retorno do gateway)
    const initialEntries = ['/apps/7/compra?preference_id=pref_123&status=approved'];
    renderPage(initialEntries);

    // Deve redirecionar para a página de sucesso
    // A página de sucesso exibe "Parabéns pela compra" ou o nome do app
    const successMsg = await screen.findByText(/Parabéns pela compra/i);
    expect(successMsg).toBeDefined();

    // Verifica se estamos na página de sucesso procurando pelo botão específico
    const btn = await screen.findByRole('button', { name: /Baixar Executável/i });
    expect(btn).toBeDefined();

    // Não deve abrir janela automaticamente
    expect(openSpy).not.toHaveBeenCalled();

    // Ao clicar no botão de download, deve abrir
    // Precisamos simular o downloadURL vindo da API
    const mods = await import('../../services/appsAPI.js');
    mods.getPurchaseStatus.mockResolvedValue({ status: 'approved', download_url: 'https://example.com/download/test.exe' });
    
    // Simula clique
    btn.click();
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledTimes(1);
    });
    expect(openSpy.mock.calls[0][0]).toMatch(/example\.com\/download\/test\.exe/);
  }, 12000);
});

describe('AppPurchasePage – mensagens de rejeição', () => {
  it('mapeia número do cartão inválido', async () => {
    const mods = await import('../../services/appsAPI.js');
    mods.getPurchaseStatus.mockResolvedValueOnce({ status: 'rejected', status_detail: 'cc_rejected_bad_filled_card_number' });
    const initialEntries = ['/apps/7/compra?status=rejected&payment_id=abc'];
    renderPage(initialEntries);
    const msg = await screen.findByText(/Número do cartão inválido/i);
    expect(msg).toBeDefined();
    const code = await screen.findByText(/cc_rejected_bad_filled_card_number/i);
    expect(code).toBeDefined();
  });

  it('exibe bloco de alto risco quando status_detail é cc_rejected_high_risk', async () => {
    const mods = await import('../../services/appsAPI.js');
    mods.getPurchaseStatus.mockResolvedValueOnce({ status: 'rejected', status_detail: 'cc_rejected_high_risk' });
    const initialEntries = ['/apps/7/compra?status=rejected'];
    renderPage(initialEntries);
    const msg = await screen.findByText(/Transação sinalizada como alto risco/i);
    expect(msg).toBeDefined();
  });
});