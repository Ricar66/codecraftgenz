# CodeCraft Gen-Z - Fluxogramas do Sistema

Documentacao visual de como os dados fluem entre Frontend e Backend.

---

## 1. Mapa Geral das Paginas

```
                                    PAGINAS PUBLICAS
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   /                    /app-hub              /ranking               │
    │   HomePage             AppHubPage            RankingPage            │
    │   (Landing)            (Loja Publica)        (Placar)               │
    │       │                    │                     │                  │
    │       │                    │                     │                  │
    │   /projetos            /mentoria             /desafios              │
    │   ProjectsPage         MentoriaPage          DesafiosPage           │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                         AUTENTICACAO                                │
    │                                                                     │
    │   /login ──────────────▶ /register                                  │
    │   LoginPage              RegisterPage                               │
    │       │                      │                                      │
    │       ▼                      │                                      │
    │   /forgot-password           │                                      │
    │   ForgotPasswordPage         │                                      │
    │       │                      │                                      │
    │       ▼                      │                                      │
    │   /reset?token=xxx           │                                      │
    │   PasswordResetPage ─────────┘                                      │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ (apos login)
    ┌─────────────────────────────────────────────────────────────────────┐
    │                      PAGINAS AUTENTICADAS                           │
    │                                                                     │
    │   /aplicativos ────────────▶ /minha-conta                          │
    │   AppsPage                    MyAccountPage                         │
    │   (Meus Apps)                 (Perfil + Licencas)                   │
    │       │                                                             │
    │       ▼                                                             │
    │   /apps/:id/compra ────────▶ /apps/:id/sucesso                     │
    │   AppPurchasePage            OrderSuccessPage                       │
    │   (Checkout)                 (Download)                             │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Fluxo de Dados - HomePage

```
┌──────────────────────────────────────────────────────────────────┐
│                         HomePage.jsx                              │
│                              /                                    │
└──────────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Hero         │      │ Features     │      │ Company      │
│ Section      │      │ Section      │      │ Section      │
└──────────────┘      └──────────────┘      └──────────────┘
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ OSSP         │      │ Metrics      │      │ Cases        │
│ Section      │      │ Section      │      │ Section      │
└──────────────┘      └──────────────┘      └──────────────┘
                               │
                               ▼
                      ┌──────────────┐
                      │ Feedback     │
                      │ Showcase     │
                      └──────────────┘

DADOS: Estaticos (componentes visuais, sem chamadas API)
```

---

## 3. Fluxo de Dados - AppHubPage (Loja Publica)

```
┌──────────────────────────────────────────────────────────────────┐
│                        AppHubPage.jsx                             │
│                           /app-hub                                │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ useEffect (mount)
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    getPublicApps()                                │
│                  src/services/appsAPI.js                          │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ GET /api/apps/public
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         BACKEND                                   │
│              src/routes/apps.ts                                   │
│              src/controllers/app.controller.ts                    │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ SELECT * FROM apps WHERE status='published'
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BANCO DE DADOS                               │
│                    Tabela: apps                                   │
│   (id, name, description, price, icon_url, status, created_at)    │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ Response JSON
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                   │
│   apps[] ──▶ setApps(apps) ──▶ Renderiza AppCard[]               │
│                                                                   │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                            │
│   │ AppCard │ │ AppCard │ │ AppCard │  ... (carousel)            │
│   └─────────┘ └─────────┘ └─────────┘                            │
│        │                                                          │
│        └──────▶ onClick ──▶ navigate(/apps/:id/compra)           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Fluxo de Dados - AppsPage (Meus Apps)

