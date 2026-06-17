// MIGRAÇÃO ASAAS 2026-06-17:
// CardDirectPayment.jsx foi removido — o fluxo de cartão agora usa checkout hospedado Asaas
// (redirect via init_point). Estes testes validavam o MP CardPayment Brick que não existe mais.
// Novos testes de fluxo de cartão devem verificar que handleCardCheckout chama createPurchase
// e faz window.location.href = init_point — adicionar em purchase_flow.test.jsx quando o
// componente AppPurchasePage for adaptado para testes com react-router v7.
//
// TODO: reescrever estes testes cobrindo:
//   1. handleCardCheckout → chama createPurchase com payment_method_id:'credit_card'
//   2. handleCardCheckout → redireciona para init_point
//   3. handlePixPayment   → chama createDirectPayment com payment_method_id:'pix'
//   4. handlePixPayment   → exibe PixQrPanel quando qr_code_base64 presente
//   5. handlePixPayment   → polling detecta approved e navega para /sucesso

import { describe, it } from 'vitest';

describe('CardDirectPayment (REMOVIDO – migrado para Asaas checkout hospedado)', () => {
  it.skip('placeholder – ver TODO no cabeçalho deste arquivo', () => {});
});
