# Backend - Documentacao Tecnica

## Estrutura de Pastas

```
backend/
├── prisma/
│   ├── schema.prisma          # Definicao do banco de dados
│   ├── migrations/            # Migracoes SQL
│   └── seed.ts                # Dados iniciais
│
├── src/
│   ├── config/
│   │   └── env.ts             # Variaveis de ambiente (Zod)
│   │
│   ├── db/
│   │   └── prisma.ts          # Instancia do Prisma Client
│   │
│   ├── controllers/           # Handlers HTTP (15 arquivos)
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── app.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── license.controller.ts
│   │   ├── challenge.controller.ts
│   │   ├── crafter.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── feedback.controller.ts
│   │   ├── finance.controller.ts
│   │   ├── inscricao.controller.ts
│   │   ├── mentor.controller.ts
│   │   ├── nfse.controller.ts
│   │   ├── project.controller.ts
│   │   └── proposal.controller.ts
│   │
│   ├── services/              # Logica de negocio (21 arquivos)
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── app.service.ts
│   │   ├── payment.service.ts
│   │   ├── license.service.ts
│   │   ├── email.service.ts
│   │   ├── ftp.service.ts
│   │   ├── hub.service.ts
│   │   ├── challenge.service.ts
│   │   ├── crafter.service.ts
│   │   ├── mentor.service.ts
│   │   ├── team.service.ts
│   │   ├── project.service.ts
│   │   ├── inscricao.service.ts
│   │   ├── finance.service.ts
│   │   ├── nfse.service.ts
│   │   ├── nfse-xml.service.ts
│   │   ├── nfse-soap.service.ts
│   │   ├── audit.service.ts      # Audit log (fire-and-forget)
│   │   ├── lead.service.ts       # Leads engine
│   │   └── ideia.service.ts      # Ideas/voting system
│   │
│   ├── repositories/          # Acesso a dados (4 arquivos)
│   │   ├── app.repository.ts
│   │   ├── payment.repository.ts
│   │   ├── license.repository.ts
│   │   └── project.repository.ts
│   │
│   ├── routes/                # Definicao de rotas (27 arquivos)
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── app.routes.ts
│   │   ├── payment.routes.ts
│   │   ├── license.routes.ts
│   │   ├── challenge.routes.ts
│   │   ├── crafter.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── feedback.routes.ts
│   │   ├── finance.routes.ts
│   │   ├── inscricao.routes.ts
│   │   ├── mentor.routes.ts
│   │   ├── nfse.routes.ts
│   │   ├── project.routes.ts
│   │   ├── proposal.routes.ts
│   │   ├── team.routes.ts
│   │   ├── config.routes.ts
│   │   ├── download.routes.ts
│   │   ├── upload.routes.ts
│   │   ├── hub.routes.ts
│   │   ├── health.routes.ts
│   │   ├── integration.routes.ts
│   │   ├── leads.ts              # Leads dashboard + CRUD
│   │   ├── ideias.ts             # Ideas/voting system
│   │   └── test.routes.ts
│   │
│   ├── schemas/               # Validacao Zod (14 arquivos)
│   │   ├── auth.schema.ts
│   │   ├── app.schema.ts
│   │   ├── payment.schema.ts
│   │   ├── license.schema.ts
│   │   ├── challenge.schema.ts
│   │   ├── crafter.schema.ts
│   │   ├── mentor.schema.ts
│   │   ├── project.schema.ts
│   │   ├── team.schema.ts
│   │   ├── inscricao.schema.ts
│   │   ├── finance.schema.ts
│   │   ├── nfse.schema.ts
│   │   └── lead.schema.ts       # Leads validation
│   │
│   ├── middlewares/
│   │   ├── auth.ts            # Autenticacao JWT
│   │   ├── validate.ts        # Validacao Zod
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   ├── cache.ts           # Cache-Control headers
│   │   ├── audit.ts           # Audit log (POST/PUT/PATCH/DELETE)
│   │   └── errorHandler.ts    # Tratamento de erros
│   │
│   ├── utils/
│   │   ├── logger.ts          # Pino logger
│   │   ├── AppError.ts        # Classe de erro customizada
│   │   └── response.ts        # Helpers de resposta
│   │
│   ├── app.ts                 # Configuracao Express
│   └── server.ts              # Entry point
│
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

## Padrao de Arquitetura

### Fluxo de uma Request

```
Client Request
    │
    ├─► Middleware Stack
    │   ├── helmet()           → Headers de seguranca
    │   ├── cors()             → Controle de origem
    │   ├── compression()      → gzip
    │   ├── express.json()     → Parse body (10MB limit)
    │   ├── cookieParser()     → Parse cookies
    │   ├── rateLimiter()      → Controle de taxa
    │   └── requestLogger()    → Log da request
    │
    ├─► Router
    │   └── validate(schema)   → Validacao Zod
    │       └── authenticate() → Verifica JWT
    │           └── authorize(['admin']) → Verifica role
    │
    ├─► Controller
    │   └── Extrai req.validated
    │       └── Chama service
    │
    ├─► Service
    │   └── Logica de negocio
    │       └── Chama repository
    │
    ├─► Repository
    │   └── Query Prisma → MySQL
    │
    └─► Response
        └── success(data) ou sendError(res, ...)