```
┌──────────────────────────────────────────────────────────────────┐
│                         AppsPage.jsx                              │
│                        /aplicativos                               │
│                    (requer autenticacao)                          │
└──────────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   getPublicApps()       getHistory()        useAuth()
          │                    │                    │
          ▼                    ▼                    ▼
   GET /api/apps/       GET /api/apps/       Contexto
   public               history              usuario
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         ESTADOS                                   │
│                                                                   │
│   apps[]          - Lista de apps disponiveis                     │
│   history[]       - Historico de compras do usuario               │
│   searchTerm      - Filtro de busca                               │
│   activeFilter    - Filtro: todos/comprados/nao-comprados         │
│   sortBy          - Ordenacao: recentes/preco/nome                │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    RENDERIZACAO                                   │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  Filtros: [Todos] [Comprados] [Nao Comprados]           │    │
│   │  Busca: [_______________]  Ordenar: [Recentes ▼]        │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│   │ AppCard │ │ AppCard │ │ AppCard │ │ AppCard │               │
│   │ Comprar │ │ Baixar  │ │ Comprar │ │ Baixar  │               │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│        │           │                                              │
│        │           └──▶ registerDownload() ──▶ Download           │
│        │                                                          │
│        └──────────▶ navigate(/apps/:id/compra)                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Fluxo COMPLETO de Compra

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ETAPA 1: Usuario clica em "Comprar" no AppCard                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      AppPurchasePage.jsx                                 │
│                       /apps/:id/compra                                   │
│                                                                          │
│   useEffect ──▶ getAppById(id) ──▶ GET /api/apps/:id                    │
│                                          │                               │
│                                          ▼                               │
│                              ┌─────────────────────┐                    │
│                              │  app = {            │                    │
│                              │    id, name, price, │                    │
│                              │    description,     │                    │
│                              │    icon_url         │                    │
│                              │  }                  │                    │
│                              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ETAPA 2: Usuario preenche dados                                         │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  Nome: [____________________]                                    │   │
│   │  Email: [___________________]                                    │   │
│   │  Quantidade: [1] [2] [3] ... [10]                               │   │
│   │  Parcelas: [1x] [2x] [3x] [4x]                                  │   │
│   │                                                                  │   │
│   │  Total: R$ 49,90                                                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Estados:                                                               │
│   - buyerName, buyerEmail                                               │
│   - quantity (1-10)                                                      │
│   - installments (1-4)                                                   │
│   - totalPrice = app.price * quantity                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ETAPA 3: Usuario escolhe metodo de pagamento                            │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  [Cartao Credito] [Cartao Debito] [PIX] [Boleto] [Todos]        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│                           PaymentBrick.jsx                               │
│                      (Mercado Pago Bricks SDK)                          │
│                                                                          │
│   Inicializacao:                                                         │
│   mp = new MercadoPago(PUBLIC_KEY)                                      │
│   bricks.create('payment', 'container', settings)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ onSubmit (dados do pagamento)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ETAPA 4: Processamento do Pagamento                                     │
│                                                                          │
│   Frontend:                                                              │
│   createDirectPayment(appId, {                                          │
│     token,                    // Token do cartao (MP)                   │
│     payment_method_id,        // 'pix', 'visa', 'master'...            │
│     installments,             // Numero de parcelas                     │
│     transaction_amount,       // Valor total                            │
│     payer: { email, name }    // Dados do comprador                     │
│   })                                                                     │
│                                    │                                     │
│                                    │ POST /api/apps/:id/payment/direct   │
│                                    ▼                                     │
│   Backend (payment.service.ts):                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  1. Valida dados                                                 │   │
│   │  2. Chama Mercado Pago API                                      │   │
│   │     payment.create({ ... })                                      │   │
│   │  3. Recebe resposta do MP                                       │   │
│   │  4. Salva em app_payments                                       │   │
│   │  5. Se aprovado:                                                │   │
│   │     - Provisiona licenca(s)                                     │   │
│   │     - Envia email de confirmacao                                │   │
│   │  6. Retorna resultado                                           │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              APROVADO          PENDING           REJEITADO
                    │          (PIX/Boleto)           │
                    │               │                 │
                    ▼               ▼                 ▼
            Redireciona       Mostra QR Code    Mostra erro
            para sucesso      ou codigo          tente novamente
                    │               │
                    └───────┬───────┘
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ETAPA 5: Pagina de Sucesso                                              │
│                                                                          │
│                      OrderSuccessPage.jsx                                │
│                       /apps/:id/sucesso                                  │
│                                                                          │
│   useEffect:                                                             │
│   1. getPurchaseStatus(appId, { payment_id, ... })                      │
│   2. getAppById(appId)                                                   │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │     ✓ Compra Confirmada!                                        │   │
│   │                                                                  │   │
│   │     App: CoinCraft                                              │   │
│   │     Valor: R$ 49,90                                             │   │
│   │     ID Pedido: 123456789                                        │   │
│   │                                                                  │   │
│   │     [ Baixar Executavel ]                                       │   │
│   │                                                                  │   │
│   │     ─────────────────────────                                   │   │
│   │     Reenviar link por email:                                    │   │
│   │     Email: [_______________] [Enviar]                           │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Acoes:                                                                 │
│   - handleDownload() ──▶ window.open(download_url)                      │
│   - handleResendEmail() ──▶ resendPurchaseEmail(appId, email)           │
│                                POST /api/apps/:id/resend-email          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Fluxo do Webhook (Pagamentos Assincronos)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Quando o pagamento e PIX ou Boleto, o status inicial e "pending"        │
│  O Mercado Pago avisa quando o pagamento for confirmado via WEBHOOK      │
└─────────────────────────────────────────────────────────────────────────┘

     MERCADO PAGO                         BACKEND                    BANCO
          │                                  │                         │
          │  POST /api/apps/webhook          │                         │
          │  { type: 'payment',              │                         │
          │    data: { id: '123' } }         │                         │
          │─────────────────────────────────▶│                         │
          │                                  │                         │
          │                                  │  1. Busca payment no MP │
          │                                  │     GET /v1/payments/123│
          │◀─────────────────────────────────│                         │
          │  { status: 'approved', ... }     │                         │
          │─────────────────────────────────▶│                         │
          │                                  │                         │
          │                                  │  2. Atualiza app_payments
          │                                  │─────────────────────────▶│
          │                                  │  UPDATE status='approved'│
          │                                  │                         │
          │                                  │  3. Provisiona licenca  │
          │                                  │─────────────────────────▶│
          │                                  │  INSERT app_licenses    │
          │                                  │                         │
          │                                  │  4. Envia email         │
          │                                  │     sendPurchaseEmail() │
          │                                  │         │               │
          │                                  │         ▼               │
          │                                  │    ┌─────────┐          │
          │                                  │    │ SMTP    │          │
          │                                  │    │ Server  │          │
          │                                  │    └─────────┘          │
          │                                  │         │               │
          │                                  │         ▼               │
          │                                  │    Email enviado        │
          │                                  │    para cliente         │
          │                                  │                         │
          │  Response: 200 OK                │                         │
          │◀─────────────────────────────────│                         │
```

