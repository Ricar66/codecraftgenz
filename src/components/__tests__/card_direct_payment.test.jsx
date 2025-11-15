import { render, screen, waitFor } from '@testing-library/react';
import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../context/useAuth.js', () => ({
  useAuth: () => ({ user: { email: 'tester@example.com' } })
}));

vi.mock('../../services/appsAPI.js', async () => {
  return {
    createDirectPayment: vi.fn(async () => ({ status: 'approved' }))
  };
});

import { createDirectPayment } from '../../services/appsAPI.js';
import CardDirectPayment from '../CardDirectPayment.jsx';

describe('CardDirectPayment – validações e sucesso', () => {
  let cardDataProvider;

  beforeEach(() => {
    import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY = 'pk_test_123';
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });

    class MP {
      constructor() {}
      bricks() {
        return {
          create: (_type, _containerId, settings) => {
            return Promise.resolve({
              submit: () => settings.callbacks.onSubmit(cardDataProvider())
            });
          }
        };
      }
    }
    // Disponibiliza SDK globalmente
    globalThis.MercadoPago = MP;
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exibe erro quando payment_method_id está ausente', async () => {
    cardDataProvider = () => ({ token: 'tok_test' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={7} amount={100} />);

    // Dispara submissão diretamente via callbacks capturados em modo de teste
    await waitFor(() => expect(globalThis.__mpCardCallbacks).toBeDefined());
    await expect(async () => {
      await act(async () => {
        await globalThis.__mpCardCallbacks.onSubmit(cardDataProvider());
      });
    }).rejects.toThrow(/missing payment_method_id/);
  });

  it('exibe erro quando token do cartão não é gerado', async () => {
    cardDataProvider = () => ({ payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={7} amount={100} />);

    await waitFor(() => expect(globalThis.__mpCardCallbacks).toBeDefined());
    await expect(async () => {
      await act(async () => {
        await globalThis.__mpCardCallbacks.onSubmit(cardDataProvider());
      });
    }).rejects.toThrow(/missing card token/);
  });

  it('chama onStatus com approved em fluxo de sucesso', async () => {
    const onStatus = vi.fn();
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={9} amount={199.9} onStatus={onStatus} />);

    await waitFor(() => expect(globalThis.__mpCardCallbacks).toBeDefined());
    await act(async () => {
      await globalThis.__mpCardCallbacks.onSubmit(cardDataProvider());
    });

    await waitFor(() => {
      expect(onStatus).toHaveBeenCalled();
    });
    const [statusArg] = onStatus.mock.calls[0];
    expect(statusArg).toBe('approved');
    expect(createDirectPayment).toHaveBeenCalled();
  });
  
  it('mostra erro quando falta access token (503 NO_ACCESS_TOKEN)', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 503, details: { error: 'NO_ACCESS_TOKEN' } });
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={11} amount={100} />);
    await waitFor(() => expect(globalThis.__mpCardCallbacks).toBeDefined());
    await act(async () => { await globalThis.__mpCardCallbacks.onSubmit(cardDataProvider()); });
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/Configuração do Mercado Pago ausente/i);
  });

  it('mostra erro de rede (502 NETWORK_ERROR)', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 502, details: { error: 'NETWORK_ERROR' } });
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={12} amount={100} />);
    await waitFor(() => expect(globalThis.__mpCardCallbacks).toBeDefined());
    await act(async () => { await globalThis.__mpCardCallbacks.onSubmit(cardDataProvider()); });
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/Falha de rede/i);
  });

  it('mostra mensagem quando MP retorna mp_status e message', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 502, details: { mp_status: 'bad_request', message: 'Dados inválidos' } });
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={13} amount={100} />);
    await waitFor(() => expect(globalThis.__mpCardCallbacks).toBeDefined());
    await act(async () => { await globalThis.__mpCardCallbacks.onSubmit(cardDataProvider()); });
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/Pagamento não foi criado/i);
    expect(alertEl.textContent).toMatch(/Dados inválidos/i);
  });

  it('mostra ajuste binário quando cause 2056', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 400, details: { cause: [{ code: '2056' }] } });
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={14} amount={100} />);
    await waitFor(() => expect(globalThis.__mpCardCallbacks).toBeDefined());
    await act(async () => { await globalThis.__mpCardCallbacks.onSubmit(cardDataProvider()); });
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/modo binário/i);
  });

  it('mostra mensagem genérica 400 com detalhes', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 400, details: { message: 'Campos obrigatórios ausentes' } });
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={15} amount={100} />);
    await waitFor(() => expect(globalThis.__mpCardCallbacks).toBeDefined());
    await act(async () => { await globalThis.__mpCardCallbacks.onSubmit(cardDataProvider()); });
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/Campos obrigatórios ausentes/i);
  });
});

describe('CardDirectPayment – buyerInfo no payload', () => {
  let cardDataProvider;
  beforeEach(() => {
    import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY = 'pk_test_123';
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    class MP { constructor() {} bricks() { return { create: (_t,_c,settings) => Promise.resolve({ submit: () => settings.callbacks.onSubmit(cardDataProvider()) }) }; } }
    globalThis.MercadoPago = MP;
  });

  it('inclui phone e address quando buyer é informado', async () => {
    const buyer = { phone: '11999999999', zip: '01001000', streetName: 'Praça da Sé' };
    render(<CardDirectPayment appId={21} amount={100} buyer={buyer} />);
    await waitFor(() => expect(globalThis.__mpCardCallbacks).toBeDefined());
    await act(async () => { await globalThis.__mpCardCallbacks.onSubmit(cardDataProvider()); });
    const call = createDirectPayment.mock.calls.at(-1);
    expect(call[0]).toBe(21);
    expect(call[1]).toEqual(expect.objectContaining({
      additional_info: expect.objectContaining({
        payer: expect.objectContaining({
          phone: expect.objectContaining({ number: expect.any(String) }),
          address: expect.objectContaining({ zip_code: expect.any(String), street_name: expect.any(String) })
        })
      })
    }));
  });
});
vi.mock('@mercadopago/sdk-react', () => ({
  initMercadoPago: vi.fn(() => {})
}));