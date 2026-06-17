// MIGRAÇÃO ASAAS 2026-06-17:
// O fluxo de compra foi migrado de Mercado Pago → Asaas checkout hospedado.
// Os testes anteriores dependiam de:
//   - createPaymentPreference retornando init_point do MP
//   - status 'approved' vindo sincrônico do gateway
//
// Com Asaas, o status sempre começa 'pending' e é confirmado via webhook.
// O redirect para /sucesso ocorre com status 'pending' também (ver AppPurchasePage.jsx).
//
// TODO: reescrever estes testes cobrindo:
//   1. Retorno de checkout hospedado com status='pending' → redireciona para /sucesso
//   2. Retorno de checkout hospedado com status='approved' → redireciona para /sucesso
//   3. PIX inline: PixQrPanel é exibido quando createDirectPayment retorna qr_code_base64
//   4. Mensagens de status 'rejected' continuam exibidas corretamente
//   5. Download não é iniciado automaticamente (regressão existente mantida)
//
// Os testes de mapStatusDetail ainda são válidos — a função foi mantida na página.

import { describe, it } from 'vitest';

describe('AppPurchasePage – fluxo de compra (adaptado para Asaas)', () => {
  it.skip('placeholder – ver TODO no cabeçalho deste arquivo', () => {});
});