---

## 7. Fluxo de Autenticacao

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            LOGIN                                         │
└─────────────────────────────────────────────────────────────────────────┘

   LoginPage.jsx                    Backend                      Banco
        │                              │                           │
        │  login(email, password)      │                           │
        │  POST /api/auth/login        │                           │
        │─────────────────────────────▶│                           │
        │                              │  SELECT * FROM users      │
        │                              │  WHERE email = ?          │
        │                              │──────────────────────────▶│
        │                              │◀──────────────────────────│
        │                              │                           │
        │                              │  bcrypt.compare(password) │
        │                              │  jwt.sign({ userId })     │
        │                              │                           │
        │  { token, user }             │                           │
        │◀─────────────────────────────│                           │
        │                              │                           │
        │  localStorage.set('token')   │                           │
        │  setUser(user)               │                           │
        │  navigate('/aplicativos')    │                           │


┌─────────────────────────────────────────────────────────────────────────┐
│                          REGISTRO                                        │
└─────────────────────────────────────────────────────────────────────────┘

   RegisterPage.jsx                 Backend                      Banco
        │                              │                           │
        │  register(name,email,pass)   │                           │
        │  POST /api/auth/register     │                           │
        │─────────────────────────────▶│                           │
        │                              │  Verifica se email existe │
        │                              │──────────────────────────▶│
        │                              │◀──────────────────────────│
        │                              │                           │
        │                              │  bcrypt.hash(password)    │
        │                              │  INSERT INTO users        │
        │                              │──────────────────────────▶│
        │                              │◀──────────────────────────│
        │                              │                           │
        │  { success: true }           │                           │
        │◀─────────────────────────────│                           │
        │                              │                           │
        │  navigate('/login')          │                           │


┌─────────────────────────────────────────────────────────────────────────┐
│                    REQUISICOES AUTENTICADAS                              │
└─────────────────────────────────────────────────────────────────────────┘

   Qualquer Pagina                  Backend
        │                              │
        │  GET /api/apps/mine          │
        │  Header: Authorization:      │
        │          Bearer <token>      │
        │─────────────────────────────▶│
        │                              │
        │                              │  authMiddleware:
        │                              │  1. Extrai token do header
        │                              │  2. jwt.verify(token)
        │                              │  3. req.user = decoded
        │                              │  4. next()
        │                              │
        │  { data: [...] }             │
        │◀─────────────────────────────│
