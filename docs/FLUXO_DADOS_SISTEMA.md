# CodeCraft Gen-Z - Fluxo de Dados do Sistema

## Visao Geral

O sistema CodeCraft Gen-Z e uma plataforma web composta por:
- **Frontend**: React 18 + Vite
- **Backend**: Express + TypeScript
- **Banco de Dados**: MySQL via Prisma ORM
- **Pagamentos**: Mercado Pago

---

## 1. Fluxograma Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USUARIO                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Pages     │  │ Components  │  │  Context    │  │  Services   │        │
│  │  (Rotas)    │  │    (UI)     │  │   (Auth)    │  │   (API)     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          HTTP Request (fetch)
                          Authorization: Bearer {token}
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express)                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Routes    │──│ Controllers │──│  Services   │──│Repositories │        │
│  │  (URLs)     │  │  (HTTP)     │  │  (Logica)   │  │  (Dados)    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                                                   │               │
│         ▼                                                   │               │
│  ┌─────────────┐                                           │               │
│  │ Middlewares │                                           │               │
│  │ Auth/Valid  │                                           │               │
│  └─────────────┘                                           │               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                              Prisma ORM
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BANCO DE DADOS (MySQL)                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │  Users  │ │  Apps   │ │Payments │ │Projects │ │Crafters │  ...          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Fluxo de Navegacao entre Paginas

```
                                    ┌──────────┐
                                    │   HOME   │
                                    │    /     │
                                    └────┬─────┘
                                         │
        ┌────────────┬───────────┬───────┴───────┬────────────┬────────────┐
        ▼            ▼           ▼               ▼            ▼            ▼
   ┌─────────┐ ┌──────────┐ ┌─────────┐   ┌──────────┐ ┌─────────┐ ┌────────┐
   │Desafios │ │ Projetos │ │Mentoria │   │ Ranking  │ │Feedbacks│ │  Apps  │
   │/desafios│ │/projetos │ │/mentoria│   │ /ranking │ │/feedbacks│/aplicativos
   └─────────┘ └──────────┘ └─────────┘   └──────────┘ └─────────┘ └───┬────┘
                                                                       │
                                                                       ▼
                                                               ┌──────────────┐
                                                               │ Compra App   │
                                                               │/apps/:id/compra
                                                               └──────┬───────┘
                                                                      │
                                          ┌───────────────────────────┼───────┐
                                          ▼                           ▼       │
                                   ┌─────────────┐             ┌──────────┐   │
                                   │   Login     │             │ Sucesso  │   │
                                   │  /login     │             │/apps/:id/│   │
                                   └──────┬──────┘             │ sucesso  │   │
                                          │                    └──────────┘   │
                              ┌───────────┼───────────┐                       │
                              ▼           ▼           ▼                       │
                       ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
                       │ Registro │ │ Esqueci  │ │  Admin   │                 │
                       │/register │ │  Senha   │ │ /admin/* │                 │
                       └──────────┘ └──────────┘ └──────────┘                 │
                                                                              │
                                                                              ▼
                                                                    ┌──────────────┐
                                                                    │ Minha Conta  │
                                                                    │/minha-conta  │
                                                                    └──────────────┘
```

### Paginas Publicas
| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/` | HomePage | Pagina inicial |
| `/desafios` | DesafiosPage | Lista de desafios |
| `/projetos` | ProjectsPage | Lista de projetos |
| `/mentoria` | MentoriaPage | Informacoes de mentoria |
| `/ranking` | RankingPage | Ranking de crafters |
| `/feedbacks` | FeedbacksPage | Feedbacks da plataforma |
| `/aplicativos` | AppHubPage | Marketplace de apps |
| `/apps/:id/compra` | AppPurchasePage | Pagina de compra |

### Paginas de Autenticacao
| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/login` | LoginPage | Login de usuario |
| `/register` | RegisterPage | Criar conta |
| `/forgot-password` | ForgotPasswordPage | Recuperar senha |
| `/reset-password` | PasswordResetPage | Redefinir senha |

### Paginas Protegidas
| Rota | Pagina | Acesso |
|------|--------|--------|
| `/minha-conta` | MyAccountPage | Usuario logado |
| `/admin/*` | AdminLayout | Admin/Editor |

