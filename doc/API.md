# API - Referencia de Endpoints

Base URL: `https://codecraftgenz-monorepo.onrender.com`
Dev URL: `http://localhost:8080`

Todas as respostas seguem o formato `{ success, data, status }` ou `{ success, error, status }`.

---

## Autenticacao

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/auth/login` | Nao | Login com email e senha |
| POST | `/api/auth/register` | Nao | Registro de novo usuario |
| GET | `/api/auth/me` | Sim | Dados do usuario logado |
| POST | `/api/auth/logout` | Sim | Logout (limpa cookie) |
| POST | `/api/auth/password-reset/request` | Nao | Solicitar reset de senha |
| POST | `/api/auth/password-reset/confirm` | Nao | Confirmar reset com token |
| POST | `/api/auth/change-password` | Sim | Alterar senha logado |

### POST /api/auth/login

```json
// Request
{
  "email": "admin@codecraft.com",
  "password": "senha123"
}

// Response 200
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "Admin",
      "email": "admin@codecraft.com",
      "role": "admin",
      "status": "ativo"
    }
  }
}
```

### POST /api/auth/register

```json
// Request
{
  "name": "Novo Usuario",
  "email": "novo@email.com",
  "password": "Senha123"  // min 8 chars, 1 digito
}
```

---

## Usuarios (Admin)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/auth/users` | Admin | Listar usuarios admin |
| POST | `/api/auth/users` | Admin | Criar usuario admin |
| PUT | `/api/auth/users/:id` | Admin | Atualizar usuario |
| PATCH | `/api/auth/users/:id/toggle-status` | Admin | Ativar/desativar |
| POST | `/api/auth/admin/reset-password` | Admin | Resetar senha de admin |

---

## Projetos

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/projetos` | Nao | Listar todos os projetos |
| GET | `/api/projetos/:id` | Nao | Detalhes de um projeto |
| POST | `/api/projetos` | Admin | Criar projeto |
| PUT | `/api/projetos/:id` | Admin | Atualizar projeto |
| DELETE | `/api/projetos/:id` | Admin | Excluir projeto |

### GET /api/projetos - Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nome": "CodeCraft Hub",
      "descricao": "Launcher desktop para apps",
      "status": "ongoing",
      "progresso": 75,
      "thumb_url": "https://...",
      "tecnologias": ["React", "Electron"],
      "mentor_id": 1,
      "created_at": "2025-01-15T...",
      "updated_at": "2025-06-01T..."
    }
  ]
}
```

---

## Aplicativos

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/apps` | Nao | Listar apps publicos |
| GET | `/api/apps/all` | Admin | Listar todos os apps |
| GET | `/api/apps/:id` | Nao | Detalhes de um app |
| POST | `/api/apps` | Admin | Criar app |
| PUT | `/api/apps/:id` | Admin | Atualizar app |
| DELETE | `/api/apps/:id` | Admin | Excluir app |
| POST | `/api/apps/:id/upload` | Admin | Upload executavel (512MB) |
| POST | `/api/apps/:id/feedback` | Sim | Enviar avaliacao |
| GET | `/api/apps/:id/feedbacks` | Nao | Listar avaliacoes |
| POST | `/api/apps/from-project/:projectId` | Admin | Criar app a partir de projeto |

### POST /api/apps - Request

```json
{
  "name": "Meu App",
  "description": "Descricao do app",
  "price": 29.90,
  "category": "produtividade",
  "tags": ["windows", "desktop"],
  "thumb_url": "https://...",
  "screenshots": ["https://...", "https://..."],
  "platforms": { "windows": true, "mac": false, "linux": false },
  "status": "published",
  "featured": false
}
```

---

## Pagamentos

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/payments/apps/:id/purchase` | Nao* | Criar preferencia de compra |
| POST | `/api/apps/:id/payment/direct` | Nao* | Pagamento direto (cartao/PIX) |
| POST | `/api/payments/webhook` | Nao | Webhook do Mercado Pago |
| GET | `/api/payments` | Admin | Buscar pagamentos (filtros) |
| GET | `/api/payments/:id` | Admin | Detalhes do pagamento |
| PUT | `/api/payments/:id` | Admin | Atualizar pagamento |
| GET | `/api/payments/apps/:id/status` | Nao* | Status da compra por email |
| POST | `/api/payments/:id/resend-email` | Admin | Reenviar email de confirmacao |