```

### Padrao de Controller

```typescript
export const getAll = async (req: Request, res: Response) => {
  try {
    const items = await service.getAll();
    res.json(success(items));
  } catch (err) {
    // errorHandler middleware captura
    throw err;
  }
};
```

### Padrao de Service

```typescript
export const myService = {
  async getAll() {
    return prisma.model.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async getById(id: number) {
    const item = await prisma.model.findUnique({ where: { id } });
    if (!item) throw AppError.notFound('Item');
    return item;
  },

  async create(data: CreateInput) {
    return prisma.model.create({ data });
  },
};
```

### Padrao de Repository

```typescript
// Usado quando a query e complexa ou reutilizada
export const myRepository = {
  async findAll(filters?: { status?: string }) {
    return prisma.model.findMany({
      where: filters?.status ? { status: filters.status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  },
};
```

## Middleware Stack

### Rate Limiting

| Limiter | Requests | Janela | Aplicacao |
|---------|----------|--------|-----------|
| defaultLimiter | 100 | 15 min | Todas as rotas |
| authLimiter | 10 | 15 min | Login, registro |
| sensitiveLimiter | 5 | 1 hora | Reset senha, pagamento, licenca |
| apiLimiter | 1000 | 15 min | API geral |

### Validacao (Zod)

Middleware `validate()` processa `body`, `query` e `params`:

```typescript
// Na rota
router.post('/', validate(createSchema), controller.create);

// Schema Zod
export const createSchema = z.object({
  body: z.object({
    nome: z.string().min(1).max(128),
    email: z.string().email().optional(),
  }),
});
```

Dados validados ficam em `req.validated`:

```typescript
// No controller
const { nome, email } = req.validated.body;
```

### Tratamento de Erros

```typescript
// AppError customizado
throw AppError.notFound('Mentor');      // 404
throw AppError.badRequest('Invalido');  // 400
throw AppError.unauthorized();          // 401
throw AppError.forbidden();             // 403

// Erros Zod -> 400 com detalhes de validacao
// Erros JWT -> 401 (token invalido/expirado)
// Erros Prisma -> 404 (not found) ou 409 (duplicata)
// Erros genericos -> 500 (detalhes ocultados em prod)
```

## Formato de Resposta Padrao

### Sucesso

```json
{
  "success": true,
  "data": { ... },
  "status": 200
}
```

### Sucesso Paginado

```json
{
  "success": true,
  "data": {
    "items": [...],
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "status": 200
}
```

### Erro

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Mentor nao encontrado",
    "details": null
  },
  "status": 404
}
```

## Scripts do Package.json

| Script | Comando | Uso |
|--------|---------|-----|
| `dev` | `tsx watch src/server.ts` | Desenvolvimento com hot-reload |
| `build` | `tsc + prisma generate` | Build de producao |
| `start` | `node dist/server.js` | Iniciar em producao |
| `render:build` | `git-lfs + generate + build` | Build no Render |
| `render:start` | `migrate deploy + start` | Start no Render |
| `db:generate` | `prisma generate` | Gerar Prisma Client |
| `db:migrate` | `prisma migrate dev` | Criar migracao (dev) |
| `db:migrate:deploy` | `prisma migrate deploy` | Aplicar migracoes (prod) |
| `db:seed` | `tsx prisma/seed.ts` | Popular banco |
| `db:studio` | `prisma studio` | GUI do banco |

## Logging

Logger Pino com formatacao pretty em dev:

```typescript
import { logger } from './utils/logger';

logger.info('Servidor iniciado na porta 8080');
logger.error({ err, context }, 'Falha ao processar pagamento');
logger.warn('Token proximo de expirar');
```

Formato em producao: JSON estruturado para observabilidade.