---

## 3. Consumo de Dados no Frontend

### Camada de Servicos (API)

O frontend usa uma funcao centralizada para todas as requisicoes:

```
┌─────────────────────────────────────────────────────────────────┐
│                     apiRequest()                                 │
│  - Adiciona headers (Authorization, Content-Type)               │
│  - Envia requisicao para o backend                              │
│  - Trata erros e retorna dados                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │  userAPI    │    │ projectsAPI │    │  appsAPI    │
    │ - login     │    │ - getAll    │    │ - getApps   │
    │ - register  │    │ - create    │    │ - purchase  │
    │ - logout    │    │ - update    │    │ - upload    │
    └─────────────┘    └─────────────┘    └─────────────┘
```

### Contexto de Autenticacao

```
┌─────────────────────────────────────────────────────────────────┐
│                     AuthContext                                  │
│                                                                  │
│  Estado:                                                         │
│  - user (dados do usuario)                                       │
│  - isAuthenticated (boolean)                                     │
│  - loading (boolean)                                             │
│                                                                  │
│  Funcoes:                                                        │
│  - login(email, senha) → salva token no localStorage             │
│  - logout() → remove token                                       │
│  - hasRole(['admin']) → verifica permissao                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  localStorage: cc_session = { token: "jwt..." }                  │
│  sessionStorage: cc_user_cache = { id, name, email, role }       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Processamento no Backend

### Arquitetura em Camadas

```
Requisicao HTTP
       │
       ▼
┌─────────────────┐
│     ROUTES      │  Define os endpoints (URLs)
│  /api/projetos  │  Aplica middlewares
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   MIDDLEWARES   │  - authenticate: valida JWT
│                 │  - authorizeAdmin: verifica role
│                 │  - validate: valida dados (Zod)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CONTROLLERS    │  Recebe req/res
│                 │  Extrai dados validados
│                 │  Chama service
│                 │  Retorna resposta HTTP
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   SERVICES      │  Contem a logica de negocio
│                 │  Valida regras
│                 │  Lanca erros (AppError)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  REPOSITORIES   │  Acessa o banco de dados
│                 │  Usa Prisma ORM
│                 │  CRUD operations
└────────┬────────┘
         │
         ▼
    Banco MySQL
```

### Endpoints Principais

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Registro |
| GET | `/api/auth/me` | Dados do usuario logado |
| GET | `/api/projetos` | Listar projetos |
| POST | `/api/projetos` | Criar projeto (admin) |
| GET | `/api/apps` | Listar apps |
| POST | `/api/payments/preference` | Criar pagamento |
| GET | `/api/licenses/user` | Licencas do usuario |

---

## 5. Comunicacao com o Banco de Dados

### Prisma ORM

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Repository    │────▶│   Prisma Client │────▶│     MySQL       │
│                 │     │                 │     │                 │
│ prisma.user.    │     │  Query Builder  │     │  Tabelas:       │
│ findUnique()    │     │  SQL Generator  │     │  - users        │
│                 │     │                 │     │  - apps         │
└─────────────────┘     └─────────────────┘     │  - payments     │
                                                │  - projects     │
                                                │  - crafters     │
                                                │  - ...          │
                                                └─────────────────┘
```

### Principais Tabelas

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIOS                                 │
│  users: id, email, name, passwordHash, role, status, isGuest    │
│  password_resets: id, userId, tokenHash, expiresAt              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MARKETPLACE                                 │
│  apps: id, name, price, creatorId, executableUrl, status        │
│  app_payments: id, appId, userId, status, amount, payerEmail    │
│  user_licenses: id, appId, userId, email, licenseKey            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PROJETOS                                   │
│  projetos: id, nome, descricao, preco, status, mentorId         │
│  mentores: id, nome, email, especialidade                        │
│  inscricoes: id, nome, email, projetoId, status                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       GAMIFICACAO                                │
│  crafters: id, nome, pontos, equipeId, userId                   │
│  equipes: id, nome, descricao                                    │
│  desafios: id, name, basePoints, deadline, status               │
│  challenge_submissions: id, desafioId, userId, status, score    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Retorno de Respostas

### Formato Padrao

