# Plano de Testes – Mercado Pago / Mercado Livre (Sandbox)

Este roteiro valida o fluxo completo de compra de aplicativos, retorno ao app e download controlado (sem auto-download), incluindo casos positivos e negativos.

## Pré-requisitos
- Variáveis de ambiente configuradas:
  - `MERCADO_PAGO_SUCCESS_URL`, `MERCADO_PAGO_FAILURE_URL`, `MERCADO_PAGO_PENDING_URL`
  - `MERCADO_PAGO_WEBHOOK_URL`
- Backend acessível (Azure) e dev (`npm run dev` em 5173) para testes locais.
- Sandbox habilitado na conta Mercado Pago.

## Casos de Teste

### 1. Cartão de crédito (aprovado)
- Acessar `/apps/:id/compra`.
- Iniciar checkout via “Pagar com Mercado Livre”.
- Usar cartão sandbox aprovado.
- Verificar retorno com `status=approved`.
- Confirmar mensagem “Pagamento aprovado” e que o download só inicia após clique no botão.

### 2. Cartão de crédito (recusado)
- Usar cartão sandbox que simule recusa.
- Verificar retorno/falha; não deve habilitar download.
- Mensagem de erro informativa.

### 3. Boleto (pendente → aprovado)
- Selecionar boleto.
- Retornar com `status=pending`.
- Confirmar mensagem “pendente” e download indisponível.
- Após compensação (simulada via sandbox), validar atualização para `approved` e ativação do botão.

### 4. PIX (aprovado)
- Selecionar PIX.
- Confirmar aprovação rápida e habilitação do download apenas por clique.

### 5. Wallet (SDK React)
- Usar “Pagar com Mercado Pago (Wallet)”.
- Verificar renderização do componente Wallet e fluxo de aprovação.

### 6. Webhook
- Configurar URL pública do webhook.
- Verificar recebimento de `payment.updated` e persistência de status.
- Endpoint `GET /api/apps/webhook` responde 200 para validação de acessibilidade.

### 7. Mobile (Android)
- Chrome Android: abrir site, iniciar compra, validar retorno.
- Confirmar fluidez da UI e responsividade.

## Critérios de Aceitação
- 100% dos pagamentos válidos com retorno processado.
- 0 auto-downloads: download apenas após clique do usuário.
- Tempo de resposta da API < 2s (medir com DevTools / logs).
- UX fluida e intuitiva em desktop e Android.

## Observações
- Em desenvolvimento, o backend ajusta `back_urls` usando a origem da requisição para manter retorno coerente.
- Use `npm run test:run` para validar unitários e regressões do fluxo de download.