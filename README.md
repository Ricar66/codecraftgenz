<div align="center">
  <img alt="Logo CodeCraft Gen‑Z" src="src/assets/logo-codecraft.svg" width="180" />
  <br />
  <img alt="Marca CodeCraft Gen‑Z (versão imagem)" src="src/assets/logo-codecraft.svg" width="0" height="0" />
  <h1>CodeCraft Gen‑Z</h1>
  <p><strong>Plataforma moderna para criar, lançar e evoluir apps — com pagamentos, licenças e experiências de ponta.</strong></p>
  <a href="https://codecraftgenz.com.br" target="_blank"><b>🌐 codecraftgenz.com.br</b></a>
  <br /><br />
  <a href="https://github.com/Ricar66/codecraftgenz/actions/workflows/main_codecraftgenz.yml">
    <img alt="Build" src="https://github.com/Ricar66/codecraftgenz/actions/workflows/main_codecraftgenz.yml/badge.svg" />
  </a>
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=061A23" />
  <img alt="Vite" src="https://img.shields.io/badge/vite-5-646CFF?logo=vite&logoColor=white" />
  <img alt="API" src="https://img.shields.io/badge/API-Express-000000?logo=express&logoColor=white" />
</div>

---

## Sobre a Empresa
- ✨ A CodeCraft Gen‑Z conecta talentos e tecnologia para transformar ideias em software real.
- 🧭 Foco em experiências, performance e segurança para apps web e desktop.
- 🤝 Parcerias e mentorias para acelerar projetos do zero ao lançamento.

## O Projeto
- ⚛️ Frontend em `React` com `Vite` e estratégias de performance.
- 🚀 API `Node.js/Express` com pagamentos (`Mercado Pago`), licenças e webhooks.
- 🗄️ Banco de dados `Azure SQL` com migrações automáticas e auditoria.
- 🛡️ Segurança: `Helmet`, `CORS`, `JWT`, rate‑limit e sanitização.

## Demonstração
- Página principal: `https://codecraftgenz.com.br`
- Apps e compras: `https://codecraftgenz.com.br/apps`
- Downloads seguros: rotas protegidas e URLs de integridade

## Destaques
- 💳 Checkout com Mercado Pago (Bricks), verificação de status e webhooks de confirmação.
- 🔐 Ativação de licença por hardware e trilha de auditoria de eventos.
- 📦 Upload de executáveis com entrega via `/downloads/:file` e checagem de integridade.
- 📈 Telemetria opcional com Application Insights.
- 📧 Emails transacionais personalizados com template da marca.

---

## Fluxo de Compra e Pagamentos

### Arquitetura do Sistema de Pagamentos

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │    Backend      │     │  Mercado Pago   │
│   (React)       │────▶│   (Express)     │────▶│     API         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │   PaymentBrick        │   /api/apps/:id/      │
        │   (MP Bricks SDK)     │   payment/direct      │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Formulário de  │     │  Processa e     │     │  Webhook POST   │
│  Pagamento      │     │  Salva Payment  │◀────│  /api/apps/     │
└─────────────────┘     └─────────────────┘     │  webhook        │
                                │               └─────────────────┘
                                ▼
                        ┌─────────────────┐
                        │  Email Service  │
                        │  (Nodemailer)   │
                        └─────────────────┘
```

### Métodos de Pagamento Suportados

| Método | Descrição | Status |
|--------|-----------|--------|
| Cartão de Crédito | Até 4x sem juros | ✅ Ativo |
| Cartão de Débito | Débito Virtual Caixa | ✅ Ativo |
| PIX | QR Code na tela + Copia e Cola | ✅ Ativo |
| Boleto | Boleto bancário | ✅ Ativo |
| Mercado Pago | Saldo MP, créditos | ✅ Ativo |

### Componentes Principais

#### Frontend

| Arquivo | Descrição |
|---------|-----------|
| `src/components/PaymentBrick.jsx` | Brick de pagamento do Mercado Pago |
| `src/pages/OrderSuccessPage.jsx` | Página de sucesso pós-compra |
| `src/pages/AppCheckoutPage.jsx` | Página de checkout do app |
| `src/services/appsAPI.js` | Funções de API para pagamentos |

#### Backend

| Arquivo | Descrição |
|---------|-----------|
| `src/services/payment.service.ts` | Lógica de pagamentos e integração MP |
| `src/services/email.service.ts` | Envio de emails transacionais |
| `src/services/license.service.ts` | Provisionamento de licenças |
| `src/controllers/payment.controller.ts` | Controllers de pagamento |
| `src/routes/apps.ts` | Rotas de apps e pagamentos |

### Endpoints de Pagamento

```
POST   /api/apps/:id/purchase          # Criar preferência MP (redirect)
GET    /api/apps/:id/purchase/status   # Status da compra
POST   /api/apps/:id/payment/direct    # Pagamento direto (cartão/PIX/boleto)
GET    /api/apps/:id/payment/last      # Último pagamento do app
POST   /api/apps/webhook               # Webhook do Mercado Pago
POST   /api/apps/:id/resend-email      # Reenviar email de confirmação
```

### Fluxo de Pagamento Direto

```
1. Usuário seleciona método (cartão/PIX/boleto)
2. PaymentBrick coleta dados e gera token
3. Frontend chama POST /api/apps/:id/payment/direct
4. Backend processa via Mercado Pago API
5. Se aprovado:
   - Cria registro em app_payments
   - Provisiona licença(s)
   - Envia email de confirmação
