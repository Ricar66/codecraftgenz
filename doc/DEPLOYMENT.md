# Deploy e Configuracao

## Infraestrutura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │     │    Backend        │     │   Banco MySQL   │
│   (Render)      │────►│   (Render)        │────►│  (Hostinger)    │
│   Port: 443     │     │   Port: 8080      │     │  Port: 3306     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
              Mercado Pago   Email     FTP
              (Pagamentos)  (SMTP)   (Arquivos)
```

## Frontend - Deploy

### Build

```bash
npm run build
# Equivalente: vite build
# Output: dist/
```

### Ambiente: Render.com (Static Site)

Configuracao no Render:
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Rewrite Rules:** `/* -> /index.html` (SPA fallback)

### Variaveis de Ambiente (Frontend)

```env
# Obrigatorias
VITE_API_URL=https://codecraftgenz-monorepo.onrender.com
VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Opcionais
VITE_ALLOW_EXTERNAL_API=true
VITE_ENABLE_PWA=true
VITE_CACHE_MAX_AGE=86400
VITE_DEBUG=false
VITE_APP_ENV=production
VITE_ENABLE_CARD_PAYMENT_UI=false
VITE_ADMIN_PUBLIC_FALLBACK=off
VITE_LEADS_API_URL=https://app.trackpro.com.br/api/v1/public/leads/webhook
VITE_LEADS_API_KEY=tp_xxxxxxxxxxxxx
```

**Importante:** Todas as variaveis com prefixo `VITE_` sao publicas (expostas no bundle JS).

---

## Backend - Deploy

### Build

```bash
npm run render:build
# Equivalente: git lfs install && prisma generate && tsc
# Output: dist/
```

### Start

```bash
npm run render:start
# Equivalente: prisma migrate deploy && node dist/server.js
```

### Ambiente: Render.com (Web Service)

Configuracao no Render:
- **Build Command:** `npm install && npm run render:build`
- **Start Command:** `npm run render:start`
- **Environment:** Node 20
- **Persistent Disk:** Montado em `/var/downloads` (para executaveis)

### Variaveis de Ambiente (Backend)

```env
# === Obrigatorias ===
NODE_ENV=production
PORT=8080
DATABASE_URL=mysql://user:pass@host:3306/database
JWT_SECRET=chave-secreta-minimo-32-caracteres

# === CORS ===
CORS_ORIGIN=https://codecraftgenz.com.br
ALLOWED_ORIGINS=https://codecraftgenz.com.br,https://codecraft-frontend.onrender.com
FRONTEND_URL=https://codecraftgenz.com.br

# === Cookie ===
COOKIE_DOMAIN=.codecraftgenz.com.br

# === JWT ===
JWT_EXPIRES_IN=7d

# === Mercado Pago ===
MP_ENV=production
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxx
MP_PUBLIC_KEY=APP_USR-xxxxxxxxxxxx
MP_WEBHOOK_SECRET=xxxxxxxxxxxx
MP_WEBHOOK_URL=https://codecraftgenz-monorepo.onrender.com/api/payments/webhook

# === Email (Gmail ou Hostinger) ===
EMAIL_USER=email@codecraftgenz.com.br
EMAIL_PASS=senha-do-email

# === FTP (Hostinger) ===
FTP_HOST=ftp.codecraftgenz.com.br
FTP_USER=ftp_user
FTP_PASSWORD=ftp_pass
FTP_PORT=21

# === Downloads ===
DOWNLOADS_DIR=/var/downloads

# === NFS-e (opcional) ===
NFSE_CNPJ=12345678000100
NFSE_INSCRICAO_MUNICIPAL=12345
NFSE_RAZAO_SOCIAL=CodeCraft Gen-Z Ltda
NFSE_REGIME_TRIBUTARIO=1
NFSE_CERT_PATH=/path/to/cert.pfx
NFSE_CERT_PASSWORD=senha
NFSE_WSDL_URL=https://nfse.prefeitura.gov.br/...
NFSE_AMBIENTE=1
```

---

## Banco de Dados

### Hostinger MySQL

- Gerenciado via **phpMyAdmin** no painel Hostinger
- Acesso externo habilitado (IP do Render permitido)
- Backups manuais recomendados periodicamente

### Migracoes

```bash
# Desenvolvimento: criar nova migracao
npx prisma migrate dev --name descricao_da_mudanca

# Producao: aplicar migracoes pendentes
npx prisma migrate deploy

# Gerar Prisma Client (apos alterar schema)
npx prisma generate

# GUI do banco
npx prisma studio
```

### Alteracoes Manuais (SQL)

Quando necessario executar SQL direto no phpMyAdmin:

```sql
-- Exemplo: adicionar coluna
ALTER TABLE mentores ADD COLUMN telefone VARCHAR(20) NULL AFTER email;

-- Exemplo: adicionar indice
CREATE INDEX idx_payments_email ON payments(email);
```

**Sempre:** Alterar o `schema.prisma` tambem e rodar `prisma generate`.

---

## Desenvolvimento Local

### Requisitos

- Node.js >= 18 (frontend) / >= 20 (backend)
- MySQL local ou acesso ao Hostinger
- npm

### Setup Frontend

```bash
cd codecraft-frontend
npm install
cp .env.example .env    # Ajustar variaveis
npm run dev              # http://localhost:5173
```

### Setup Backend

```bash
cd codecraftgenz-monorepo/backend
npm install
cp .env.example .env    # Ajustar DATABASE_URL e JWT_SECRET
npx prisma generate      # Gerar client
npx prisma migrate dev   # Aplicar migracoes
npm run dev              # http://localhost:8080
```

### Proxy de Desenvolvimento

O Vite proxeia `/api/*` e `/downloads/*` para `localhost:8080` automaticamente:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true },
    '/downloads': { target: 'http://localhost:8080', changeOrigin: true },
  }
}
```

---

## Scripts Uteis

### Frontend

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Dev server com HMR |
| `npm run build` | Build de producao |
| `npm run preview` | Preview do build |
| `npm run lint` | ESLint |
| `npm run test` | Testes Vitest |
| `npm run test:coverage` | Coverage report |

### Backend

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Dev server com hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm run start` | Iniciar em producao |
| `npm run db:generate` | Gerar Prisma Client |
| `npm run db:migrate` | Criar migracao (dev) |
| `npm run db:migrate:deploy` | Aplicar migracoes (prod) |
| `npm run db:seed` | Popular banco |
| `npm run db:studio` | GUI do banco |
| `npm run db:reset` | Resetar banco (CUIDADO!) |

---

## Checklist de Deploy

### Antes do Deploy

- [ ] Build local sem erros (`npm run build`)
- [ ] Testes passando (`npm run test`)
- [ ] Variaveis de ambiente configuradas no Render
- [ ] Schema do banco atualizado (`prisma migrate deploy`)
- [ ] CORS configurado com dominio correto

### Apos o Deploy

- [ ] Health check: `GET /health` retorna 200
- [ ] Login funciona
- [ ] Dashboard carrega dados
- [ ] Pagamento de teste (sandbox) funciona
- [ ] Webhook do MP configurado e ativo
- [ ] Downloads de apps funcionam
- [ ] Email de confirmacao envia corretamente

---

## Dominio e DNS

| Servico | Dominio | Provedor |
|---------|---------|----------|
| Frontend | codecraftgenz.com.br | Render (CNAME) |
| Backend | codecraftgenz-monorepo.onrender.com | Render |
| Email | @codecraftgenz.com.br | Hostinger |
| Banco | *.hostinger.com | Hostinger |