*Requer email no body (pode criar usuario convidado)

### POST /api/payments/apps/:id/purchase

```json
// Request
{
  "email": "comprador@email.com",
  "name": "Nome Comprador",
  "quantity": 1
}

// Response 201
{
  "success": true,
  "data": {
    "payment_id": 42,
    "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
    "preference_id": "12345678-abcd-..."
  }
}
```

### POST /api/apps/:id/payment/direct

```json
// Request (cartao)
{
  "email": "comprador@email.com",
  "name": "Nome",
  "quantity": 1,
  "payment_method_id": "visa",
  "token": "ff8080814c11e237014c1ff5...",
  "installments": 1,
  "payer": {
    "email": "comprador@email.com",
    "identification": {
      "type": "CPF",
      "number": "12345678909"
    }
  }
}
```

---

## Licencas

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/public/license/activate-device` | Nao | Ativar licenca no dispositivo |
| POST | `/api/public/license/verify` | Nao | Verificar licenca |
| POST | `/api/licenses/claim-by-email` | Nao | Resgatar licencas por email |
| POST | `/api/apps/:id/download` | Nao | Obter URL de download |
| GET | `/api/licenses` | Admin | Listar todas as licencas |

### POST /api/public/license/activate-device

```json
// Request
{
  "app_id": 1,
  "email": "comprador@email.com",
  "hardware_id": "ABC123-DEF456-GHI789"
}

// Response 200
{
  "success": true,
  "data": {
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "activated": true
  }
}
```

---

## Crafters

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/crafters` | Nao | Listar crafters |
| GET | `/api/crafters/:id` | Nao | Detalhes do crafter |
| POST | `/api/crafters` | Admin | Criar crafter |
| PUT | `/api/crafters/:id` | Admin | Atualizar crafter |
| DELETE | `/api/crafters/:id` | Admin | Excluir crafter |
| PATCH | `/api/crafters/:id/points` | Admin | Atualizar pontos |
| GET | `/api/ranking` | Nao | Ranking geral |
| GET | `/api/ranking/top3` | Nao | Top 3 crafters |
| PUT | `/api/ranking/top3` | Admin | Atualizar top 3 |

---

## Mentores

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/mentores` | Nao | Listar mentores |
| GET | `/api/mentores/:id` | Nao | Detalhes com projetos |
| POST | `/api/mentores` | Admin | Criar mentor |
| PUT | `/api/mentores/:id` | Admin | Atualizar mentor |
| DELETE | `/api/mentores/:id` | Admin | Excluir mentor |

---

## Equipes

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/equipes` | Nao | Listar equipes |
| GET | `/api/equipes/:id` | Nao | Detalhes com membros |
| POST | `/api/equipes` | Admin | Criar equipe |
| PUT | `/api/equipes/:id` | Admin | Atualizar equipe |
| DELETE | `/api/equipes/:id` | Admin | Excluir equipe |

---

## Desafios

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/desafios` | Nao | Listar desafios |
| GET | `/api/desafios/:id` | Nao | Detalhes do desafio |
| POST | `/api/desafios` | Admin | Criar desafio |
| PUT | `/api/desafios/:id` | Admin | Atualizar desafio |
| DELETE | `/api/desafios/:id` | Admin | Excluir desafio |
| POST | `/api/desafios/:id/subscribe` | Sim | Inscrever-se |
| POST | `/api/desafios/:id/submit` | Sim | Enviar solucao |
| PUT | `/api/desafios/submissions/:id/review` | Admin | Avaliar submissao |

---

## Financas

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/financas` | Admin | Listar registros |
| POST | `/api/financas` | Admin | Criar registro |
| PUT | `/api/financas/:id` | Admin | Atualizar registro |
| DELETE | `/api/financas/:id` | Admin | Excluir registro |