**Sucesso:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Erro:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Recurso nao encontrado"
  }
}
```

### Codigos de Status HTTP

| Codigo | Significado | Quando usar |
|--------|-------------|-------------|
| 200 | OK | Requisicao bem sucedida |
| 201 | Created | Recurso criado |
| 400 | Bad Request | Dados invalidos |
| 401 | Unauthorized | Token invalido/ausente |
| 403 | Forbidden | Sem permissao |
| 404 | Not Found | Recurso nao existe |
| 500 | Server Error | Erro interno |

---

## 7. Fluxos Detalhados

### 7.1 Fluxo de Login

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Usuario  │    │ Frontend │    │ Backend  │    │ Service  │    │ Database │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │
     │ email/senha   │               │               │               │
     │──────────────▶│               │               │               │
     │               │               │               │               │
     │               │ POST /login   │               │               │
     │               │──────────────▶│               │               │
     │               │               │               │               │
     │               │               │ login()       │               │
     │               │               │──────────────▶│               │
     │               │               │               │               │
     │               │               │               │ findUser      │
     │               │               │               │──────────────▶│
     │               │               │               │               │
     │               │               │               │    user       │
     │               │               │               │◀──────────────│
     │               │               │               │               │
     │               │               │  token+user   │               │
     │               │               │◀──────────────│               │
     │               │               │               │               │
     │               │ {token, user} │               │               │
     │               │◀──────────────│               │               │
     │               │               │               │               │
     │               │ salva token   │               │               │
     │               │ localStorage  │               │               │
     │               │               │               │               │
     │  Logado!      │               │               │               │
     │◀──────────────│               │               │               │
     │               │               │               │               │
```

### 7.2 Fluxo de Compra de App

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Usuario  │    │ Frontend │    │ Backend  │    │ Mercado  │    │ Database │
│          │    │          │    │          │    │  Pago    │    │          │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │
     │ Clica Comprar │               │               │               │
     │──────────────▶│               │               │               │
     │               │               │               │               │
     │               │ POST /payment │               │               │
     │               │──────────────▶│               │               │
     │               │               │               │               │
     │               │               │ cria preference               │
     │               │               │──────────────▶│               │
     │               │               │               │               │
     │               │               │  preferenceId │               │
     │               │               │◀──────────────│               │
     │               │               │               │               │
     │               │               │ salva payment │               │
     │               │               │──────────────────────────────▶│
     │               │               │               │               │
     │               │ redirectUrl   │               │               │
     │               │◀──────────────│               │               │
     │               │               │               │               │
     │ Redireciona   │               │               │               │
     │ Mercado Pago  │               │               │               │
     │──────────────────────────────────────────────▶│               │
     │               │               │               │               │
     │ Paga          │               │               │               │
     │──────────────────────────────────────────────▶│               │
     │               │               │               │               │
     │               │               │  webhook      │               │
     │               │               │◀──────────────│               │
     │               │               │               │               │
     │               │               │ atualiza status               │
     │               │               │──────────────────────────────▶│
     │               │               │               │               │
     │               │               │ cria licenca  │               │
     │               │               │──────────────────────────────▶│
     │               │               │               │               │
     │ Retorna       │               │               │               │
     │◀──────────────────────────────│               │               │
     │               │               │               │               │
     │ Pagina Sucesso│               │               │               │
     │◀──────────────│               │               │               │
```

---

## 8. Resumo

| Camada | Tecnologia | Responsabilidade |
|--------|------------|------------------|
| **Frontend** | React + Vite | Interface do usuario, navegacao, estado |
| **Services** | fetch API | Comunicacao HTTP com backend |
| **Backend** | Express + TS | Rotas, validacao, logica de negocio |
| **ORM** | Prisma | Mapeamento objeto-relacional |
| **Database** | MySQL | Persistencia de dados |
| **Pagamentos** | Mercado Pago | Processamento de pagamentos |

### Principios do Sistema

1. **Separacao de Responsabilidades**: Cada camada tem funcao especifica
2. **Autenticacao JWT**: Token para identificar usuarios
3. **Validacao em Camadas**: Frontend (UX) + Backend (seguranca)
4. **Respostas Padronizadas**: Formato consistente para sucesso/erro
5. **Cache**: Otimizacao de performance no frontend
