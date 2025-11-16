import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
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

vi.mock('@mercadopago/sdk-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    CardPayment: vi.fn(({ onSubmit }) => (
      <div>
        <span>Mocked CardPayment</span>
        <button data-testid="mp-submit" onClick={() => onSubmit(globalThis.__cardDataProvider ? globalThis.__cardDataProvider() : {})}>Pagar</button>
      </div>
    )),
    initMercadoPago: vi.fn(),
  };
});

describe('CardDirectPayment – validações e sucesso', () => {
  let cardDataProvider;

  beforeEach(() => {
    import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY = 'pk_test_123';
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exibe erro quando payment_method_id está ausente', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 400, details: { message: 'Preencha os dados do cartão e use o botão do formulário para enviar' } });
    cardDataProvider = () => ({ token: 'tok_test' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={7} amount={100} />);
    screen.getByTestId('mp-submit').click();
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/Preencha os dados do cartão/i);
  });

  it('exibe erro quando token do cartão não é gerado', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 400, details: { message: 'Token do cartão não foi gerado' } });
    cardDataProvider = () => ({ payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={7} amount={100} />);
    screen.getByTestId('mp-submit').click();
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/Token do cartão não foi gerado/i);
  });

  it('chama onPaymentSuccess com approved em fluxo de sucesso', async () => {
    const onPaymentSuccess = vi.fn();
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={9} amount={199.9} onPaymentSuccess={onPaymentSuccess} />);
    screen.getByTestId('mp-submit').click();
    await waitFor(() => {
      expect(onPaymentSuccess).toHaveBeenCalled();
    });
    expect(createDirectPayment).toHaveBeenCalled();
  });
  
  it('mostra erro quando falta access token (503 NO_ACCESS_TOKEN)', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 503, details: { error: 'NO_ACCESS_TOKEN' } });
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={11} amount={100} />);
    screen.getByTestId('mp-submit').click();
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/Configuração do Mercado Pago ausente/i);
  });

  it('mostra erro de rede (502 NETWORK_ERROR)', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 502, details: { error: 'NETWORK_ERROR' } });
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={12} amount={100} />);
    screen.getByTestId('mp-submit').click();
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/Falha de rede/i);
  });

  it('mostra mensagem quando MP retorna mp_status e message', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 502, details: { mp_status: 'bad_request', message: 'Dados inválidos' } });
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={13} amount={100} />);
    screen.getByTestId('mp-submit').click();
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/Pagamento não foi criado/i);
    expect(alertEl.textContent).toMatch(/Dados inválidos/i);
  });

  it('mostra ajuste binário quando cause 2056', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 400, details: { cause: [{ code: '2056' }] } });
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={14} amount={100} />);
    screen.getByTestId('mp-submit').click();
    const alertEl = await screen.findByRole('alert');
    expect(alertEl.textContent).toMatch(/modo binário/i);
  });

  it('mostra mensagem genérica 400 com detalhes', async () => {
    createDirectPayment.mockRejectedValueOnce({ status: 400, details: { message: 'Campos obrigatórios ausentes' } });
    cardDataProvider = () => ({ token: 'tok_test', payment_method_id: 'visa' });
    globalThis.__cardDataProvider = () => cardDataProvider();
    render(<CardDirectPayment appId={15} amount={100} />);
    screen.getByTestId('mp-submit').click();
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
  });

  it('inclui phone e address quando buyer é informado', async () => {
    const buyer = { phone: '11999999999', zip: '01001000', streetName: 'Praça da Sé' };
    render(<CardDirectPayment appId={21} amount={100} buyer={buyer} />);
    screen.getByTestId('mp-submit').click();
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
// Mock de SDK já definido acima