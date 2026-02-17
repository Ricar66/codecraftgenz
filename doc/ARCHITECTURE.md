# Arquitetura do Sistema

## Diagrama de Alto Nivel

```
                        +-----------------------+
                        |      USUARIO          |
                        |   (Browser / PWA)     |
                        +-----------+-----------+
                                    |
                                    | HTTPS
                                    v
                        +-----------+-----------+
                        |      FRONTEND         |
                        |   React 19 + Vite 5   |
                        |   (SPA - Port 5173)   |
                        +-----------+-----------+
                                    |
                                    | /api/*
                                    v
                        +-----------+-----------+
                        |      BACKEND          |
                        |  Express + TypeScript  |
                        |   (API - Port 8080)   |
                        +-----------+-----------+
                           /    |    \      \
                          /     |     \      \
                         v      v      v      v
                      MySQL   MP    Email   FTP
                    (Prisma) (Pagto) (SMTP) (Arquivos)
```

## Camadas da Aplicacao

### Frontend (codecraft-frontend)

```
Browser
  -> React Router (rotas)
    -> Pages (paginas lazy-loaded)
      -> Components (UI reutilizavel)
        -> Hooks (logica compartilhada)
          -> Services (chamadas API)
            -> lib/apiConfig.js (fetch centralizado)
```

### Backend (codecraftgenz-monorepo/backend)

```
HTTP Request
  -> Express Middleware (helmet, cors, rate-limit, auth)
    -> Routes (definicao de rotas)
      -> Validate Middleware (Zod schemas)
        -> Controllers (handlers HTTP)
          -> Services (logica de negocio)
            -> Repositories (acesso a dados)
              -> Prisma Client (ORM)
                -> MySQL Database
```

## Fluxo de Dados

### Request/Response Pattern

1. **Cliente** faz request HTTP (com JWT no header `Authorization: Bearer <token>`)
2. **Middleware** processa: CORS, rate-limit, autenticacao, validacao
3. **Controller** extrai dados validados de `req.validated`
4. **Service** executa logica de negocio
5. **Repository** faz queries no banco via Prisma
6. **Response** retorna JSON padronizado:

```json
{
  "success": true,
  "data": { ... },
  "status": 200
}
```

Ou em caso de erro:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Recurso nao encontrado"
  },
  "status": 404
}
```

## Tecnologias Principais

### Frontend

| Tecnologia | Versao | Uso |
|------------|--------|-----|
| React | 19.1.1 | Biblioteca UI |
| React Router | 7.9.4 | Roteamento SPA |
| Vite | 5.4.0 | Build tool + dev server |
| Recharts | 3.7.0 | Graficos no dashboard |
| Framer Motion | 12.23.24 | Animacoes |
| Mercado Pago SDK React | 1.0.6 | Payment Brick |
| Zod | 4.1.13 | Validacao de formularios |
| react-helmet-async | 2.0.5 | SEO (meta tags) |
| react-icons | 5.5.0 | Icones |
| Tailwind CSS | 4.1.15 | Classes utilitarias |
| Vitest | 4.0.3 | Testes unitarios |

### Backend

| Tecnologia | Versao | Uso |
|------------|--------|-----|
| Express | 4.21.1 | Framework HTTP |
| TypeScript | - | Tipagem |
| Prisma | 5.22.0 | ORM (MySQL) |
| Zod | 3.23.8 | Validacao de schemas |
| jsonwebtoken | 9.0.2 | Autenticacao JWT |
| bcrypt | 5.1.1 | Hash de senhas |
| mercadopago | 2.10.0 | Pagamentos |
| nodemailer | 6.9.16 | Envio de emails |
| multer | 2.0.2 | Upload de arquivos |
| helmet | 8.1.0 | Headers de seguranca |
| express-rate-limit | 7.4.1 | Rate limiting |
| pino | 9.5.0 | Logging estruturado |
| xml2js / xml-crypto / soap | - | NFS-e (nota fiscal) |
| basic-ftp | 5.1.0 | Upload FTP |

## Seguranca

| Camada | Medida |
|--------|--------|
| Transporte | HTTPS em producao |
| Headers | Helmet (CSP, HSTS, X-Frame-Options) |
| CORS | Origens permitidas configuradas |
| Rate Limit | Global 100/15min, Auth 10/15min, Sensitive 5/h |
| Auth | JWT com httpOnly cookies |
| Senhas | bcrypt com 10 salt rounds |
| Validacao | Zod em todas as entradas |
| RBAC | Roles: admin, editor, user, viewer |
| API | Token Bearer no header Authorization |

## PWA (Progressive Web App)

O frontend e uma PWA com Service Worker:

| Recurso | Estrategia de Cache |
|---------|---------------------|
| `/api/*` | Network Only (sempre busca do servidor) |
| `/downloads/*` | Network Only |
| Paginas HTML | Network First (24h cache) |
| Imagens | Stale While Revalidate (7 dias) |
| Assets JS/CSS | Cache First (hash no nome) |

## Ambientes

| Ambiente | Frontend | Backend |
|----------|----------|---------|
| Desenvolvimento | localhost:5173 | localhost:8080 |
| Producao | codecraftgenz.com.br | codecraftgenz-monorepo.onrender.com |
