# Pagamentos e Licencas

## Visao Geral

O sistema usa **Mercado Pago** para processar pagamentos de apps no marketplace.
Suporta dois fluxos:

1. **Checkout Redirect** - Redireciona para o Mercado Pago (preferencia)
2. **Pagamento Direto** - Cartao/PIX sem sair do site

## Fluxo de Compra (Checkout Redirect)

```
Comprador                Frontend               Backend               Mercado Pago
    │                       │                      │                       │
    ├─ Seleciona app ──────►│                      │                       │
    ├─ Informa email ──────►│                      │                       │
    │                       ├─ POST /purchase ────►│                       │
    │                       │                      ├── Busca app no DB      │
    │                       │                      ├── Cria/busca guest user│
    │                       │                      ├── Cria Payment (pending)
    │                       │                      ├── Cria Preference ───►│
    │                       │                      │◄── init_point ────────┤
    │                       │◄── { init_point } ───┤                       │
    │◄── Redirect ──────────┤                      │                       │
    │                       │                      │                       │
    ├── Paga no MP ────────────────────────────────────────────────────────►│
    │                       │                      │                       │
    │                       │                      │◄── Webhook ───────────┤
    │                       │                      ├── Atualiza status      │
    │                       │                      ├── Provisiona licencas  │
    │                       │                      ├── Envia email          │
    │                       │                      ├── Gera NFS-e (async)   │
    │                       │                      │                       │
    │◄── Email confirmacao ─┤                      │                       │
    │    (com download link)│                      │                       │
```

## Fluxo de Pagamento Direto (Cartao/PIX)

```
Comprador                Frontend               Backend               Mercado Pago
    │                       │                      │                       │
    ├─ Seleciona app ──────►│                      │                       │
    ├─ Dados do cartao ────►│                      │                       │
    │                       ├── MercadoPago SDK    │                       │
    │                       ├── cardForm.createToken()                      │
    │                       │                      │                       │
    │                       ├─ POST /direct ──────►│                       │
    │                       │   { token, payer }   ├── POST v1/payments ──►│
    │                       │                      │◄── { status } ────────┤
    │                       │                      │                       │
    │                       │                      ├── Se approved:         │
    │                       │                      │   ├── Provisiona licenca
    │                       │                      │   ├── Envia email     │
    │                       │                      │   └── Gera NFS-e     │
    │                       │                      │                       │
    │                       │◄── { payment } ──────┤                       │
    │◄── Pagina de sucesso ─┤                      │                       │
```

## Status de Pagamento

| Status | Descricao | Acao |
|--------|-----------|------|
| `pending` | Aguardando pagamento | Nenhuma |
| `approved` | Pagamento aprovado | Provisiona licencas + email + NFS-e |
| `rejected` | Pagamento rejeitado | Nenhuma |
| `refunded` | Reembolsado | Revoga licencas |
| `cancelled` | Cancelado | Nenhuma |

## Webhook do Mercado Pago

Endpoint: `POST /api/payments/webhook`

```json
// Payload recebido do MP
{
  "type": "payment",
  "data": {
    "id": "12345678"
  }
}
```

Processamento:
1. Verifica `type === 'payment'`
2. Busca pagamento completo na API do MP por `data.id`
3. Encontra pagamento interno por `external_reference`
4. Atualiza status no banco
5. Se `approved`: provisiona licencas, envia email, gera NFS-e

## Provisionamento de Licencas

Quando um pagamento e aprovado:

```
1. Verificar quantas licencas ja existem para (app + email)
2. Calcular: precisaProvisionar = quantity - existentes
3. Para cada licenca necessaria:
   a. Gerar chave aleatoria (crypto): XXXX-XXXX-XXXX-XXXX
   b. Criar registro License com:
      - appId, userId, email, licenseKey
      - status: "active"
      - hardwareId: null (sera preenchido na ativacao)
4. Retornar array de licenseKeys
```

## Ativacao de Licenca

```
POST /api/public/license/activate-device
{
  "app_id": 1,
  "email": "comprador@email.com",
  "hardware_id": "MACHINE-FINGERPRINT-123"
}

Processamento:
1. Normalizar email (lowercase)
2. Buscar licenca existente com mesmo hardware_id
   → Se encontrada: retorna a licenca (ja ativada)
3. Buscar licenca disponivel (hardwareId == null) para app + email
   → Se nao encontrada: erro "Nenhuma licenca disponivel"
4. Vincular hardware_id a licenca
5. Registrar no log de ativacoes (IP, User-Agent)
6. Retornar licenseKey
```

### Limite por Dispositivo

- **1 dispositivo por licenca** (MAX_DEVICES_PER_LICENSE = 1)
- Para usar em outro PC, comprar nova licenca
- Hardware ID e um fingerprint da maquina gerado pelo app desktop

## Configuracao Mercado Pago

### Variaveis de Ambiente

```env
# Backend
MP_ENV=sandbox          # sandbox ou production
MP_ACCESS_TOKEN=APP_USR-xxx...  # Token de acesso
MP_PUBLIC_KEY=APP_USR-xxx...    # Chave publica
MP_WEBHOOK_SECRET=xxx...        # Secret do webhook
MP_WEBHOOK_URL=https://backend.onrender.com/api/payments/webhook

# Frontend
VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxx...
VITE_ENABLE_CARD_PAYMENT_UI=false  # Ativar pagamento direto por cartao
```

### Payment Brick (Frontend)

Componente React do Mercado Pago para formulario de pagamento:

```jsx
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

// Inicializar SDK
initMercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);

// Componente de pagamento
<Payment
  initialization={{ amount: app.price, preferenceId }}
  onSubmit={handlePayment}
/>
```

## Email de Confirmacao

Enviado automaticamente quando pagamento e aprovado:

```
De: CodeCraft Gen-Z <email@codecraft.com>
Para: comprador@email.com
Assunto: Compra Confirmada - NomeDoApp

Conteudo:
- Nome do app comprado
- Valor pago
- Chave(s) de licenca
- Link para download
- Instrucoes de ativacao
```

Providers suportados:
- **Gmail** - via app-specific passwords
- **Hostinger** - SMTP porta 465 (SSL)

## Mercado Pago - Metodos de Pagamento

| Metodo | Suporte | Nota |
|--------|---------|------|
| Cartao de credito | Sim | Via Payment Brick ou direto |
| Cartao de debito | Sim | Via Payment Brick |
| PIX | Sim | QR Code gerado automaticamente |
| Boleto | Sim | Via Payment Brick |
| Parcelamento | Sim | 1-4 parcelas |

## Apps Gratuitos

Apps com `price = 0`:
- Pagamento criado automaticamente com `status: approved`
- Licenca provisionada imediatamente
- Sem redirecionamento para Mercado Pago
- Download disponivel de imediato
