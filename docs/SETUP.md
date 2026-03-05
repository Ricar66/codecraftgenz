# Configuracao e Migracao do Ambiente

Este guia cobre como configurar o projeto CodeCraft Gen-Z em uma nova maquina.

## Pre-requisitos

- **Node.js**: >= 18 (frontend) / >= 20 (backend)
- **Git**: Para clonar os repositorios
- **MySQL**: Acesso ao banco (Hostinger em producao, local em dev)
- **npm**: Gerenciador de pacotes

## Repositorios

| Repo | Descricao |
|------|-----------|
| `codecraft-frontend` | SPA React 19 + Vite - interface do usuario e painel admin |
| `codecraftgenz-monorepo/backend` | API REST Express + TypeScript |

## Passo a Passo

### 1. Clonar os Repositorios

```bash
# Frontend
git clone https://github.com/Ricar66/codecraft-frontend.git

# Backend (monorepo)
git clone https://github.com/Ricar66/codecraftgenz-monorepo.git
```

### 2. Instalar Dependencias

```bash
# Frontend
cd codecraft-frontend && npm install

# Backend
cd codecraftgenz-monorepo/backend && npm install
```

### 3. Configurar Variaveis de Ambiente

Os arquivos `.env` nao sao versionados. Crie manualmente:

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:8080
VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxxxxxxx
VITE_ALLOW_EXTERNAL_API=true
VITE_ENABLE_PWA=true
VITE_APP_ENV=development
VITE_ENABLE_CARD_PAYMENT_UI=false
```

#### Backend (.env)

```env
NODE_ENV=development
PORT=8080
DATABASE_URL=mysql://usuario:senha@localhost:3306/codecraft_db
JWT_SECRET=chave-secreta-minimo-32-caracteres
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
MP_ENV=sandbox
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxx
MP_PUBLIC_KEY=APP_USR-xxxxxxxxxxxx
EMAIL_USER=email@codecraft.com
EMAIL_PASS=senha-do-email
```

### 4. Configurar Banco de Dados

```bash
cd codecraftgenz-monorepo/backend
npx prisma generate        # Gerar Prisma Client
npx prisma migrate dev     # Criar tabelas
npx prisma db seed         # Dados iniciais (opcional)
```

### 5. Executar o Projeto

```bash
# Terminal 1 - Frontend
cd codecraft-frontend
npm run dev                # http://localhost:5173

# Terminal 2 - Backend
cd codecraftgenz-monorepo/backend
npm run dev                # http://localhost:8080
```

O Vite proxeia automaticamente `/api/*` e `/downloads/*` para `localhost:8080`.

## Producao

| Servico | Provedor | URL |
|---------|----------|-----|
| Frontend | Hostinger (SFTP) | codecraftgenz.com.br |
| Backend | Render.com | codecraftgenz-monorepo.onrender.com |
| Banco MySQL | Hostinger | srv1889.hstgr.io:3306 |
| Email | Hostinger | @codecraftgenz.com.br |

### Deploy Frontend

```bash
python deploy.py                          # Build + git + SFTP
python deploy.py --skip-build --skip-git  # Apenas SFTP
```

### Deploy Backend

```bash
git push origin main    # Render auto-deploy
```

## Solucao de Problemas

- **Erro de conexao com banco:** Verifique `DATABASE_URL` e IP liberado no firewall MySQL
- **Erro de dependencias:** Delete `node_modules` e rode `npm install`
- **Prisma Client desatualizado:** Rode `npx prisma generate` apos alterar schema
- **CORS bloqueado:** Verifique `ALLOWED_ORIGINS` no `.env` do backend
- **Build falha:** Verifique se `VITE_API_URL` esta configurado no `.env` frontend