```

---

## 8. Estrutura do Banco de Dados

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TABELAS PRINCIPAIS                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     users       │      │      apps       │      │  app_payments   │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │      │ id (PK)         │
│ name            │      │ name            │      │ app_id (FK)     │──┐
│ email (UNIQUE)  │      │ description     │      │ user_id (FK)    │  │
│ password_hash   │      │ price           │      │ payment_id (MP) │  │
│ role            │      │ icon_url        │      │ status          │  │
│ created_at      │      │ download_url    │      │ amount          │  │
└─────────────────┘      │ status          │      │ payer_email     │  │
        │                │ created_at      │      │ quantity        │  │
        │                └─────────────────┘      │ installments    │  │
        │                        │                │ created_at      │  │
        │                        │                └─────────────────┘  │
        │                        │                        │            │
        │                        └────────────────────────┼────────────┘
        │                                                 │
        ▼                                                 ▼
┌─────────────────┐                              ┌─────────────────┐
│  app_licenses   │                              │ payment_audit   │
├─────────────────┤                              ├─────────────────┤
│ id (PK)         │                              │ id (PK)         │
│ app_id (FK)     │                              │ payment_id (FK) │
│ user_id (FK)    │                              │ event_type      │
│ license_key     │                              │ old_status      │
│ email           │                              │ new_status      │
│ hardware_id     │                              │ payload         │
│ status          │                              │ created_at      │
│ activated_at    │                              └─────────────────┘
│ expires_at      │
│ created_at      │
└─────────────────┘
```

---

## 9. Fluxo de Ativacao de Licenca

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Apos compra, o usuario instala o app desktop e precisa ativar          │
└─────────────────────────────────────────────────────────────────────────┘

   App Desktop                      Backend                      Banco
        │                              │                           │
        │  1. Usuario informa email    │                           │
        │                              │                           │
        │  2. App coleta hardware_id   │                           │
        │     (CPU, MAC, HD serial)    │                           │
        │                              │                           │
        │  POST /api/public/license/   │                           │
        │       activate-device        │                           │
        │  { email, app_id,            │                           │
        │    hardware_id }             │                           │
        │─────────────────────────────▶│                           │
        │                              │                           │
        │                              │  SELECT * FROM app_licenses
        │                              │  WHERE email = ?          │
        │                              │  AND app_id = ?           │
        │                              │  AND status = 'active'    │
        │                              │──────────────────────────▶│
        │                              │◀──────────────────────────│
        │                              │                           │
        │                              │  Licenca encontrada?      │
        │                              │                           │
        │                              │  Se hardware_id vazio:    │
        │                              │  UPDATE app_licenses      │
        │                              │  SET hardware_id = ?,     │
        │                              │      activated_at = NOW() │
        │                              │──────────────────────────▶│
        │                              │                           │
        │  { success: true,            │                           │
        │    license_key: 'XXX-YYY' }  │                           │
        │◀─────────────────────────────│                           │
        │                              │                           │
        │  App ativado!                │                           │
```

---

## 10. Arquivos Principais - Referencia Rapida

### Frontend (src/)

```
src/
├── pages/
│   ├── HomePage/HomePage.jsx      # Landing page
│   ├── AppHubPage.jsx             # Loja publica
│   ├── AppsPage.jsx               # Meus apps (auth)
│   ├── AppPurchasePage.jsx        # Checkout
│   ├── OrderSuccessPage.jsx       # Pos-compra
│   ├── LoginPage.jsx              # Login
│   ├── RegisterPage.jsx           # Cadastro
│   ├── MyAccountPage.jsx          # Perfil
│   ├── RankingPage.jsx            # Placar
│   ├── MentoriaPage.jsx           # Mentores
│   └── DesafiosPage.jsx           # Desafios
│
├── components/
│   ├── PaymentBrick.jsx           # Brick MP
│   ├── AppCard/AppCard.jsx        # Card de app
│   ├── Navbar/Navbar.jsx          # Navegacao
│   └── LicenseActivator.jsx       # Ativador
│
├── services/
│   ├── appsAPI.js                 # Chamadas API apps
│   └── authAPI.js                 # Chamadas API auth
│
├── contexts/
│   └── AuthContext.jsx            # Contexto auth
│
└── lib/
    └── apiConfig.js               # Config base API