---

## Inscricoes

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/inscricoes` | Admin | Listar inscricoes |
| POST | `/api/inscricoes` | Nao | Nova inscricao |
| PUT | `/api/inscricoes/:id` | Admin | Atualizar status |
| DELETE | `/api/inscricoes/:id` | Admin | Excluir inscricao |

---

## Feedbacks

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/feedbacks` | Nao | Listar feedbacks publicos |
| POST | `/api/feedbacks` | Nao | Enviar feedback |
| DELETE | `/api/feedbacks/:id` | Admin | Excluir feedback |

---

## Propostas (B2B)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/propostas` | Admin | Listar propostas |
| POST | `/api/propostas` | Nao | Enviar proposta |
| PUT | `/api/propostas/:id` | Admin | Atualizar proposta |
| DELETE | `/api/propostas/:id` | Admin | Excluir proposta |

---

## NFS-e (Nota Fiscal)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/nfse` | Admin | Listar notas fiscais |
| GET | `/api/nfse/:id` | Admin | Detalhes da nota |
| GET | `/api/nfse/:id/xml` | Admin | XML gerado |
| POST | `/api/nfse/gerar` | Admin | Gerar nota fiscal |
| POST | `/api/nfse/:id/enviar` | Admin | Enviar para prefeitura |
| GET | `/api/nfse/:id/consultar` | Admin | Consultar status |
| POST | `/api/nfse/:id/cancelar` | Admin | Cancelar nota |

---

## Dashboard

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/dashboard/stats` | Admin | Estatisticas gerais |
| GET | `/api/dashboard/kpis` | Admin | KPIs do mes |

### GET /api/dashboard/stats?periodo=30d

```json
{
  "success": true,
  "data": {
    "finance": {
      "total": 15000.00,
      "paid": 12000.00,
      "pending": 3000.00,
      "discounts": 500.00
    },
    "payments": {
      "total": 45,
      "approved": 10500.00,
      "pending": 2000.00
    },
    "users": {
      "total": 150,
      "crafters": 30
    },
    "projects": {
      "total": 12,
      "active": 8,
      "completed": 4
    },
    "apps": {
      "total": 5
    },
    "salesPerApp": [
      {
        "app_id": 1,
        "app_name": "CodeCraft Hub",
        "thumb_url": "https://...",
        "sales_count": 25,
        "total_revenue": 5000.00
      }
    ],
    "chartData": [
      { "month": "Jan", "revenue": 2000, "expenses": 500 },
      { "month": "Fev", "revenue": 3000, "expenses": 800 }
    ],
    "period": "30d"
  }
}
```

---

## Downloads

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/downloads/:file` | Nao | Download de arquivo (com SHA256) |
| GET | `/api/downloads` | Admin | Listar downloads |

---

## Hub (CodeCraft Hub)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/hub/my-apps` | Sim | Apps comprados do usuario |
| GET | `/api/hub/latest` | Nao | Ultima versao do Hub |

---

## Health

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/health` | Nao | Health check |
| GET | `/health/ready` | Nao | Readiness probe |

---

## Autenticacao nas Requests

Header: `Authorization: Bearer <jwt_token>`

Ou cookie httpOnly: `cc_token` (setado automaticamente no login)

### Roles Disponiveis

| Role | Acesso |
|------|--------|
| `admin` | Acesso total ao sistema |
| `editor` | Acesso admin (exceto usuarios, licencas, pagamentos, nfse) |
| `user` | Acesso a compra, conta pessoal |
| `viewer` | Acesso somente leitura |