6. Frontend redireciona para OrderSuccessPage
```

### Fluxo PIX

```
1. Usuário seleciona PIX no PaymentBrick
2. Backend cria pagamento PIX no MP
3. Retorna: qr_code, qr_code_base64, ticket_url
4. Frontend exibe QR Code na tela
5. Usuário escaneia ou copia código
6. Webhook confirma pagamento
7. Email enviado com link de download
```

---

## Sistema de Emails

### Configuração

```ini
# .env do Backend
EMAIL_USER=seu-email@gmail.com      # ou email@hostinger.com
EMAIL_PASS=sua-senha-de-app         # App Password do Gmail
FRONTEND_URL=https://codecraftgenz.com.br
```

### Template de Email

O email de confirmação usa tema escuro com as cores da marca:
- **Ciano**: `#00E4F2` (destaques, links)
- **Magenta**: `#D12BF2` (acentos, botões)
- **Fundo escuro**: `#0d0d1a`, `#1a1a2e`

**Elementos do email:**
- Logo da empresa no header e footer
- Nome do cliente personalizado
- Detalhes do app (nome, versão, preço)
- Botão de download destacado
- ID do pedido e data
- Chave de licença (se aplicável)
- Dicas de instalação

### Endpoints de Email

```
POST /api/apps/:id/resend-email
Body: { "email": "cliente@email.com" }
Response: { "success": true, "data": { "sent": true, "payment_id": "..." } }
```

---

## Sistema de Licenças

### Modelo de Licença

```sql
app_licenses (
  id            INT PRIMARY KEY,
  app_id        INT,
  user_id       INT,
  license_key   VARCHAR(255),    -- Chave única
  email         VARCHAR(255),    -- Email do comprador
  hardware_id   VARCHAR(255),    -- ID do dispositivo ativado
  status        ENUM('active', 'revoked', 'expired'),
  activated_at  DATETIME,
  expires_at    DATETIME,
  created_at    DATETIME
)
```

### Fluxo de Ativação

```
1. Compra aprovada → Licença provisionada (status: active)
2. App instalado → Usuário informa email
3. App envia hardware_id + email para API
4. Backend valida licença e registra hardware_id
5. App ativado no dispositivo
```

### Endpoints de Licença

```
POST /api/public/license/activate-device
Body: { "email": "...", "app_id": 1, "hardware_id": "..." }

POST /api/apps/:id/download/by-email
Body: { "email": "..." }

POST /api/apps/:id/download/by-payment
Body: { "payment_id": "..." }
```

---

## Múltiplas Licenças

O sistema suporta compra de múltiplas licenças (1-10) em uma única transação:

```javascript
// Frontend - AppCheckoutPage
const [quantity, setQuantity] = useState(1);
const totalPrice = app.price * quantity;

// Backend - payment.service.ts
for (let i = 0; i < quantity; i++) {
  await licenseService.provisionLicense(appId, email, userId, {
    paymentId,
    price: unitPrice,
  });
}
```

---

## Parcelamento

Suporte a parcelamento em até 4x sem juros:

```javascript
// PaymentBrick.jsx
customization: {
  paymentMethods: {
    maxInstallments: 4,  // Máximo de parcelas
  }
}

// Cálculo no checkout
const installmentOptions = [1, 2, 3, 4].map(n => ({
  installments: n,
  value: (totalPrice / n).toFixed(2)
}));
```

## Como Executar
```bash
npm install
npm run dev       # Frontend em http://localhost:5173
npm start         # API em http://localhost:8080 (requer .env)
```

## Variáveis de Ambiente
Defina em `.env` conforme o ambiente. Não exponha segredos.

```ini
# Frontend
VITE_APP_ENV=development
VITE_DEBUG=true
VITE_WP_API_URL=https://cms.codecraftgenz.com.br/wp-json

# API / Server
PORT=8080
ALLOWED_ORIGINS=http://localhost:5173
JWT_SECRET=...
ADMIN_RESET_TOKEN=...

# Banco (Azure SQL)
DB_SERVER=...
DB_USER=...
DB_PASSWORD=...
DB_DATABASE=...

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=...
MERCADO_PAGO_PUBLIC_KEY=...
MERCADO_PAGO_SUCCESS_URL=https://codecraftgenz.azurewebsites.net/apps/:id/compra
MERCADO_PAGO_FAILURE_URL=https://codecraftgenz.azurewebsites.net/apps/:id/compra
MERCADO_PAGO_PENDING_URL=https://codecraftgenz.azurewebsites.net/apps/:id/compra
MERCADO_PAGO_WEBHOOK_URL=https://codecraftgenz.azurewebsites.net/api/apps/webhook
```

## Scripts
- `npm run dev` – inicia o frontend
- `npm run build` – build de produção
- `npm run preview` – serve o build localmente
- `npm start` – inicia a API
- `npm run test` – executa testes

## Segurança
- Não commitar segredos
- Gere um `JWT_SECRET` forte:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Contato
- 🌐 Site: `https://codecraftgenz.com.br`
- ✉️ Comercial: `contato@codecraftgenz.com.br`
- 🐛 Issues e suporte via GitHub