```

### Backend (src/)

```
src/
├── routes/
│   ├── apps.ts                    # Rotas /api/apps
│   ├── auth.ts                    # Rotas /api/auth
│   └── payments.ts                # Rotas /api/payments
│
├── controllers/
│   ├── app.controller.ts          # Controller apps
│   ├── auth.controller.ts         # Controller auth
│   └── payment.controller.ts      # Controller pagamentos
│
├── services/
│   ├── payment.service.ts         # Logica pagamentos
│   ├── license.service.ts         # Logica licencas
│   └── email.service.ts           # Envio emails
│
├── repositories/
│   ├── app.repository.ts          # Queries apps
│   ├── payment.repository.ts      # Queries pagamentos
│   └── license.repository.ts      # Queries licencas
│
└── middlewares/
    ├── auth.middleware.ts         # Validacao JWT
    └── rateLimiter.ts             # Rate limiting
```

---

## 11. Resumo Visual - Ciclo Completo

```
    ┌──────────┐
    │ USUARIO  │
    └────┬─────┘
         │
         │ 1. Acessa site
         ▼
    ┌──────────┐     ┌──────────┐
    │ HomePage │────▶│ AppHub   │
    └──────────┘     └────┬─────┘
                          │
                          │ 2. Escolhe app
                          ▼
                    ┌──────────┐
                    │ Checkout │
                    │  Page    │
                    └────┬─────┘
                          │
                          │ 3. Paga
                          ▼
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ Mercado  │◀───▶│ Backend  │◀───▶│  Banco   │
    │  Pago    │     │          │     │  Dados   │
    └──────────┘     └────┬─────┘     └──────────┘
                          │
                          │ 4. Confirma
                          ▼
                    ┌──────────┐
                    │ Success  │
                    │  Page    │
                    └────┬─────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Download │    │  Email   │    │ Licenca  │
    │   .exe   │    │ Enviado  │    │ Ativada  │
    └──────────┘    └──────────┘    └──────────┘
```

---

## 12. Troubleshooting - Problemas Comuns

### Email Nao Enviado Apos Compra

**Sintoma:** Compra aprovada mas cliente nao recebe email.

**Verificar:**

1. **Variaveis de ambiente no backend:**
```bash
# Verificar se estao configuradas
echo $EMAIL_USER
echo $EMAIL_PASS
```

2. **Logs do backend:**
```bash
# Procurar por erros de email
grep -i "email" logs/app.log
grep -i "ERRO CRITICO" logs/app.log
```

3. **Configuracao necessaria no `.env` do backend:**
```ini
# Para Gmail (requer App Password, nao senha normal)
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-app-password-16-chars

# Para Hostinger
EMAIL_USER=contato@seudominio.com.br
EMAIL_PASS=sua-senha-hostinger
```

4. **Testar conexao SMTP:**
```typescript
// No backend, chamar:
await emailService.testConnection();
```

---

### QR Code PIX Nao Aparece

**Sintoma:** Pagamento PIX iniciado mas QR Code nao exibido.

**Verificar:**

1. **Console do navegador (F12):**
```javascript
// Deve aparecer logs como:
// [PaymentBrick] Status: pending Method: pix
// [PaymentBrick] PIX Info: { qr_code: "...", qr_code_base64: "..." }
```

2. **Se o log mostrar `PIX Info: undefined`:**
   - Problema na resposta do Mercado Pago
   - Verificar se `MP_ACCESS_TOKEN` e de producao/sandbox correto

3. **Estrutura esperada da resposta do backend:**
```json
{
  "status": "pending",
  "qr_code": "00020126...",
  "qr_code_base64": "iVBORw0KGgo...",
  "ticket_url": "https://..."
}
```

---

### Webhook Nao Processa Pagamento

**Sintoma:** Pagamento PIX/Boleto confirmado no MP mas status nao atualiza.

**Verificar:**

1. **URL do webhook no Mercado Pago:**
   - Deve ser: `https://seu-backend.com/api/apps/webhook`
   - Verificar se esta acessivel publicamente

2. **Logs do webhook:**
```bash
grep -i "webhook" logs/app.log
```

3. **Testar endpoint manualmente:**
```bash
curl -X POST https://seu-backend.com/api/apps/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"123456"}}'
```

---

### Checklist de Deploy

```
[ ] EMAIL_USER configurado
[ ] EMAIL_PASS configurado (App Password para Gmail)
[ ] MP_ACCESS_TOKEN configurado
[ ] MERCADO_PAGO_PUBLIC_KEY configurado
[ ] MP_WEBHOOK_URL configurado e acessivel
[ ] FRONTEND_URL configurado
[ ] Banco de dados com tabelas: app_payments, app_licenses
```

---

*Documentacao gerada em Janeiro/2026 - CodeCraft Gen-Z*
